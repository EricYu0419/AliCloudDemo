const Router = require("koa-router");
const router = new Router();
const cfg = require("../../config").alicould;
const ALY = require("aliyun-sdk");
const apis = require("aliyun-sdk/apis/ecs-2014-05-26.json");

const ecs = new ALY.ECS({
  accessKeyId: cfg.accessKeyId,
  secretAccessKey: cfg.accessKeySecret,
  endpoint: "https://ecs.aliyuncs.com",
  apiVersion: "2014-05-26"
});

function ToPromise(name,params){
  return new Promise(function (resolve,reject){
    // console.info(name,params,ecs[name]);
    ecs[name](params,function (err,res){
      // console.info(err,res);
      if (err) reject(err);
      resolve(res);
    });
  });
}

router
  .get("/", async (ctx, next) => {
    await next();
    ctx.body = apis;
  })
  .get("/describe/regions", async (ctx,next) => {
    await ToPromise("describeRegions",{}).then(res=>{
      // console.info(res);
      ctx.body = res;
      next();
    });
  })
  .get("/describe/instances/:RegionId", async (ctx,next)=>{
    await ToPromise("describeInstances",ctx.params).then(res=>{
      ctx.body = res;
      next();
    })
  });


module.exports = router;
