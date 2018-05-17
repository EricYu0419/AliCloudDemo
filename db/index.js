const mongoose = require("mongoose");
const cfg = require("../config");

const Admin = require("./Schame/admin");
const Region = require("./Schame/region");
const Instance = require("./Schame/instance");
const InstanceType = require("./Schame/instanceType");

mongoose.Promise = global.Promise;

module.exports = {
  Admin: Admin,
  Region: Region,
  Instance: Instance,
  InstanceType: InstanceType,
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
        InstanceType: InstanceType
      });
    });
  }
};
