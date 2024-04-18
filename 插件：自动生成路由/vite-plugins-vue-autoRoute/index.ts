import { normalizePath, type HmrContext } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 自动生成路由的插件
 * @description 在 router/index.ts 中导入生成的 .data.json 文件即可
 * @param param0
 * @param param0.filepath 生成路由文件的路径
 * @param param0.clippingPath 路由文件路径的剪切路径
 * @param param0.mountKey 挂载路由数据的key
 * @returns 插件
 */
export default function autoRouter({
    filepath = '/src/router/.data.json' as `${string}.json`,
    clippingPath = '/index.vue' as `${string}.vue`,
    mountKey = 'ROUTE' as string | null,
} = {}) {
    const _filepath = path.join(process.cwd(), filepath)
    const reg_getJson = /<route.*>([\s\S]+?)<\/route>/
    const reg_isRoute = /vue&type=route/

    /**
     * 获取vue自定义块中的json数据
     * @param str 文件文本内容
     * @param parse 是否解析json
     * @returns json数据
     */
    const getJson = <P extends boolean = true>(str: string, parse = true as P) => {
        const jsonStr = str.match(reg_getJson)?.[1].trim()
        if (!jsonStr) return null
        return (parse ? JSON.parse(jsonStr) : jsonStr) as P extends true ? object : string
    }

    /**
     * 生成路由数据
     * @param param0 
     * @param param0.json vue自定义块中的json数据
     * @param param0.url 文件路径
     * @returns 路由数据
     */
    const getRoute = ({ json, url }: { json: object, url: string }) => {
        url = normalizePath(url)
        return {
            meta: json,
            path: url.replace(getRoute._root_path, '').replace(clippingPath, '') || '/',
            component: url.replace(getRoute._root, '')
        }
    }
    getRoute._root_path = normalizePath(path.join(process.cwd(), '/src/views'))
    getRoute._root = normalizePath(process.cwd())

    /**
     * 路由数据缓存，用来判断是否更新路由文件
     */
    const routes = new Proxy([] as any[], {
        set(target, propKey, value: any[]) {
            let run = true
            let old = JSON.stringify(target)
            if (propKey === '$set') {
                target.length = 0
                target.push(...value)
                if (fs.existsSync(_filepath)) {
                    const newStr = JSON.stringify(target)
                    if (
                        JSON.stringify(JSON.parse(
                            fs.readFileSync(_filepath, 'utf-8')
                        )) === newStr
                    ) {
                        old = newStr
                    }
                } else {
                    old = ''
                }
            } else {
                run = Reflect.set(target, propKey, value)
            }
            if (old !== JSON.stringify(target)) {
                fs.writeFileSync(_filepath, JSON.stringify(target, null, 4))
            }
            return run
        },
    }) as ReturnType<typeof getRoute>[] & { $set: ReturnType<typeof getRoute>[] }

    return {
        name: 'vite-plugins-vue-autoRoute',
        // 构建开始生成路由文件
        buildStart() {
            // 读取所有vue文件
            const files: string[] = []
            {
                const getFiles = (dir: string) => {
                    const stat = fs.statSync(dir)
                    if (stat.isDirectory()) {
                        fs.readdirSync(dir).forEach(value => {
                            getFiles(path.join(dir, value))
                        })
                    } else if (stat.isFile()) {
                        path.extname(dir) === '.vue' && files.push(dir)
                    }
                }
                getFiles(path.join(process.cwd(), '/src/views'))
            }
            // 读取所有vue文件中的<route>自定义块
            const routesData = files.flatMap(file => {
                const fileStr = fs.readFileSync(file, 'utf-8')
                const json = getJson(fileStr)
                return json ? [{ json, url: file }] : []
            })
            // 生成路由文件
            routes.$set = routesData.map(getRoute)
        },
        // 热更新时更新路由文件
        async handleHotUpdate(ctx: HmrContext) {
            if (path.extname(ctx.file) !== '.vue') return
            // 更新的vue文件中的<route>自定义块
            const text = await ctx.read()
            const json = getJson(text)
            if (!json) return
            const newRoute = getRoute({
                json,
                url: ctx.file,
            })
            // 判断是否存在
            const index = routes.findIndex(route => route.component === newRoute.component)
            if (index === -1) {
                // 不存在则新增
                routes.push(newRoute)
            } else {
                // 判断是否相同
                if (JSON.stringify(routes[index]) === JSON.stringify(newRoute)) return
                // 存在则更新
                routes[index] = newRoute
            }
        },
        // 读取vue文件中的<route>自定义块，挂载到组件上
        transform(_: any, id: string) {
            if (!mountKey) return
            if (!reg_isRoute.test(id)) return
            // 读取vue文件中的<route>自定义块
            const fileStr = fs.readFileSync(id.split('?')[0], 'utf-8')
            const json = getJson(fileStr, false)
            if (!json) return
            // 将route数据挂载到组件上
            return `export default comp => comp['${mountKey}'] = ${json}`
        }
    }
}
