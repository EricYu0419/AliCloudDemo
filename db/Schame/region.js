const mongoose = require("mongoose");
const Schame = new mongoose.Schema({
  RegionId: { type: String, index: true, unique: true, required: true },
  LocalName: { type: String, index: true, required: true },
  RegionData: Object,
  /** 
  RegionData:{
    Zones: [],
    Images: [],
    Disks: [],
    Instances: [InstanceId,...,InstanceId],
    InstanceTypeFamilies:[],
    InstanceTypes:[]
  }  
  **/
  UpdateAt: Date //LastUpdateAt 最后更新时间
});

module.exports = mongoose.model("Region", Schame);
