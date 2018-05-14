const Router = require("koa-router");
const router = new Router();
const ALY = request('aliyun-sdk');
const cfg = require("../../config").alicloud;
const ecsApis = require('aliyun-sdk/apis/ecs-2014-05-26.json');
const ecs = new ALY.ECS({
  accessKeyId: cfg.accessKeyId,
  secretAccessKey: cfg.accessKeySecret,
  endpoint: `https://ecs.aliyuncs.com`,
  apiVersion: '2014-05-26'
});

router.get("/ecsList", (ctx, next) => {
  console.info(ctx.user);
});

module.exports = router;
