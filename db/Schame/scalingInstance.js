const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  InstanceId: String, //ECS实例的ID
  ScalingGroupId: String, //所属的伸缩组的ID
  ScalingConfigurationId: String, //关联的伸缩配置ID
  HealthStatus: String, //在伸缩组中的健康状态 - Healthy：健康的ECS实例。- Unhealthy：不健康的ECS实例。
  LifecycleState: String, //在伸缩组中的生命周期状态 - InService：已成功加入伸缩组并正常运行。- Pending：正在加入伸缩组但还未完成相关配置。- Removing：正在移出伸缩组。
  CreationTime: String, //加入伸缩组的时间
  CreationType: String, //ECS实例的创建类型 - AutoCreated：由弹性伸缩自动在伸缩组中创建。- Attached：在弹性伸缩之外创建，并由用户手工加入伸缩组。\\
  UpdateAt: Date
});

module.exports = mongoose.model("ScalingInstance", Schame);
