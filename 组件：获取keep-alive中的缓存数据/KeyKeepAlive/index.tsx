import { KeepAlive, type VNode, type Ref } from 'vue'

class ConstructProxy<
    O extends Record<keyof any, any>,
    K extends keyof O
> {
    #target?
    #prop?
    #value?
    list: any[] = []
    constructor(target: O, prop: K) {
        this.#isFunction(target[prop])
        this.#target = target
        this.#prop = prop
        this.#value = target[prop]
        target[prop] = new Proxy(target[prop], {
            construct: (target, argArray, newTarget) => {
                const obj = Reflect.construct(target, argArray, newTarget)
                this.list.push(obj)
                return obj
            }
        })
    }
    #isFunction(value: any): asserts value is Function {
        if (typeof value !== 'function') {
            throw new Error('value is not a function')
        }
    }
    unmount() {
        this.#target![this.#prop!] = this.#value!
        this.#target = this.#prop = this.#value = undefined
        this.list.length = 0
    }
}

function resetShapeFlag(vnode: VNode) {
    vnode.shapeFlag &= ~256
    vnode.shapeFlag &= ~512
}

// keep-alive unmount 源码中的卸载方式
function unmount(vnode: VNode) {
    resetShapeFlag(vnode)
    if (!vnode.component?.isDeactivated) return
    // @ts-ignore
    const instance = keep.value?.$
    if (!instance) return
    const _unmount = instance.ctx.renderer.um
    _unmount(vnode, instance, instance.suspense, true)
}

const C = defineComponent(() => () => <> </>)
const sy = Symbol()
const keep = ref<InstanceType<typeof KeepAlive> | null>(null)

export default defineComponent((_, { expose, slots }) => {
    const isInit = ref(false)
    const m = new ConstructProxy(window, 'Map')
    const s = new ConstructProxy(window, 'Set')
    const cache = ref<Map<string | symbol, VNode> | null>(null)
    const cacheKey = ref<Set<string | symbol> | null>(null)
    function cacheUnmount(key: string | symbol): boolean {
        if (!cache.value || !cacheKey.value) return false
        const vnode = cache.value.get(key)
        if (!vnode) return false
        unmount(vnode)
        cache.value.delete(key)
        return cacheKey.value.delete(key)
    }
    expose({
        cache,
        cacheKey,
        cacheUnmount,
    })
    nextTick(async () => {
        cache.value = m.list.find(map => map.has(sy))
        cacheKey.value = s.list.find(set => set.has(sy))
        m.unmount()
        s.unmount()
        isInit.value = true
        await nextTick()
        cacheUnmount(sy)
    })
    return () => {
        let vNode = slots.default?.()?.[0]
        if (!isInit.value) {
            vNode = <C key={sy} />
        }
        return <KeepAlive ref={keep}>{vNode}</KeepAlive>
    }
})

export type KeyKeepAliveExpose = {
    cache: Ref<Map<string, VNode>>,
    cacheKey: Ref<Set<string>>,
    cacheUnmount: (key: string) => boolean
}