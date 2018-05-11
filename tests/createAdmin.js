const db = require("../db");

db.Init(() => {
  db.Admin.findOne({ username: "guest" }, (err, res) => {
    if (!res) {
      res = new db.Admin({
        username: "guest",
        password: "guest",
        role: "admin"
      });
      res.save((err, result) => {
        console.info(
          "test admin created success ",
          JSON.stringify(result, null, 2)
        );
      });
    } else {
      console.info("test admin already created ", JSON.stringify(res, null, 2));
    }
  });
});
