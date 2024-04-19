const PORTS = 3010

import.meta.env.DEV && (async () => {
    const [
        router,
        VConsole,
        ReconnectingWebSocket,
        { useClipboard },
    ] = await Promise.all([
        import('@/router').then(e => e.default),
        import('vconsole').then(e => e.default),
        import('reconnecting-websocket').then(e => e.default),
        import('@vueuse/core'),
        import('@/assets/css/vConsole.scss'),
    ])

    const vcCtx = new VConsole({
        pluginOrder: ['feedback', 'vue'],
        onReady() {
            vcCtx.showPlugin('feedback')
        },
    })
    const wsCtx = new ReconnectingWebSocket(`ws://${location.hostname}:${PORTS}`)
    const { copy } = useClipboard()

    const vcItem_feedback = new VConsole.VConsolePlugin('feedback', '反馈')
    const vcItem_render_feedback = document.createElement('div')
    vcItem_feedback.on('renderTab', cb => cb(vcItem_render_feedback))
    vcItem_feedback.on('addTopBar', cb => cb([
        {
            name: 'ws:打开本页',
            onClick() {
                // @ts-ignore
                const __file: string | undefined = router.currentRoute.value.matched[0].components?.default.__file
                wsSend_openFile(__file)
            }
        },
        {
            name: 'ws:广播本页',
            onClick() {
                // @ts-ignore
                const __file: string | undefined = router.currentRoute.value.matched[0].components?.default.__file
                if (!__file) {
                    vant__showFailToast('未找到文件路径')
                    return
                }
                vcItem_render_feedback.innerText = __file
                wsCtx.send(JSON.stringify({
                    event: 'relay-broadcast',
                    targetEvent: 'openPage',
                    data: router.currentRoute.value.fullPath,
                }))
            }
        },
    ]))
    vcItem_feedback.on('addTool', cb => cb([
        {
            name: '本页路径',
            onClick() {
                vcItem_render_feedback.innerText = location.href
                copy(location.href).then(() => {
                    vant__showSuccessToast('已复制')
                }).catch(() => {
                    vant__showFailToast('复制失败')
                })
            }
        },
    ]))
    vcCtx.addPlugin(vcItem_feedback)
    // 解决 vConsole 复制的 curl -X POST -d 'json' 中json数据key不加引号的问题
    document.addEventListener('copy', e => {
        let text = window.getSelection()?.toString()
        if (!text) return
        e.preventDefault()
        const reg = /^(curl -X POST -d ')(\{.+\})(')/
        let params = text.match(reg)?.[2]
        if (params) {
            try {
                params = JSON.stringify(new Function('return ' + params)())
                text = text.replace(reg, `$1${params}$3`)
            } catch (err) {
                console.error(err)
            }
        }
        e.clipboardData?.setData('text/plain', text)
    })

    wsCtx.addEventListener('message', res => {
        const { id, event, description } = JSON.parse(res.data)
        if (event !== 'callback') return
        if (id) return
        vant__showToast(description)
    })
    // 按住ctrl点击页面打开vscode文件（当前路由的页面组件）
    document.addEventListener('click', e => {
        if (!e.ctrlKey) return
        e.stopImmediatePropagation()
        // @ts-ignore
        const __file: string | undefined = router.currentRoute.value.matched[0].components?.default.__file
        wsSend_openFile(__file)
    }, true)
    // 按住alt点击元素打开vscode文件（元素所属最近的组件）
    document.addEventListener('click', e => {
        if (!e.altKey) return
        e.stopImmediatePropagation()
        let target = e.target as HTMLElement | null
        let __file: string | undefined
        while (target) {
            // @ts-ignore
            __file = target.__vueParentComponent?.type.__file
            if (__file && !__file.startsWith('/')) break
            target = target.parentElement
        }
        wsSend_openFile(__file)
    }, true)
    // 监听打开本页事件
    wsCtx.addEventListener('message', res => {
        const { event, data } = JSON.parse(res.data)
        if (event !== 'openPage') return
        if (document.hidden) return
        router.push(data)
    })

    /**
     * 打开vscode文件
     * @param path 文件路径
     */
    function wsSend_openFile(path?: string) {
        if (!path) {
            vant__showFailToast('未找到文件路径')
            return
        }
        vcItem_render_feedback.innerText = path
        wsCtx.send(JSON.stringify({
            event: 'openFile',
            data: path,
        }))
    }

})()
