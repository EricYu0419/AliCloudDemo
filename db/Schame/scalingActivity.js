const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  ScalingActivityId: String, //伸缩活动的 ID
  ScalingGroupId: String, //伸缩组的 ID
  Description: String, //伸缩活动的描述信息
  Cause: String, //触发伸缩活动的原因
  StartTime: String, //伸缩活动的开始时间
  EndTime: String, //伸缩活动的结束时间
  Progress: Number, //伸缩活动的运行进度
  StatusCode: String, //伸缩活动的当前状态 - Successful：执行成功的伸缩活动。- Warning：部分执行成功的伸缩活动。- Failed：执行失败的伸缩活动。- InProgress：正在执行的伸缩活动。- Rejected：执行伸缩活动请求被拒绝。
  StatusMessage: String, //伸缩活动的状态信息
  UpdateAt: Date
});

module.exports = mongoose.model("ScalingActivity", Schame);
