const Router = require("koa-router");
const v1 = require("./v1");
const router = new Router();
router.get("/", async (ctx, next) => {
  await next();
  ctx.body = "hello world";
});

router.use("/v1", v1.routes(), v1.allowedMethods());

module.exports = router;
