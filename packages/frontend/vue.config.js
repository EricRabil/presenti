module.exports = {
  lintOnSave: true,
  devServer: {
      disableHostCheck: true
  },
  chainWebpack: config => {
    config.externals({
      '@clusterws/cws': 'cws'
    });
  }
};