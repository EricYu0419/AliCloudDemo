const Router = require("koa-router");
const pify = require("pify");
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

let Cache = {
  Instances: []
};
if (!Cache.Regions) {
  ecs.describeRegions((err, res) => {
    Cache.Regions = res.Regions.Region || [];
    if (Cache.Regions.length > 0) {
      const epRegions = new EP();
      let TotalCount = 0;
      epRegions.after("Instances", Cache.Regions.length, Instances => {
        Instances.forEach(e => {
          if (e.length > 0) {
            e.forEach(se => {
              Cache.Instances.push(se);
            });
          }
        });
      });
      Cache.Regions.forEach(e => {
        ecs.describeInstances({ RegionId: e.RegionId }, (err, res) => {
          TotalCount += res.TotalCount;
          epRegions.emit("Instances", res.Instances.Instance || []);
        });
        ecs.describeZones({ RegionId: e.RegionId }, (err, res) => {
          if (res.Zones.Zone) {
            if (!e.Zones) e.Zones = res.Zones.Zone;
          }
        });
        ecs.describeDisks({ RegionId: e.RegionId}, (err,res)=>{
          if (res.Disks.Disk){
            if (!e.Disks) e.Disks = res.Disks.Disk;
          }
        });
        ecs.describeImages({RegionId:e.RegionId},(err,res)=>{
          if (res.Images.Image){
            if (!e.Images) e.Images = res.Images.Image;
          }
        });
      });
    }
  });
}
if (!Cache.InstanceTypes) {
  // console.log(`Cache.InstanceTypes: ${Cache.InstanceTypes}`)
  ecs.describeInstanceTypes((err, res) => {
    // console.log(err,res);
    Cache.InstanceTypes = res.InstanceTypes.InstanceType;
  });
}




router.get("/ecslist", (ctx, next) => {
  // console.info(ctx.state.user); 当前用户
  return new Promise(function(resolve, reject) {
    if (!Cache.Regions) {
      ecs.describeRegions((err, res) => {
        Cache.Regions = res.Regions.Region;
        ctx.body = Cache.Regions;
        resolve();
        return next();
      });
    } else {
      ctx.body = Cache;
      resolve();
      return next();
    }
  });
});

module.exports = router;
