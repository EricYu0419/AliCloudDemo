const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  ScalingRuleId: { type: String, index: true, unique: true, required: true },
  ScalingRuleName: String,
  ScalingGroupId: { type: String, ref: "ScalingGroup" },
  RegionId: { type: String, index: true, required: true, ref: "Region" },
  Cooldown: Number,
  AdjustmentType: String,
  AdjustmentValue: Number,
  DefaultCooldown: Number,
  ScalingRuleAri: String,
  UpdateAt: Date
});

module.exports = mongoose.model("ScalingRule", Schame);
