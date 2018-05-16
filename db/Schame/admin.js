const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const SALT_WORK_FACTOR = 10;
const Schame = new mongoose.Schema({
  username: { type: String, required: true, index: { unique: true } },
  password: { type: String, required: true },
  role: String
});

Schame.pre("save", function(next) {
  const user = this;
  if (!user.isModified("password")) return next();

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) return next(err);

    // hash the password along with our new salt
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) return next(err);

      // override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

Schame.methods.comparePassword = function(candidatePassword, cb) {
  // console.info(this);
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    // console.info(err, isMatch);
    if (err) return cb(err);
    cb(null, isMatch);
  });
};


module.exports = mongoose.model("Admin", Schame);
