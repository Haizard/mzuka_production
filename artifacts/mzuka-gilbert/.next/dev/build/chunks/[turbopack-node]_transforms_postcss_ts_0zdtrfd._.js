module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/artifacts/mzuka-gilbert/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/node_modules__pnpm_0a7o4h9._.js",
  "chunks/[root-of-the-server]__1_-k4-d._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/artifacts/mzuka-gilbert/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];