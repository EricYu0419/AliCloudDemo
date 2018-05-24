const Router = require("koa-router");
const router = new Router();
const ALY = require("aliyun-sdk");
const cfg = require("../../config").alicloud;
const ecsApis = require("aliyun-sdk/apis/ecs-2014-05-26.json");
const EP = require("eventproxy");
const tasks = require("../../tasks");
const ping = require("ping");
const ecs = new ALY.ECS({
  accessKeyId: cfg.accessKeyId,
  secretAccessKey: cfg.accessKeySecret,
  endpoint: `https://ecs.aliyuncs.com`,
  apiVersion: "2014-05-26"
});
const db = require("../../db");

function ToPromise() {
  return new Promise(function(resolve, reject) {
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

router
  .get(
    "/pingList",
    async (ctx, next) => {
      return db.Instance.find()
        .sort("RegionId InstanceId")
        .then(res => {
          ctx.body = {
            Instances: res,
            PingInfos: res.map(ins => {
              return {
                InstanceName: ins.InstanceName,
                IpAddress:
                  ins.EipAddress.IpAddress ||
                  ins.PublicIpAddress.IpAddress[0] ||
                  "",
                InstanceId: ins.InstanceId
              };
            })
          };
          return next();
        });
    },
    async (ctx, next) => {
      return db.Region.find()
        .sort("RegionId")
        .then(res => {
          ctx.body.Regions = res;
          return next();
        });
    },
    async (ctx, next) => {
      return new Promise((resolve, reject) => {
        const epPings = new EP();
        epPings.after("ping", ctx.body.PingInfos.length, pings => {
          ctx.body.PingInfos = pings;
          resolve();
        });
        ctx.body.PingInfos.forEach(info => {
          ping.promise.probe(info.IpAddress, { min_reply: 4 }).then(res => {
            info.pingInfo = res;
            epPings.emit("ping", info);
          });
        });
      }).then(res => {
        return next();
      });
    }
  )
  .get(
    "/ecslist",
    async (ctx, next) => {
      // console.info(ctx.state.user); 当前用户
      return db.Region.find()
        .sort("RegionId")
        .then(res => {
          ctx.body = { Regions: res };
          return next();
        });
    },
    async (ctx, next) => {
      return db.Instance.find()
        .sort("RegionId InstanceId")
        .then(res => {
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
    return db.Region.find()
      .sort("RegionId")
      .then(res => {
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
      return db.Region.find()
        .sort("RegionId")
        .then(res => {
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
      return db.Region.find()
        .sort("RegionId")
        .then(res => {
          ctx.body = {
            Regions: res
          };
          return next();
        });
    },
    async (ctx, next) => {
      return db.Instance.find()
        .sort("RegionId InstanceId")
        .then(res => {
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
  )
  .get("/tasks/:Action", async (ctx, next) => {
    if (tasks[ctx.params.Action]) {
      tasks[ctx.params.Action](true);
      ctx.body = "success";
    } else {
      ctx.body = "not found";
    }
    return next();
  });

module.exports = router;
