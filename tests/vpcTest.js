const ALY = require("aliyun-sdk");
const cfgAly = require("../config").alicloud;
const ecs = new ALY.ECS({
  accessKeyId: cfgAly.accessKeyId,
  secretAccessKey: cfgAly.accessKeySecret,
  endpoint: `https://ecs.aliyuncs.com`,
  apiVersion: "2014-05-26"
});

// ecs.describeVpcs({ RegionId: "cn-shenzhen" ,PageNumber:1,PageSize:50}, (err, res) => {
//   console.info(res.Vpcs.Vpc);
// });

ecs.describeEipAddresses({ RegionId: "cn-shenzhen" ,PageNumber:1,PageSize:50}, (err, res) => {
  console.info(res.EipAddresses.EipAddress);
});
