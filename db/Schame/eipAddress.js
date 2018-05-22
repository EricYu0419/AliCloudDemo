const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  AllocationId: { type: String, index: true, unique: true, required: true },
  RegionId: { type: String, index: true, required: true },
  IpAddress: String,
  InstanceId: String,
  InstanceRegionId: String,
  InstanceType: String,
  InternetChargeType: String,
  ResourceGroupId: String,
  Descritpion: String,
  Name: String,
  Status: String,
  ChargeType: String,
  OperationLocks: Object,
  AvailableRegions: Object,
  BandwidthPackageId: String,
  BandwidthPackageType: String,
  Bandwidth: String,
  AllocationTime: Date,
  ExpiredTime: Date,
  UpdateAt: Date
});

module.exports = mongoose.model("EipAddress", Schame);
