const Router = require("koa-router");
const cfg = require("../../config").alicloud;
const ALY = require("aliyun-sdk");
const router = new Router();
const db = require("../../db");
const jwt = require("jsonwebtoken");
const jwt_secret = require("../../config").jwt_secret;
const apis = require("fs").readdirSync(
  require("path").join(__dirname + "../../../node_modules/aliyun-sdk/apis")
);
const client = require("./client");

router
  .post("/auth", (ctx, next) => {
    const query = { username: ctx.request.body.email };
    const rememberme = ctx.request.body.rememberme;
    const password = ctx.request.body.pass;
    return db.Admin.findOne(query).then(res => {
      if (res) {
        return new Promise(function(resolve, reject) {
          res.comparePassword(password, function(err, isMatch) {
            if (isMatch) {
              let userInfo = { username: res.username, role: res.role };
              userInfo.token = jwt.sign(userInfo, jwt_secret, {
                expiresIn: "12h"
              });
              userInfo.expiresAt = new Date(
                new Date().getTime() + 86400 * 100 / 2
              ).toISOString();
              ctx.body = userInfo;
            } else {
              ctx.status = 401;
            }
            resolve();
            return next();
          });
        });
      } else {
        ctx.status = 401;
        return next();
      }
    });
  })
  .get("/apiList", async (ctx, next) => {
    // ctx.set('Content-Type','application/json');
    ctx.body = "apiList";
    await next();
  });

// console.info(cfg, apis);
cfg.apiList.forEach(element => {
  if (element) {
    let apiFileName = "";
    apis.forEach(fileName => {
      if (fileName.indexOf(element) === 0) apiFileName = fileName;
    });
    const apiJson = require(`aliyun-sdk/apis/${apiFileName}`);
    let apiVersion = apiFileName
      .replace(element + "-", "")
      .replace(".json", "");
    // console.info(apiFileName,apiVersion);
    const alyApi = new ALY[(element.toLocaleUpperCase())]({
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.accessKeySecret,
      endpoint: `https://${element}.aliyuncs.com`,
      apiVersion: apiVersion
    });
    const apiRouter = new Router();

    function ToPromise(ctxParams, ctxQuery) {
      return new Promise(function(resolve, reject) {
        let action = ctxParams.Action;
        let params = {};
        let tempP = ctxQuery || ctxParams;
        Object.keys(tempP).forEach(element => {
          if (element !== "Action") params[element] = tempP[element];
        });
        alyApi[action](params, function(err, res) {
          // console.info(err,res);
          if (err) reject(err);
          resolve(res);
        });
      });
    }

    apiRouter
      .get("/", async (ctx, next) => {
        await next();
        ctx.body = apiJson;
      })
      .get(
        "/:Action",
        async (ctx, next) => {
          await ToPromise(ctx.params, ctx.query).then(
            res => {
              // console.info(res);
              ctx.body = res;
               next();
            },
            error => {
              ctx.body = error;
              next();
            }
          );
        },
        async (ctx,next) => {
          if (
            ctx.params.Action.indexOf("Instance") > -1 &&
            ctx.params.Action.indexOf("describe") === -1
          ) {
            if (ctx.body.RequestId) {
              await ToPromise({Action:"describeInstances"},{InstanceId:ctx.params.InstanceId}).then(res=>{
                ctx.body = res.Instances.Instance[0]
                next() 
              });
            }
          }
        },
        async (ctx)=>{
          await db.Instance.findOne({InstanceId:ctx.body.InstanceId}).then(res=>{
            if (!res) {
              res = new db.Instance(ctx.body);
            }
            res.Status = ctx.body.Status;
            res.UpdateAt = new Date();
            
            await res.save().then(res=>{
              ctx.body = res;
            })
          })
        }
      )
      .get("/:Action/:RegionId", async (ctx, next) => {
        await ToPromise(ctx.params).then(
          res => {
            ctx.body = res;
            next();
          },
          error => {
            ctx.body = error;
            next();
          }
        );
      });

    router.use(`/${element}`, apiRouter.routes(), apiRouter.allowedMethods());
  }
});

router.use("/client", client.routes(), client.allowedMethods());

module.exports = router;
