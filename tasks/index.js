const db = require("../db");
const later = require("later");
const ALY = require("aliyun-sdk");
const cfgAly = require("../config").alicloud;
const EP = require("eventproxy");
const async = require("async");
const ecsApis = require("aliyun-sdk/apis/ecs-2014-05-26.json");
const ecs = new ALY.ECS({
  accessKeyId: cfgAly.accessKeyId,
  secretAccessKey: cfgAly.accessKeySecret,
  endpoint: `https://ecs.aliyuncs.com`,
  apiVersion: "2014-05-26"
});
later.date.UTC();
const sched = {
  every1mins: later.parse
    .recur()
    .every(1)
    .minute()
    .on(15)
    .second(),
  every5mins: later.parse
    .recur()
    .every(5)
    .minute()
    .on(30)
    .second(),
  every15mins: later.parse
    .recur()
    .every(15)
    .minute()
    .on(03)
    .second(),
  every1hour: later.parse
    .recur()
    .every(1)
    .hour()
    .on(3)
    .minute()
    .on(15)
    .second(),
  everyday: later.parse
    .recur()
    .every(1)
    .dayOfMonth()
    .on(8)
    .hour()
    .on(3)
    .minute()
};

const instanceTypesReflash = () => {
  console.time("InstanceTypesReflash");
  const epError = new EP();
  epError.once("error", error => {
    console.timeEnd("InstanceTypesReflash");
    console.info(`InstanceTypesReflash end with error:`);
    console.error(err);
  });
  ecs.describeInstanceTypes((err, res) => {
    if (err) return epError.emit("error", err);
    if (
      res &&
      res.InstanceTypes &&
      res.InstanceTypes.InstanceType &&
      res.InstanceTypes.InstanceType.length > 0
    ) {
      const types = res.InstanceTypes.InstanceType;
      const epTypes = new EP();
      epTypes.after("types", types.length, instanceTypes => {
        console.timeEnd("InstanceTypesReflash");
        console.info(
          `InstanceTypesReflash end with ${instanceTypes.length} types`
        );
      });
      types.forEach(type => {
        db.InstanceType.findOne(
          { InstanceTypeId: type.InstanceTypeId },
          (err, instanceType) => {
            if (err) return epError.emit("error", err);
            if (!instanceType) {
              instanceType = new db.InstanceType(type);
            }
            instanceType.UpdateAt = new Date();
            instanceType.save((err, res) => {
              if (err) return epError.emit("error", err);
              console.info(
                `InstanceTypeId: ${res.InstanceTypeId} update success`
              );
              epTypes.emit("types", true);
            });
          }
        );
      });
    } else {
      console.timeEnd("InstanceTypesReflash");
      console.info(`InstanceTypesReflash end with empty types`);
    }
  });
};

const allReflash = () => {
  console.time("AllReflash");
  const epError = new EP();
  epError.once("error", error => {
    console.timeEnd("AllReflash");
    console.info(`allReflash end with error:`);
    console.error(err);
  });
  ecs.describeRegions((err, res) => {
    if (err) {
      return epError.emit("error", err);
    } else {
      let regions = res.Regions.Region || [];
      if (regions.length > 0) {
        async.each(
          regions,
          (e, cb) => {
            if (e && e.RegionId) {
              const epRegionData = new EP();
              epRegionData.all(
                "Instances",
                "Zones",
                "Disks",
                "Images",
                (Instances, Zones, Disks, Images) => {
                  const epRegionInstance = new EP();
                  epRegionInstance.all(
                    "Instances",
                    "RegionData",
                    (Instances, RegionDate) => {
                      cb();
                    }
                  );

                  /*
                   * 保存Instance信息 
                   */
                  if (Instances.length > 0) {
                    const epInstances = new EP();
                    epInstances.after(
                      "insUpdate",
                      Instances.length,
                      insUpdate => {
                        epRegionInstance.emit("Instances", true);
                      }
                    );
                    Instances.forEach(ins => {
                      db.Instance.findOne(
                        { InstanceId: ins.InstanceId },
                        (err, instance) => {
                          if (err) return epError.emit("error", err);

                          if (!instance) {
                            instance = new db.Instance(ins);
                          }
                          if (
                            !instance.UpdateAt ||
                            (new Date() - instance.UpdateAt.getTime()) /
                              (60 * 1000) >
                              10
                          ) {
                            instance.UpdateAt = new Date();
                            instance.save((err, res) => {
                              if (err) return epError.emit("error", err);

                              console.info(
                                `Instance id: ${res.InstanceId} update success`
                              );
                              epInstances.emit("insUpdate", true);
                            });
                          } else {
                            epInstances.emit("insUpdate", false);
                          }
                        }
                      );
                      epInstances.emit("insUpdate", true);
                    });
                  } else {
                    epRegionInstance.emit("Instances", false);
                  }

                  /*
                   * 保存Region信息
                   */
                  db.Region.findOne({ RegionId: e.RegionId }, (err, region) => {
                    if (err) return epError.emit("error", err);
                    // console.info(err, region);
                    if (!region) {
                      region = new db.Region(e);
                    }
                    if (
                      !region.UpdateAt ||
                      (new Date() - region.UpdateAt.getTime()) / (60 * 1000) >
                        10
                    ) {
                      region.UpdateAt = new Date();
                      region.RegionData = {
                        Instances: Instances.map(e => {
                          return e.InstanceId;
                        }),
                        Zones: Zones,
                        Disks: Disks,
                        Images: Images
                      };
                      // console.info(region);
                      region.save((err, res) => {
                        if (err) return epError.emit("error", err);

                        console.info(
                          `region id: ${res.RegionId} update success`
                        );
                        epRegionInstance.emit("RegionData", true);
                      });
                    } else {
                      cb();
                    }
                  });
                }
              );
              ecs.describeInstances(
                { RegionId: e.RegionId, PageNumber: 1, PageSize: 100 },
                (err, res) => {
                  if (err) return epError.emit("error", err);
                  if (res.Instances.Instance) {
                    epRegionData.emit("Instances", res.Instances.Instance);
                  } else {
                    epRegionData.emit("Instances", []);
                  }
                }
              );
              ecs.describeZones({ RegionId: e.RegionId }, (err, res) => {
                if (err) return epError.emit("error", err);
                if (res.Zones.Zone) {
                  epRegionData.emit("Zones", res.Zones.Zone);
                } else {
                  epRegionData.emit("Zones", []);
                }
              });
              ecs.describeDisks(
                { RegionId: e.RegionId, PageNumber: 1, PageSize: 100 },
                (err, res) => {
                  if (err) return epError.emit("error", err);
                  if (res.Disks.Disk) {
                    epRegionData.emit("Disks", res.Disks.Disk);
                  } else {
                    epRegionData.emit("Disks", []);
                  }
                }
              );
              ecs.describeImages(
                { RegionId: e.RegionId, PageNumber: 1, PageSize: 100 },
                (err, res) => {
                  if (err) return epError.emit("error", err);
                  if (res && res.Images && res.Images.Image) {
                    epRegionData.emit("Images", res.Images.Image);
                  } else {
                    epRegionData.emit("Images", []);
                  }
                }
              );
              ecs.describeInstanceTypeFamilies(
                { RegionId: e.RegionId },
                (err, res) => {
                  if (err) return epError.emit("error", err);
                  if (
                    res &&
                    res.InstanceTypeFamilies &&
                    res.InstanceTypeFamilies.InstanceTypeFamily
                  ) {
                    epRegionData.emit(
                      "InstanceTypeFamilies",
                      res.InstanceTypeFamilies.InstanceTypeFamily
                    );
                  } else {
                    epRegionData.emit("InstanceTypeFamilies", []);
                  }
                }
              );
            } else {
              cb();
            }
          },
          function(err) {
            if (err) return epError.emit("error", err);
            console.info("allReflash complete");
          }
        );
      }
    }
  });
};

