import { g as getDefaultExportFromCjs } from "./index-CnDy_vzX.js";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var browser$2;
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser$2;
  hasRequiredBrowser = 1;
  browser$2 = function() {
    throw new Error(
      "ws does not work in the browser. Browser clients must use the native WebSocket object"
    );
  };
  return browser$2;
}
var browserExports = requireBrowser();
const browser = /* @__PURE__ */ getDefaultExportFromCjs(browserExports);
const browser$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: browser
}, [browserExports]);
export {
  browser$1 as b
};
