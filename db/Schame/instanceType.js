const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  InstanceTypeId: String, //实例规格 ID
  CpuCoreCount: Number, //CPU 的内核数目
  MemorySize: Number, //内存大小，单位 GB
  InstanceTypeFamily: String, //实例规格族
  GPUAmount: Number, //实例规格附带 GPU 数量
  GPUSpec: String, //实例规格附带 GPU 类型
  InitialCredit: Number, //突发性能实例初始 CPU 积分
  BaselineCredit: Number, //突发性能实例基准 CPU 计算性能（多核和）
  EniQuantity: Number, //实例规格支持网卡数量
  LocalStorageCapacity: Number, //实例挂载的本地存储的单盘容量
  LocalStorageAmount: Number, //实例挂载的本地存储的数量
  LocalStorageCategory: String, //实例挂载的本地存储的类型
  UpdateAt: Date
});

module.exports = mongoose.model("InstanceType", Schame);
