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
    return;
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

const allReflash = unClear => {
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
              console.time("Region_" + e.RegionId);
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
                "ScalingActivities",
                "ScalingInstances",
                "Vpcs",
                "EipAddresses",
                (
                  Instances,
                  Zones,
                  Disks,
                  Images,
                  InstanceTypeFamilies,
                  ScalingGroups,
                  ScalingConfigurations,
                  ScalingRules,
                  ScalingActivities,
                  ScalingInstances,
                  Vpcs,
                  EipAddresses
                ) => {
                  const epRegionInstance = new EP();
                  epRegionInstance.all(
                    "Instances",
                    "ScalingGroups",
                    "ScalingConfigurations",
                    "ScalingRules",
                    "ScalingInstances",
                    "Vpcs",
                    "EipAddress",
                    "RegionData",
                    (
                      Instances,
                      ScalingGroups,
                      ScalingConfigurations,
                      ScalingRules,
                      ScalingInstances,
                      RegionDate
                    ) => {
                      cb();
                    }
                  );

                  /*
                   * 保存Instance信息 
                   */
                  if (!unClear) {
                    db.Instance.remove(err => {
                      if (err) return epError.emit("error", err);
                    });
                  }
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
                              `Instance id: ${
                                instance.InstanceId
                              } update success`
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
                  if (ScalingInstances.length > 0) {
                    const epScalingInstances = new EP();
                    epScalingInstances.after(
                      "insUpdate",
                      ScalingInstances.length,
                      insUpdate => {
                        epRegionInstance.emit("ScalingInstances", true);
                      }
                    );
                    ScalingInstances.forEach(ins => {
                      db.ScalingInstance.findOneAndUpdate(
                        { InstanceId: ins.InstanceId },
                        ins,
                        { new: true, upsert: true },
                        (err, scalingInstance) => {
                          if (err) return epError.emit("error", err);

                          if (scalingInstance) {
                            console.info(
                              `ScalingInstanceId: ${
                                scalingInstance.InstanceId
                              } update success`
                            );
                            epScalingInstances.emit("insUpdate", true);
                          } else {
                            epScalingInstances.emit("insUpdate", false);
                          }
                        }
                      );
                    });
                  } else {
                    epRegionInstance.emit("ScalingInstances", false);
                  }
                  if (Vpcs.length > 0) {
                    const epVpcs = new EP();
                    epVpcs.after("insUpdate", Vpcs.length, insUpdate => {
                      epRegionInstance.emit("Vpcs", true);
                    });
                    Vpcs.forEach(ins => {
                      db.Vpc.findOneAndUpdate(
                        { VpcId: ins.VpcId },
                        ins,
                        { new: true, upsert: true },
                        (err, vpc) => {
                          if (err) return epError.emit("error", err);

                          if (vpc) {
                            console.info(`VpcId: ${vpc.VpcId} update success`);
                            epVpcs.emit("insUpdate", true);
                          } else {
                            epVpcs.emit("insUpdate", false);
                          }
                        }
                      );
                    });
                  } else {
                    epRegionInstance.emit("Vpcs", false);
                  }
                  if (EipAddresses.length > 0) {
                    const epEipAddresses = new EP();
                    epEipAddresses.after(
                      "insUpdate",
                      EipAddresses.length,
                      insUpdate => {
                        epRegionInstance.emit("EipAddresses", true);
                      }
                    );
                    EipAddresses.forEach(ins => {
                      db.EipAddress.findOneAndUpdate(
                        { AllocationId: ins.AllocationId },
                        ins,
                        { new: true, upsert: true },
                        (err, eipAddress) => {
                          if (err) return epError.emit("error", err);

                          if (eipAddress) {
                            console.info(
                              `AllocationId: ${
                                eipAddress.AllocationId
                              } update success`
                            );
                            epEipAddresses.emit("insUpdate", true);
                          } else {
                            epEipAddresses.emit("insUpdate", false);
                          }
                        }
                      );
                    });
                  } else {
                    epRegionInstance.emit("EipAddresses", false);
                  }

                  /*
                   * 保存Region信息
                   */
                  e.UpdateAt = new Date();
                  e.RegionData = {
                    Instances: Instances.map(e => {
                      return e.InstanceId;
                    }),
                    Zones: Zones,
                    Disks: Disks,
                    Images: Images,
                    InstanceTypeFamilies: InstanceTypeFamilies,
                    ScalingGroups: ScalingGroups,
                    ScalingConfigurations: ScalingConfigurations,
                    ScalingRules: ScalingRules,
                    ScalingInstances: ScalingInstances,
                    Vpcs: Vpcs,
                    EipAddresses: EipAddresses
                  };
                  db.Region.findOneAndUpdate(
                    { RegionId: e.RegionId },
                    e,
                    { new: true, upsert: true },
                    (err, region) => {
                      if (err) return epError.emit("error", err);
                      // console.info(err, region);
                      if (region) {
                        console.info(
                          `region id: ${region.RegionId} update success`
                        );
                        console.timeEnd("Region_" + e.RegionId);

                        epRegionInstance.emit("RegionData", true);
                      } else {
                        epRegionInstance.emit("RegionData", false);
                      }
                    }
                  );
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
              ecs.describeVpcs({ RegionId: e.RegionId }, (err, res) => {
                if (err) return epError.emit("error", err);
                if (
                  res &&
                  res.Vpcs &&
                  res.Vpcs.Vpc &&
                  res.Vpcs.Vpc.length > 0
                ) {
                  epRegionData.emit("Vpcs", res.Vpcs.Vpc);
                } else {
                  epRegionData.emit("Vpcs", []);
                }
              });
              ecs.describeEipAddresses({ RegionId: e.RegionId }, (err, res) => {
                if (err) return epError.emit("error", err);
                if (
                  res &&
                  res.EipAddresses &&
                  res.EipAddresses.EipAddress &&
                  res.EipAddresses.EipAddress.length > 0
                ) {
                  epRegionData.emit(
                    "EipAddresses",
                    res.EipAddresses.EipAddress
                  );
                } else {
                  epRegionData.emit("EipAddresses", []);
                }
              });
              ess.describeScalingGroups(
                { RegionId: e.RegionId, PageNumber: 1, PageSize: 50 },
                (err, res) => {
                  if (err) return epError.emit("error", err);
                  if (
                    res &&
                    res.ScalingGroups &&
                    res.ScalingGroups.ScalingGroup &&
                    res.ScalingGroups.ScalingGroup.length > 0
                  ) {
                    const groups = res.ScalingGroups.ScalingGroup;
                    const epGroups = new EP();
                    epGroups.after("Activities", groups.length, Activities => {
                      epRegionData.emit("ScalingGroups", groups);
                      let ScalingActivities = [];
                      Activities.forEach(activities => {
                        if (activities.length > 0) {
                          activities.forEach(activity => {
                            ScalingActivities.push(activity);
                          });
                        }
                      });
                      epRegionData.emit("ScalingActivities", ScalingActivities);
                    });
                    groups.forEach(group => {
                      ess.describeScalingActivities(
                        {
                          RegionId: e.RegionId,
                          ScalingGroupId: group.ScalingGroupId,
                          PageNumber: 1,
                          PageSize: 50
                        },
                        (err, res) => {
                          if (err) return epError.emit("error", err);
                          if (
                            res &&
                            res.ScalingActivities &&
                            res.ScalingActivities.ScalingActivity &&
                            res.ScalingActivities.ScalingActivity.length > 0
                          ) {
                            const activities =
                              res.ScalingActivities.ScalingActivity;
                            const epScalingActivities = new EP();
                            epScalingActivities.after(
                              "updates",
                              activities.length,
                              updates => {
                                epGroups.emit("Activities", true);
                              }
                            );
                            activities.forEach(activity => {
                              db.ScalingActivity.findOneAndUpdate(
                                {
                                  ScalingActivityId: activity.ScalingActivityId
                                },
                                activities,
                                { new: true, upsert: true },
                                (err, newActivity) => {
                                  if (err) return epError.emit("error", err);
                                  if (newActivity) {
                                    console.info(
                                      `ScalingActivityId: ${
                                        newActivity.ScalingActivityId
                                      } update success`
                                    );
                                    epScalingActivities.emit("updates", true);
                                  } else {
                                    epScalingActivities.emit("updates", false);
                                  }
                                }
                              );
                            });
                          } else {
                            epGroups.emit("Activities", []);
                          }
                        }
                      );
                    });
                  } else {
                    epRegionData.emit("ScalingGroups", []);
                    epRegionData.emit("ScalingActivities", []);
                  }
                }
              );
              ess.describeScalingConfigurations(
                { RegionId: e.RegionId, PageNumber: 1, PageSize: 50 },
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
              ess.describeScalingInstances(
                { RegionId: e.RegionId, PageNumber: 1, PageSize: 50 },
                (err, res) => {
                  if (err) return epError.emit("error", err);
                  if (
                    res &&
                    res.ScalingInstances &&
                    res.ScalingInstances.ScalingInstance
                  ) {
                    epRegionData.emit(
                      "ScalingInstances",
                      res.ScalingInstances.ScalingInstance
                    );
                  } else {
                    epRegionData.emit("ScalingInstances", []);
                  }
                }
              );
            } else {
              cb();
            }
          },
          function(err) {
            if (err) return epError.emit("error", err);
            console.timeEnd("AllReflash");
            console.info("allReflash complete");
          }
        );
      }
    }
  });
};

