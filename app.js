const Koa = require("koa");
const serve = require("koa-static");
const proxy = require("koa-proxy");
const logger = require("koa-logger");
const compose = require("koa-compose");
const cfg = require("./config");
const router = require("./routers");
const app = new Koa();

function ignoreAssets(mw) {
  return async function(ctx, next) {
    if (/(\.js|\.css|\.ico)$/.test(ctx.path)) {
      await next();
    } else {
      // must .call() to explicitly set the receiver
      await mw.call(this, ctx, next);
    }
  };
}

// x-response-time

async function responseTime(ctx, next) {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  ctx.set("X-Response-Time", ms + "ms");
}

// composed middleware

const middlewares = compose([responseTime, ignoreAssets(logger())]);
app.use(serve("./public"));
// console.info(router);
if (!cfg.proxy) {
  app.use(middlewares);
  app.use(router.routes()).use(router.allowedMethods());
} else {
  app.use(proxy({
    host:cfg.host
  }));
}

app.listen(8080);
