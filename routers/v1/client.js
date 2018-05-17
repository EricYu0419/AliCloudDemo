const Router = require("koa-router");
const router = new Router();
const ALY = require("aliyun-sdk");
const cfg = require("../../config").alicloud;
const ecsApis = require("aliyun-sdk/apis/ecs-2014-05-26.json");
const EP = require("eventproxy");
const ecs = new ALY.ECS({
  accessKeyId: cfg.accessKeyId,
  secretAccessKey: cfg.accessKeySecret,
  endpoint: `https://ecs.aliyuncs.com`,
  apiVersion: "2014-05-26"
});
const db = require("../../db");

router.get(
  "/ecslist",
  async (ctx, next) => {
    // console.info(ctx.state.user); 当前用户
    return db.Region.find().then(res => {
      ctx.body = { Regions: res };
      return next();
    });
  },
  async ctx => {
    return db.Instance.find().then(res => {
      ctx.body.Instances = res;
    });
  },
  async ctx => {
    return db.InstanceType.find().then(res => {
      ctx.body.InstanceTypes = res;
    });
  }
);

module.exports = router;
