const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  ScalingConfigurationId: {
    type: String,
    index: true,
    unique: true,
    required: true
  },
  ScalingConfigurationName: String,
  ScalingGroupId: {
    type: String,
    index: true,
    required: true,
    ref: "ScalingGroup"
  },
  ImageId: String,
  InstanceType: String,
  SecurityGroupId: String,
  InternetChargeType: String,
  SystemDiskCategory: String,
  LifecycleState: String,
  InternetMaxBandwidthIn: Number,
  InternetMaxBandwidthOut: Number,
  DataDisks: Object,
  CreationTime: Date,
  UpdateAt: Date
});

module.exports = mongoose.model("ScalingConfiguration", Schame);
