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

router
  .get(
    "/ecslist",
    async (ctx, next) => {
      // console.info(ctx.state.user); 当前用户
      return db.Region.find().then(res => {
        ctx.body = { Regions: res };
        return next();
      });
    },
    async (ctx, next) => {
      return db.Instance.find().then(res => {
        ctx.body.Instances = res;
        return next();
      });
    },
    async (ctx, next) => {
      return db.EipAddress.find().then(res => {
        ctx.body.EipAddresses = res;
        return next();
      });
    },
    async ctx => {
      return db.InstanceType.find().then(res => {
        ctx.body.InstanceTypes = res;
      });
    }
  )
  .get("/regionlist", async (ctx, next) => {
    return db.Region.find().then(res => {
      ctx.body = { Regions: res };
      return next();
    });
  })
  .get(
    "/essList",
    async (ctx, next) => {
      return db.ScalingGroup.find().then(res => {
        ctx.body = { ScalingGroups: res };
        return next();
      });
    },
    async (ctx, next) => {
      return db.ScalingConfiguration.find().then(res => {
        ctx.body.ScalingConfigurations = res;
        return next();
      });
    },
    async (ctx, next) => {
      return db.ScalingRule.find().then(res => {
        ctx.body.ScalingRules = res;
        return next();
      });
    },
    async (ctx, next) => {
      return db.ScalingActivity.find().then(res => {
        ctx.body.ScalingActivities = res;
        return next();
      });
    },
    async (ctx, next) => {
      return db.ScalingInstance.find().then(res => {
        ctx.body.ScalingInstances = res;
        return next();
      });
    },
    async (ctx, next) => {
      return db.Region.find().then(res => {
        ctx.body.Regions = res;
        return next();
      });
    },
    async ctx => {
      return db.InstanceType.find().then(res => {
        ctx.body.InstanceTypes = res;
      });
    }
  )
  .get(
    "/eipList",
    async (ctx, next) => {
      return db.Region.find().then(res => {
        ctx.body = {
          Regions: res
        };
        return next();
      });
    },
    async (ctx, next) => {
      return db.Instance.find().then(res => {
        ctx.body.Instances = res;
        return next();
      });
    },
    async (ctx, next) => {
      return db.EipAddress.find().then(res => {
        ctx.body.EipAddresses = res;
        return next();
      });
    }
  );

module.exports = router;
