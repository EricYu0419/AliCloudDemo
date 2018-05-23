const Koa = require("koa");
const serve = require("koa-static");
const proxy = require("koa-proxy");
const logger = require("koa-logger");
const cors = require("koa-cors");
const jwt = require("koa-jwt");
const compress = require("koa-compress");
const cfg = require("./config");
const router = require("./routers");
const bodyParser = require("koa-bodyparser");
const app = new Koa();
const db = require("./db");

const errorHandle = require("./utils/middlewares/errorHandle");

// 允许跨域
app.use(cors());
app.use(compress());
app.use(
  jwt({ secret: cfg.jwt_secret }).unless({
    path: [/\/auth/, /\/asset/]
  })
);

// 日志过滤资源文件
function ignoreAssets(mw) {
  return async function(ctx, next) {
    if (/(\.js|\.css|\.ico|\.jpg|\.png|\.gif|\.bmp)$/.test(ctx.path)) {
      await next();
    } else {
      // must .call() to explicitly set the receiver
      await mw.call(this, ctx, next);
    }
  };
}

// 将public目录是为静态请求地址
app.use(serve("./public"));
app.use(ignoreAssets(logger()));

// 根据配置代理信息选择是处理还是转发。
if (!cfg.proxy) {
  console.info("非代理模式（全栈一体）");
  db.Init(() => {});
  app.use(bodyParser());
  app.use(router.routes()).use(router.allowedMethods());
  app.use(async ctx => {
    console.info(
      `response ctx.bdoy:${
        JSON.stringify(ctx.body, null, 2).length > 500
          ? "big size"
          : JSON.stringify(ctx.body, null, 2)
      }`
    );
  });
} else {
  console.info(
    `代理模式：Proxy = > ${
      cfg.proxy.host
    } (静态站点调用本地，API调用代理服务器)`
  );
  app.use(
    proxy({
      host: cfg.proxy.host
    })
  );
}

app.use(errorHandle);

// 根据配置监听端口
app.listen(cfg.port);
console.info(`服务启动于 127.0.0.1:${cfg.port}`);
