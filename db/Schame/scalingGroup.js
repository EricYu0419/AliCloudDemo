const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  ScalingGroupId: { type: String, index: true, unique: true, required: true },
  ScalingGroupName: String,
  ActiveScalingConfigurationId: { type: String, ref: "ScalingConfiguration" },
  RegionId: { type: String, index: true, required: true, ref: "Region" },
  MinSize: Number,
  MaxSize: Number,
  DefaultCooldown: Number,
  RemovalPolicies: Object,
  LoadBalancerIds: Object,
  DBInstanceIds: Object,
  VSwitchId: String,
  LifecycleState: String,
  TotalCapacity: Number,
  ActiveCapacity: Number,
  PendingCapacity: Number,
  RemovingCapacity: Number,
  CreationTime: Date,
  UpdateAt: Date
});

module.exports = mongoose.model("ScalingGroup", Schame);