const instanceStatusReflash = () => {
  console.time("InstanceStatusReflash");
  console.info(`InstanceStatusReflash start at ${new Date().toISOString()}`);
  const epError = new EP();
  epError.once("error", error => {
    console.timeEnd("InstanceStatusReflash");
    console.info("InstanceStatusReflash end with error:");
    console.error(error);
  });
  db.Instance.remove(err => {
    if (err) epError.emit("error", err);
    console.info(`Instances Clear Up`);
  });
  db.Region.find((err, regions) => {
    if (err) {
      return epError.emit("error", err);
    }
    if (regions && regions.length > 0) {
      const epInRegions = new EP();
      epInRegions.after("regions", regions.length, regions => {
        console.timeEnd("InstanceStatusReflash");
        console.info(
          `InstanceStatusReflash end with ${regions.length} regions`
        );
      });
      regions.forEach(region => {
        ecs.describeInstances(
          { RegionId: region.RegionId, PageNumber: 1, PageSize: 50 },
          (err, res) => {
            if (err) {
              return epError.emit("error", err);
            }
            if (
              res &&
              res.Instances &&
              res.Instances.Instance &&
              res.Instances.Instance.length > 0
            ) {
              const instanceStatuses = res.Instances.Instance;
              const epInstances = new EP();
              epInstances.after(
                "instanceStatuses",
                instanceStatuses.length,
                instanceStatuses => {
                  epInRegions.emit("regions", true);
                }
              );
              instanceStatuses.forEach(instanceStatus => {
                db.Instance.findOneAndUpdate(
                  { InstanceId: instanceStatus.InstanceId },
                  instanceStatus,
                  { new: true, upsert: true },
                  (err, instance) => {
                    if (err) {
                      return epError.emit("error", err);
                    }
                    if (instance) {
                      console.info(
                        `InstanceId: ${instance.InstanceId}，Status：${
                          res.Status
                        }`
                      );
                      epInstances.emit("instanceStatuses", true);
                    } else {
                      epInstances.emit("instanceStatuses", false);
                    }
                  }
                );
              });
            } else {
              epInRegions.emit("regions", false);
            }
          }
        );
      });
    } else {
      console.timeEnd("InstanceStatusReflash");
      console.info("InstanceStatusReflash end with empty regions");
    }
  });
};
const scalingInstanceReflash = unClear => {
  console.time("ScalingInstanceReflash");
  console.info(`ScalingInstanceReflash start at ${new Date().toISOString()}`);
  const epError = new EP();
  epError.once("error", error => {
    console.timeEnd("ScalingInstanceReflash");
    console.info("ScalingInstanceReflash end with error:");
    console.error(error);
  });
  if (!unClear) {
    db.ScalingInstance.remove(err => {
      if (err) epError.emit("error", err);
      console.info(`ScalingInstances Clear Up`);
    });
  }
  db.Region.find((err, regions) => {
    if (err) {
      return epError.emit("error", err);
    }
    if (regions && regions.length > 0) {
      const epScRegions = new EP();
      epScRegions.after("regions", regions.length, regions => {
        console.timeEnd("ScalingInstanceReflash");
        console.info(
          `ScalingInstanceReflash end with ${regions.length} regions`
        );
      });
      regions.forEach(region => {
        const epRegionDatas = new EP();
        epRegionDatas.all("Instances", ScalingInstances => {
          region.RegionData.ScalingInstances = ScalingInstances;
          region.save((err, res) => {
            if (err) return epError.emit("error", err);
            epScRegions.emit("regions", true);
          });
        });
        ess.describeScalingInstances(
          { RegionId: region.RegionId, PageNumber: 1, PageSize: 50 },
          (err, res) => {
            if (err) {
              return epError.emit("error", err);
            }
            if (
              res &&
              res.ScalingInstances &&
              res.ScalingInstances.ScalingInstance &&
              res.ScalingInstances.ScalingInstance.length > 0
            ) {
              const scalingInstances = res.ScalingInstances.ScalingInstance;
              const epInstances = new EP();
              epInstances.after(
                "scalingInstances",
                scalingInstances.length,
                Instances => {
                  epRegionDatas.emit("Instances", scalingInstances);
                }
              );
              scalingInstances.forEach(instance => {
                instance.UpdateAt = new Date();
                db.ScalingInstance.findOneAndUpdate(
                  { InstanceId: instance.InstanceId },
                  instance,
                  { new: true, upsert: true },
                  (err, instance) => {
                    if (err) {
                      return epError.emit("error", err);
                    }
                    if (instance) {
                      console.info(
                        `ScalingInstanceId: ${
                          instance.InstanceId
                        }，LifecycleState：${
                          instance.LifecycleState
                        }，Health: ${instance.HealthStatus}`
                      );
                      epInstances.emit("scalingInstances", true);
                    } else {
                      epInstances.emit("scalingInstances", false);
                    }
                  }
                );
              });
            } else {
              epRegionDatas.emit("Instances", []);
            }
          }
        );
      });
    } else {
      console.timeEnd("ScalingInstanceReflash");
      console.info("ScalingInstanceReflash end with empty regions");
    }
  });
};

