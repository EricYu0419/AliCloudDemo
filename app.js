const Koa = require("koa");
const serve = require("koa-static");
const logger = require("koa-logger");
const compose = require("koa-compose");
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

// response

async function respond(ctx, next) {
  await next();
  if ("/" != ctx.url) return;
  ctx.body = "Hello World";
}

// composed middleware

const middlewares = compose([responseTime, ignoreAssets(logger()), respond]);
app.use(serve('./public'));
// console.info(router);
app.use(middlewares);
app.use(router.routes()).use(router.allowedMethods());

app.listen(8080);
