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
const ess = new ALY.ESS({
  accessKeyId: cfgAly.accessKeyId,
  secretAccessKey: cfgAly.accessKeySecret,
  endpoint: `https://ess.aliyuncs.com`,
  apiVersion: "2014-08-28"
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
    console.error(error);
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
                "InstanceTypeFamilies",
                "ScalingGroups",
                "ScalingConfigurations",
                "ScalingRules",
                (
                  Instances,
                  Zones,
                  Disks,
                  Images,
                  InstanceTypeFamilies,
                  ScalingGroups,
                  ScalingConfigurations,
                  ScalingRules
                ) => {
                  const epRegionInstance = new EP();
                  epRegionInstance.all(
                    "Instances",
                    "ScalingGroups",
                    "ScalingConfigurations",
                    "ScalingRules",
                    "RegionData",
                    (
                      Instances,
                      ScalingGroups,
                      ScalingConfigurations,
                      ScalingRules,
                      RegionDate
                    ) => {
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
                      ins.UpdateAt = new Date();
                      db.Instance.findOneAndUpdate(
                        { InstanceId: ins.InstanceId },
                        ins,
                        { new: true, upsert: true },
                        (err, instance) => {
                          if (err) return epError.emit("error", err);

                          if (instance) {
                            console.info(
                              `Instance id: ${instance.InstanceId} update success`
                            );
                            epInstances.emit("insUpdate", true);
                          } else {
                            epInstances.emit("insUpdate", false);
                          }
                        }
                      );
                    });
                  } else {
                    epRegionInstance.emit("Instances", false);
                  }
                  if (ScalingGroups.length > 0) {
                    const epScalingGroups = new EP();
                    epScalingGroups.after(
                      "insUpdate",
                      ScalingGroups.length,
                      insUpdate => {
                        epRegionInstance.emit("ScalingGroups", true);
                      }
                    );
                    ScalingGroups.forEach(ins => {
                      db.ScalingGroup.findOneAndUpdate(
                        { ScalingGroupId: ins.ScalingGroupId },
                        ins,
                        { new: true, upsert: true },
                        (err, scalingGroup) => {
                          if (err) return epError.emit("error", err);

                          if (scalingGroup) {
                            console.info(
                              `ScalingGroup id: ${
                                scalingGroup.ScalingGroupId
                              } update success`
                            );
                            epScalingGroups.emit("insUpdate", true);
                          } else {
                            epScalingGroups.emit("insUpdate", false);
                          }
                        }
                      );
                    });
                  } else {
                    epRegionInstance.emit("ScalingGroups", false);
                  }
                  if (ScalingConfigurations.length > 0) {
                    const epScalingConfigurations = new EP();
                    epScalingConfigurations.after(
                      "insUpdate",
                      ScalingConfigurations.length,
                      insUpdate => {
                        epRegionInstance.emit("ScalingConfigurations", true);
                      }
                    );
                    ScalingConfigurations.forEach(ins => {
                      db.ScalingConfiguration.findOneAndUpdate(
                        { ScalingConfigurationId: ins.ScalingConfigurationId },
                        ins,
                        { new: true, upsert: true },
                        (err, scalingConfiguration) => {
                          if (err) return epError.emit("error", err);

                          if (scalingConfiguration) {
                            console.info(
                              `ScalingConfiguration id: ${
                                scalingConfiguration.ScalingConfigurationId
                              } update success`
                            );
                            epScalingConfigurations.emit("insUpdate", true);
                          } else {
                            epScalingConfigurations.emit("insUpdate", false);
                          }
                        }
                      );
                    });
                  } else {
                    epRegionInstance.emit("ScalingConfigurations", false);
                  }
                  if (ScalingRules.length > 0) {
                    const epScalingRules = new EP();
                    epScalingRules.after(
                      "insUpdate",
                      ScalingRules.length,
                      insUpdate => {
                        epRegionInstance.emit("ScalingRules", true);
                      }
                    );
                    ScalingRules.forEach(ins => {
                      db.ScalingRule.findOneAndUpdate(
                        { ScalingRuleId: ins.ScalingRuleId },
                        ins,
                        { new: true, upsert: true },
                        (err, scalingRule) => {
                          if (err) return epError.emit("error", err);

                          if (scalingRule) {
                            console.info(
                              `ScalingRule id: ${
                                scalingRule.ScalingRuleId
                              } update success`
                            );
                            epScalingRules.emit("insUpdate", true);
                          } else {
                            epScalingRules.emit("insUpdate", false);
                          }
                        }
                      );
                    });
                  } else {
                    epRegionInstance.emit("ScalingRules", false);
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
                        Images: Images,
                        InstanceTypeFamilies: InstanceTypeFamilies,
                        ScalingGroups: ScalingGroups,
                        ScalingConfigurations: ScalingConfigurations,
                        ScalingRules: ScalingRules
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
              ess.describeScalingGroups(
                { RegionId: e.RegionId },
                (err, res) => {
                  if (err) return epError.emit("error", err);
                  if (
                    res &&
                    res.ScalingGroups &&
                    res.ScalingGroups.ScalingGroup
                  ) {
                    epRegionData.emit(
                      "ScalingGroups",
                      res.ScalingGroups.ScalingGroup
                    );
                  } else {
                    epRegionData.emit("ScalingGroups", []);
                  }
                }
              );
              ess.describeScalingConfigurations(
                { RegionId: e.RegionId },
                (err, res) => {
                  if (err) return epError.emit("error", err);
                  if (
                    res &&
                    res.ScalingConfigurations &&
                    res.ScalingConfigurations.ScalingConfiguration
                  ) {
                    epRegionData.emit(
                      "ScalingConfigurations",
                      res.ScalingConfigurations.ScalingConfiguration
                    );
                  } else {
                    epRegionData.emit("ScalingConfigurations", []);
                  }
                }
              );
              ess.describeScalingRules({ RegionId: e.RegionId }, (err, res) => {
                if (err) return epError.emit("error", err);
                if (res && res.ScalingRules && res.ScalingRules.ScalingRule) {
                  epRegionData.emit(
                    "ScalingRules",
                    res.ScalingRules.ScalingRule
                  );
                } else {
                  epRegionData.emit("ScalingRules", []);
                }
              });
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

// db.Init(model => {
//   allReflash();
// });
