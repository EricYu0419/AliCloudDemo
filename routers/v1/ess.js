const Router = require("koa-router");
const router = new Router();
const cfg = require("../../config").alicould;
const ALY = require("aliyun-sdk");
const apis = require("aliyun-sdk/apis/ecs-2014-05-26.json");

const ess = new ALY.ESS({
  accessKeyId: cfg.accessKeyId,
  secretAccessKey: cfg.accessKeySecret,
  endpoint: "https://ess.aliyuncs.com",
  apiVersion: "2014-08-28"
});

function ToPromise(name,params){
  return new Promise(function (resolve,reject){
    // console.info(name,params,ecs[name]);
    ess[name](params,function (err,res){
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
  .get("/describe/scalinggroups/:RegionId",async (ctx,next)=>{
    await ToPromise("describeScalingGroups",ctx.params).then(res=>{
      // console.info(res);
      ctx.body = res;
      next();
    });
  })
  .get("/describe/scalingconfigurations/:RegionId", async (ctx,next) => {
    await ToPromise("describeScalingConfigurations",ctx.params).then(res=>{
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
