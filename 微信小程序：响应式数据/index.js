import { v4 as uuidv4 } from 'uuid'

/**
 * 响应式数据
 * @param {Record<string | number, any>} data 定义响应式数据
 * @returns {
 *  behavior: string,
 *  state: Record<string | number, symbol>,
 *  setData: (obj: Record<string | number, any>) => void
 * }
 * @example
 *  // store.js
 *  export default createReactive({
 *      count: 0,
 *      name: 'test',
 *  })
 *  // pageA.js
 *  import store from './store.js'
 *  Page({
 *      behaviors: [store.behavior],
 *      useStore: {
 *          newKey: store.state.count,
 *      },
 *      onLoad() {
 *          console.log(this.data.newKey) // 0
 *          setTimeout(() => {
 *              store.setData({ count: 1 }),
 *              console.log(this.data.newKey) // 1
 *          }, 9000)
 *      },
 *  })
 *  // pageB.js
 *  // 同pageA.js
 */
export const createReactive = data => {
    // 唯一标识（这里用不了Symbol，改用uuid）
    const id = `__storeMap__${uuidv4()}`
    // 记录每个组件store对应data的key
    const agent = {}
    // 记录每个data的key对应的组件
    const cache = {}
    Object.keys(data).forEach(key => {
        agent[key] = Symbol()
        cache[key] = new Set()
    })
    // 更新data并同步到组件
    const setData = obj => {
        Object.entries(obj).forEach(([key, val]) => {
            cache[key].forEach(_this => {
                data[key] = val
                const _key = Object.entries(_this[id]).find(e => e[1] === key)[0]
                _this.setData({
                    [_key]: val,
                })
            })
        })
    }
    const behavior = Behavior({
        lifetimes: {
            attached() {
                // 从this.data中转移到this（防止污染data）
                if (!this.data[id]) return
                this[id] = this.data[id]
                delete this.data[id]
                Object.entries(this[id]).forEach(e => {
                    // 记录当前组件对应的store
                    cache[e[1]].add(this)
                    // 当前store数据同步到组件data
                    this.setData({
                        [e[0]]: data[e[1]]
                    })
                })
            },
            detached() {
                // 从cache中移除当前组件
                if (!this[id]) return
                Object.entries(this[id]).forEach(e => {
                    cache[e[1]].delete(this)
                })
            }
        },
        definitionFilter(defFields) {
            if (!defFields.useStore) return
            defFields.data ||= {}
            // 只能记录在data这种规范的地方，否则会被微信忽略
            const storeMap = defFields.data[id] = {}
            const agentEntries = Object.entries(agent)
            Object.entries(defFields.useStore).forEach(([key, val]) => {
                const agentVal = agentEntries.find(e => e[1] === val)
                if (!agentVal) return
                storeMap[key] = agentVal[0]
            })
        },
    })
    return {
        behavior,
        state: agent,
        setData,
    }
}