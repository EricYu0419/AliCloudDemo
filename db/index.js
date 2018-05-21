const mongoose = require("mongoose");
const cfg = require("../config");

const Admin = require("./Schame/admin");
const Region = require("./Schame/region");
const Instance = require("./Schame/instance");
const InstanceType = require("./Schame/instanceType");
const ScalingConfiguration = require("./Schame/scalingConfiguration");
const ScalingGroup = require("./Schame/scalingGroup");
const ScalingRule = require("./Schame/scalingRule");
const ScalingActivity = require("./Schame/scalingActivity");
const ScalingInstance = require("./Schame/scalingInstance");

mongoose.Promise = global.Promise;

module.exports = {
  Admin: Admin,
  Region: Region,
  Instance: Instance,
  InstanceType: InstanceType,
  ScalingGroup: ScalingGroup,
  ScalingConfiguration: ScalingConfiguration,
  ScalingRule: ScalingRule,
  ScalingActivity: ScalingActivity,
  ScalingInstance: ScalingInstance,
  Init: function(callback) {
    mongoose.connect(cfg.db.mongo.uri);
    const connection = mongoose.connection;

    connection.on("error", err => {
      console.error(err);
    });
    connection.once("open", () => {
      console.info(`MongoDB ${cfg.db.mongo.uri} Connect Success`);
      callback({
        Admin: Admin,
        Region: Region,
        Instance: Instance,
        InstanceType: InstanceType,
        ScalingGroup: ScalingGroup,
        ScalingConfiguration: ScalingConfiguration,
        ScalingRule: ScalingRule,
        ScalingActivity: ScalingActivity,
        ScalingInstance: ScalingInstance
      });
    });
  }
};
