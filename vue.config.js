const { name } = require("./package");

module.exports = {
  publicPath:
    process.env.NODE_ENV === "production" ? "/ssml_voice_editor" : "./",
  transpileDependencies: true,
  devServer: {
    allowedHosts: "all",
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  configureWebpack: {
    output: {
      library: `${name}-[name]`,
      libraryTarget: "umd",
      chunkLoadingGlobal: `webpackJsonp_${name}`,
    },
  },
};
