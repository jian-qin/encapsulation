/**
 * 组件名称代理
 * @see 注意keep-alive组件需要等待缓存组件失活后才能销毁
 * @example
 *  const proxyName = proxyComponentName()
 *  <router-view v-slot="{ Component, route }">
 *      <keep-alive :include="当前缓存的页面fullPath列表">
 *          <keep-alive :key="route.fullPath" :is="proxyName(
 *              route.fullPath,
 *              包装组件,
 *              { component: Component }, // 把页面组件传递给包装组件去渲染
 *          )">
 *      </keep-alive>
 *  </keep-alive>
 */
export function proxyComponentName() {
    /**
     * @typedef {import('vue').Component} Component
     * @type {Map<string, Component>}
     */
    const map = new Map()
    /**
     * @param {string | Component} componentName 名称或提供名称的组件
     * @param {Component} component 真正显示的内容组件
     * @param {any} componentParams 显示内容组件的参数
     */
    return (componentName, component, componentParams) => {
        /**
         * @type {string}
         */
        const name = typeof componentName === 'string'
            ? componentName
            : getComponentName(componentName)
        if (map.has(name)) {
            return map.get(name)
        }
        const proxyComponent = defineComponent(() => {
            onUnmounted(() => map.delete(name))
            return () => h(component, componentParams)
        }, { name })
        map.set(name, proxyComponent)
        return proxyComponent
    }
}

// vue源码中获取组件名称的方法
function getComponentName(Component, includeInferred = true) {
    return typeof Component === "function"
        ? Component.displayName || Component.name
        : Component.name || includeInferred && Component.__name;
}
