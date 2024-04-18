// 分页组件加徽标：el-pagination
// v-pagination-badge="{ 页码: 显示内容（0和空不显示） }"
export const pagination_badge = {
    bind(el, binding, vnode) {
        function setBadge (newVal) {
            el.querySelectorAll('.el-pager>.number').forEach(dom => {
                const txt = newVal[dom.innerText]
                dom.style.setProperty(
                    '--v-pagination-badge-txt',
                    txt && txt != 0 ? `"${txt}"` : '',
                )
            })
        }
        // 监听传参变化
        vnode.componentInstance.$parent.$watch(
            binding.expression,
            setBadge,
            { deep: true },
        )
        // 监听分页切换
        new MutationObserver(
            () => setBadge(binding.value)
        ).observe(
            el.querySelector('.el-pager'),
            { childList: true },
        )
    }
}