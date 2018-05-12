const mongoose = require("mongoose");
const cfg = require("../config");

const Admin = require("./Schame/admin");

mongoose.Promise = global.Promise;

module.exports = {
  Admin: Admin,
  Init: function(callback) {
    mongoose.connect(cfg.db.mongo.uri);
    const connection = mongoose.connection;

    const Admin = require("./Schame/admin");
    connection.on("error", err => {
      console.error(err);
    });
    connection.once("open", () => {
      
      console.info(`MongoDB ${cfg.db.mongo.uri} Connect Success`);
      callback({ Admin: Admin });
    });
  }
};
