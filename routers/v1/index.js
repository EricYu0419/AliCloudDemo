const Router = require("koa-router");
const cfg = require("../../config").alicloud;
const ALY = require("aliyun-sdk");
const router = new Router();
const apis = require("fs").readdirSync(
  require("path").join(__dirname + "../../../node_modules/aliyun-sdk/apis")
);
// const AcsClient = new AcsROAClient(cfg);

router
.post('/auth', async(ctx,next)=>{
  console.info(ctx);
  ctx.body={};
  await next();
})
.get("/apiList", async (ctx, next) => {
  // ctx.set('Content-Type','application/json');
  ctx.body = ALY;
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
      .get("/:Action", async (ctx, next) => {
        await ToPromise(ctx.params, ctx.query).then(res => {
          // console.info(res);
          ctx.body = res;
          next();
        });
      })
      .get("/:Action/:RegionId", async (ctx, next) => {
        await ToPromise(ctx.params).then(res => {
          ctx.body = res;
          next();
        });
      });

    router.use(`/${element}`, apiRouter.routes(), apiRouter.allowedMethods());
  }
});

module.exports = router;
