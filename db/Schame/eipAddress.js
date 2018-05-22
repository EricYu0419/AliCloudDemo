const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  VpcId: { type: String, index: true, unique: true, required: true },
  VpcName: String,
  RegionId: { type: String, index: true, required: true },
  CidrBlock: String,
  CreationTime: Date,
  Description: String,
  RegionId: String,
  Status: String,
  UserCidrs: Object,
  VRouterId: String,
  VSwitchIds: Object
});

module.exports = mongoose.model("Vpc", Schame);
