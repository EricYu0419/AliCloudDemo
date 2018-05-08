const Router = require("koa-router");
const cfg = require("../../config").alicloud;
const ALY = require("aliyun-sdk");
const router = new Router();
const ecs = require("./ecs");
const ess = require("./ess");
// const AcsClient = new AcsROAClient(cfg);

router.get("/apiList", async (ctx, next) => {
  // ctx.set('Content-Type','application/json');
  ctx.body = ALY;
  await next();
});

router.use("/ecs", ecs.routes(), ecs.allowedMethods());
router.use("/ess", ess.routes(), ess.allowedMethods());

module.exports = router;
