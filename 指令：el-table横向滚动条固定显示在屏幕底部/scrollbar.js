import resize from "element-resize-detector"

// el-table横向滚动条固定显示在屏幕底部
const sy = Symbol()
export const scrollbar_fixed = {
    bind(el, binding, vnode) {
        // 创建滚动条
        const bar = document.createElement('div')
        const barItem = document.createElement('div')
        const table = el.querySelector('.el-table__body-wrapper')
        bar.appendChild(barItem)

        // 滚动条样式（暂时只支持字符串，有需要再优化）
        const barStyle = binding.value || 'bottom: 0; right: 20px; z-index: 9;'
        bar.style.cssText = 'overflow-x: auto; position: fixed;' + barStyle
        barItem.style.height = '1px'

        // 监听table容器宽度变化
        el[sy] = resize()
        el[sy].listenTo(el, () => {
            bar.style.width = el.clientWidth + 'px'
        })

        vnode.componentInstance.$nextTick(() => {
            // 隐藏滚动条
            table.setAttribute('v-scrollbar-fixed-table', '')
            // 隐藏滚动条之后左右fixed高度设置为100%
            el.querySelector('.el-table__fixed')?.setAttribute('v-scrollbar-fixed-table_fixed', '')
            el.querySelector('.el-table__fixed-right')?.setAttribute('v-scrollbar-fixed-table_fixed', '')
        })
        // 监听table宽度变化
        vnode.componentInstance.$watch(
            'bodyWidth',
            val => barItem.style.width = val,
            { immediate: true },
        )

        // 监听table滚动
        table.addEventListener('scroll', () => {
            if (bar.scrollLeft === table.scrollLeft) return
            bar.scrollLeft = table.scrollLeft
        })
        // 监听滚动条滚动
        bar.addEventListener('scroll', () => {
            table.scrollLeft = bar.scrollLeft
        })
        // 添加滚动条到页面上
        el.appendChild(bar)
    },
    unbind(el) {
        // 移除监听table宽度变化
        el[sy]?.uninstall(el)
    },
}