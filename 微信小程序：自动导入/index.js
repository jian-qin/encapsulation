const computed = require('miniprogram-computed').behavior
const env = require('../config/env.js')

// 自动注入全局环境变量
const autoInjectEnv = config => {
    config.data ||= {}
    config.data.ENV = env
}

// 判断使用了计算属性模块时computed，自动引入模块
const autoInjectComputed = config => {
    if (Object.keys(config.computed || {}).length) {
        config.behaviors ||= []
        config.behaviors.includes(computed) || config.behaviors.push(computed)
    }
}

// 重写Page
const _page = Page
Page = function (config) {
    autoInjectEnv(config)
    autoInjectComputed(config)
    _page.call(this, config)
}

// 重写Component
const _component = Component
Component = function (config) {
    autoInjectEnv(config)
    autoInjectComputed(config)
    _component.call(this, config)
}