const eipAddressesReflash = () => {
  console.time("EipAddressesReflash");
  console.info(`EipAddressesReflash start at ${new Date().toISOString()}`);
  const epError = new EP();
  epError.once("error", error => {
    console.timeEnd("EipAddressesReflash");
    console.info("EipAddressesReflash end with error:");
    console.error(error);
  });
  db.EipAddress.remove(err => {
    if (err) epError.emit("error", err);
    console.info(`EipAddressess Clear Up`);
  });
  db.Region.find((err, regions) => {
    if (err) {
      return epError.emit("error", err);
    }
    if (regions && regions.length > 0) {
      const epEipRegions = new EP();
      epEipRegions.after("regions", regions.length, regions => {
        console.timeEnd("EipAddressesReflash");
        console.info(`EipAddressesReflash end with ${regions.length} regions`);
      });
      regions.forEach(region => {
        const epRegionDatas = new EP();
        epRegionDatas.all("EipAddresses", EipAddresses => {
          region.RegionData.EipAddresses = EipAddresses;
          region.save((err, res) => {
            if (err) return epError.emit("error", err);
            console.info(
              `regionId:${region.RegionId} ${
                EipAddresses.length
              } EipAddresses update`
            );
            epEipRegions.emit("regions", true);
          });
        });
        ecs.describeEipAddresses(
          { RegionId: region.RegionId, PageNumber: 1, PageSize: 50 },
          (err, res) => {
            if (err) {
              return epError.emit("error", err);
            }
            if (
              res &&
              res.EipAddresses &&
              res.EipAddresses.EipAddress &&
              res.EipAddresses.EipAddress.length > 0
            ) {
              const eipAddresss = res.EipAddresses.EipAddress;
              const epEipAddress = new EP();
              epEipAddress.after(
                "eipAddresss",
                eipAddresss.length,
                EipAddresses => {
                  epRegionDatas.emit("EipAddresses", eipAddresss);
                }
              );
              eipAddresss.forEach(eipAddress => {
                eipAddress.UpdateAt = new Date();
                db.EipAddress.findOneAndUpdate(
                  { AllocationId: eipAddress.AllocationId },
                  eipAddress,
                  { new: true, upsert: true },
                  (err, eipAddress) => {
                    if (err) {
                      return epError.emit("error", err);
                    }
                    if (eipAddress) {
                      console.info(`AllocationId: ${eipAddress.AllocationId}`);
                      epEipAddress.emit("eipAddresss", true);
                    } else {
                      epEipAddress.emit("eipAddresss", false);
                    }
                  }
                );
              });
            } else {
              epRegionDatas.emit("Instances", []);
            }
          }
        );
      });
    } else {
      console.timeEnd("EipAddressesReflash");
      console.info("EipAddressesReflash end with empty regions");
    }
  });
};

