// vue.config.js
module.exports = {
    // options...
    devServer: {
        disableHostCheck: true
    },
    configureWebpack: {
        externals: ['@clusterws/cws']
    },
    chainWebpack: (config) => {
        const svgRule = config.module.rule('svg');
    
        svgRule.uses.clear();
    
        svgRule
          .use('babel-loader')
          .loader('babel-loader')
          .end()
          .use('vue-svg-loader')
          .loader('vue-svg-loader');
    }
}