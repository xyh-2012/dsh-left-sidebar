// 把 src/client.js 打成自包含的 CJS，再包进 ModuleLoader 外壳，输出 client.js。
// 外壳是必需的：profile 通过 window.__ModuleLoader__.load({ id, factory }) 加载插件，
// 且一切副作用（含 CSS 注入）都必须在 factory 闭包内执行，不能在脚本求值时执行。
import { build } from "esbuild";
import { writeFile } from "node:fs/promises";

const result = await build({
  entryPoints: ["src/client.js"],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["chrome110"],
  write: false,
  legalComments: "none",
});

const body = result.outputFiles[0].text;
const shell =
  `window.__ModuleLoader__.load({ id: "dsh-left-sidebar", factory: function (require) {\n` +
  `  var module = { exports: {} };\n` +
  `  var exports = module.exports;\n` +
  `${body}\n` +
  `  return module.exports;\n` +
  `} });\n`;

await writeFile("client.js", shell, "utf8");
console.log(`client.js written (${shell.length} B)`);