const scalingAllReflash = unClear => {
  console.time("ScalingAllReflash");
  console.info(`ScalingAllReflash start at ${new Date().toISOString()}`);
  const epError = new EP();
  epError.once("error", error => {
    console.timeEnd("ScalingAllReflash");
    console.info("ScalingAllReflash end with error:");
    console.error(error);
    return;
  });
  if (!unClear) {
    db.ScalingGroup.remove(err => {
      if (err) return epError.emit("error", err);
      console.info(`ScalingGroups Clear Up`);
    });
    db.ScalingConfiguration.remove(err => {
      if (err) return epError.emit("error", err);
      console.info(`ScalingConfigurations Clear Up`);
    });
    db.ScalingActivity.remove(err => {
      if (err) return epError.emit("error", err);
      console.info(`ScalingActivities Clear Up`);
    });
  }
  db.Region.find((err, regions) => {
    if (err) return epError.emit("error", err);
    if (regions && regions.length > 0) {
      const epScRegions = new EP();
      epScRegions.after("region", regions.length, regions => {
        console.timeEnd("ScalingAllReflash");
        console.info(`ScalingAllReflash end with ${regions.length} regions`);
      });
      regions.forEach(region => {
        const epRegionDatas = new EP();
        let regionData = region.RegionData;
        regionData.ScalingActivities = [];
        regionData.ScalingConfigurations = [];
        epRegionDatas.all("ScalingGroups", ScalingGroups => {
          region.RegionData.ScalingGroups = ScalingGroups;
          region.save((err, res) => {
            if (err) return epError.emit("error", err);
            epScRegions.emit("region", ScalingGroups.length > 0);
          });
        });
        ess.describeScalingGroups(
          { RegionId: region.RegionId, PageNumber: 1, PageSize: 50 },
          (err, res) => {
            if (err) return epError.emit("error", err);
            if (
              res &&
              res.ScalingGroups &&
              res.ScalingGroups.ScalingGroup &&
              res.ScalingGroups.ScalingGroup.length > 0
            ) {
              const groups = res.ScalingGroups.ScalingGroup;
              const epRegionGroups = new EP();
              epRegionGroups.after(
                "regionGroup",
                groups.length,
                regionGroup => {
                  epRegionDatas.emit("ScalingGroups", groups);
                }
              );
              groups.forEach(group => {
                const epGroupChilren = new EP();
                epGroupChilren.all(
                  "Activities",
                  "Configurations",
                  (activities, configurations) => {
                    db.ScalingGroup.findOneAndUpdate(
                      { ScalingGroupId: group.ScalingGroupId },
                      group,
                      { new: true, upsert: true },
                      (err, updateGroup) => {
                        if (err) return epError.emit("error", err);
                        epRegionGroups.emit("regionGroup", true);
                      }
                    );
                  }
                );
                ess.describeScalingConfigurations(
                  {
                    RegionId: region.RegionId,
                    ScalingGroupId: group.ScalingGroupId,
                    PageNumber: 1,
                    PageSize: 50
                  },
                  (err, res) => {
                    if (err) return epError.emit("error", err);
                    if (
                      res &&
                      res.ScalingConfigurations &&
                      res.ScalingConfigurations.ScalingConfiguration &&
                      res.ScalingConfigurations.ScalingConfiguration.length > 0
                    ) {
                      const configs =
                        res.ScalingConfigurations.ScalingConfiguration;
                      configs.forEach(config => {
                        regionData.ScalingConfigurations.push(config);
                        db.ScalingConfiguration.findOneAndUpdate(
                          {
                            ScalingConfigurationId:
                              config.ScalingConfigurationId
                          },
                          config,
                          { new: true, upsert: true },
                          (err, updates) => {
                            if (err) return epError.emit("error", err);
                          }
                        );
                      });
                      epGroupChilren.emit("Configurations", configs);
                    } else {
                      epGroupChilren.emit("Configurations", []);
                    }
                  }
                );
                ess.describeScalingActivities(
                  {
                    RegionId: region.RegionId,
                    ScalingGroupId: group.ScalingGroupId,
                    PageNumber: 1,
                    PageSize: 50
                  },
                  (err, res) => {
                    if (err) return epError.emit("error", err);
                    if (
                      res &&
                      res.ScalingActivities &&
                      res.ScalingActivities.ScalingActivity &&
                      res.ScalingActivities.ScalingActivity.length > 0
                    ) {
                      const activities = res.ScalingActivities.ScalingActivity;
                      activities.forEach(activity => {
                        regionData.ScalingActivities.push(activity);
                        db.ScalingActivity.findOneAndUpdate(
                          {
                            ScalingActivityId: activity.ScalingActivityId
                          },
                          activity,
                          { new: true, upsert: true },
                          (err, updates) => {
                            if (err) return epError.emit("error", err);
                          }
                        );
                      });
                      epGroupChilren.emit("Activities", activities);
                    } else {
                      epGroupChilren.emit("Activities", []);
                    }
                  }
                );
              });
            } else {
              epRegionDatas.emit("ScalingGroups", []);
            }
          }
        );
      });
    } else {
      console.timeEnd("ScalingAllReflash");
      console.info("ScalingAllReflash end with empty regions");
    }
  });
};

const tasks = {
  AllReflash: later.setInterval(allReflash, sched.every15mins),
  InstanceStatusReflash: later.setInterval(
    instanceStatusReflash,
    sched.every1mins
  ),
  ScalingInstancesReflash: later.setInterval(
    scalingInstanceReflash,
    sched.every1mins
  ),
  ScalingAllReflash: later.setInterval(scalingAllReflash, sched.every1mins),
  EipAddressesReflash: later.setInterval(eipAddressesReflash, sched.every1mins),
  InstanceTypesReflash: later.setInterval(instanceTypesReflash, sched.everyday)
};

module.exports = {
  tasks: tasks,
  InstanceStatusReflash: instanceTypesReflash,
  ScalingInstanceReflash: scalingInstanceReflash,
  ScalingAllReflash: scalingAllReflash,
  InstanceTypesReflash: instanceStatusReflash,
  EipAddressesReflash: eipAddressesReflash,
  AllReflash: allReflash
};

// db.Init(model => {
//   scalingAllReflash();
// });