const instanceStatusReflash = () => {
  console.time("InstanceStatusReflash");
  console.info(`instanceStatusReflash start at ${new Date().toISOString()}`);
  const epError = new EP();
  epError.once("error", error => {
    console.timeEnd("InstanceStatusReflash");
    console.info("instanceStatusReflash end with error:");
    console.error(error);
  });
  db.Region.$where("this.RegionData.Instances.length>0").exec(
    (err, regions) => {
      if (err) {
        return epError.emit("error", err);
      }
      if (regions && regions.length > 0) {
        const epRegions = new EP();
        epRegions.after("regions", regions.length, regions => {
          console.timeEnd("InstanceStatusReflash");
          console.info(
            `instanceStatusReflash end with ${regions.length} regions`
          );
        });
        regions.forEach(region => {
          ecs.describeInstanceStatus(
            { RegionId: region.RegionId, PageNumber: 1, PageSize: 50 },
            (err, res) => {
              if (err) {
                return epError.emit("error", err);
              }
              if (
                res &&
                res.InstanceStatuses &&
                res.InstanceStatuses.InstanceStatus &&
                res.InstanceStatuses.InstanceStatus.length > 0
              ) {
                const instanceStatuses = res.InstanceStatuses.InstanceStatus;
                const epInstances = new EP();
                epInstances.after(
                  "instanceStatuses",
                  instanceStatuses.length,
                  instanceStatuses => {
                    epRegions.emit("regions", true);
                  }
                );
                instanceStatuses.forEach(instanceStatus => {
                  db.Instance.findOne(
                    { InstanceId: instanceStatus.InstanceId },
                    (err, instance) => {
                      if (err) {
                        return epError.emit("error", err);
                      }
                      if (instance) {
                        instance.Status = instanceStatus.Status;
                        instance.save((err, res) => {
                          if (err) {
                            return epError.emit("error", err);
                          }
                          console.info(
                            `InstanceId: ${res.InstanceId}，Status：${
                              res.Status
                            }`
                          );
                          epInstances.emit("instanceStatuses", true);
                        });
                      } else {
                        epInstances.emit("instanceStatuses", false);
                      }
                    }
                  );
                });
              } else {
                epRegions.emit("regions", false);
              }
            }
          );
        });
      } else {
        console.timeEnd("InstanceStatusReflash");
        console.info("instanceStatusReflash end with empty regions");
      }
    }
  );
};

const tasks = {
  AllReflash: later.setInterval(allReflash, sched.every15mins),
  InstanceStatusReflash: later.setInterval(
    instanceStatusReflash,
    sched.every1mins
  ),
  InstanceTypesReflash: later.setInterval(instanceTypesReflash, sched.everyday)
};

module.exports = tasks;

db.Init(model => {
  instanceTypesReflash();
});
