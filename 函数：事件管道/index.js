
export const EventChannel2 = (() => {
    let id = 0
    const wmap = new WeakMap()

    const getOption = (_this, eventName, key) => {
        const level0 = EventChannel.defaultOptions
        const level1 = wmap.get(_this).options
        const level2 = wmap.get(_this).optionsMap.get(eventName) || {}
        if (Object.prototype.hasOwnProperty.call(level2, key)) {
            return level2[key]
        }
        if (Object.prototype.hasOwnProperty.call(level1, key)) {
            return level1[key]
        }
        return level0[key]
    }

    const EventChannel = class {
        static defaultOptions = {
            isEmitCache: true,
            isEmitOnce: false,
            isOnOnce: false,
        }

        constructor(options, optionsMap) {
            if (options && typeof options !== 'object') {
                throw new Error('options必须是对象类型')
            }
            if (optionsMap && !(optionsMap instanceof Map)) {
                throw new Error('optionsMap必须是Map类型')
            }

            ++id
            Object.defineProperty(this, 'id', { value: id })

            wmap.set(this, {
                options: options || {},
                optionsMap: optionsMap || new Map(),
                listeners: new Map(),
                emitCaches: new Map(),
                watchOffWeakMap: new WeakMap(),
                watchOffMap: new Map(),
                onEmitWeakMap: new WeakMap(),
            })
        }

        on(eventName, cb) {
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { listeners, emitCaches, onEmitWeakMap } = wmap.get(this)
            listeners.has(eventName) || listeners.set(eventName, new Set())

            if (getOption(this, eventName, 'isOnOnce')){
                listeners.get(eventName).clear()
            }
            listeners.get(eventName).add(cb)

            if (getOption(this, eventName, 'isEmitCache')) {
                const cachesSet = emitCaches.get(eventName)
                if (cachesSet) {
                    cachesSet.forEach(args => {
                        const val = cb(...args)
                        const fn = onEmitWeakMap.get(args)
                        if (fn) {
                            fn(val)
                            onEmitWeakMap.delete(args)
                        }
                    })
                    emitCaches.delete(eventName)
                }
            }

            return cb
        }

        emit(...args) {
            if (args.length === 0) {
                throw new Error('必须传入事件名称')
            }
            const [eventName, ...params] = args
            const { listeners, emitCaches } = wmap.get(this)

            if (listeners.has(eventName)) {
                listeners.get(eventName).forEach(cb => cb(...params))
                return null
            }

            if (getOption(this, eventName, 'isEmitCache')) {
                emitCaches.has(eventName) || emitCaches.set(eventName, new Set())
                if (getOption(this, eventName, 'isEmitOnce')) {
                    emitCaches.get(eventName).clear()
                }
                emitCaches.get(eventName).add(params)
            }

            return params
        }

        off(...args) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            const { listeners, emitCaches, watchOffWeakMap, watchOffMap, onEmitWeakMap } = wmap.get(this)
            const proxyDelete = (MS, _this) => {
                const cb = watchOffWeakMap.get(_this) || watchOffMap.get(_this)
                MS.delete(_this) && cb && cb()
                watchOffWeakMap.delete(_this)
                watchOffMap.delete(_this)
                onEmitWeakMap.delete(cb)
            }

            args.forEach(_this => {
                proxyDelete(listeners, _this)
                proxyDelete(emitCaches, _this)
            })

            listeners.forEach((set, eventName) => {
                args.forEach(_this => {
                    proxyDelete(set, _this)
                })
                set.size === 0 && proxyDelete(listeners, eventName)
            })
            emitCaches.forEach((set, eventName) => {
                args.forEach(_this => {
                    proxyDelete(set, _this)
                })
                set.size === 0 && proxyDelete(emitCaches, eventName)
            })
        }

        watchOff(_this, cb) {
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { watchOffMap } = wmap.get(this)

            try{
                watchOffMap.set(_this, cb)
            } catch (e) {
                watchOffMap.get(this).set(_this, cb)
            }
        }

        once(eventName, cb) {
            const proxyCb = (...args) => {
                if (cb) {
                    const val = cb(...args)
                    cb = null
                    this.off(proxyCb)
                    return val
                }
            }
            return this.on(eventName, proxyCb)
        }

        onEmit(eventName, ...args) {
            const params = args.slice(0, -1)
            const cb = args[args.length - 1]
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { listeners, emitCaches, onEmitWeakMap } = wmap.get(this)

            if (listeners.has(eventName)) {
                listeners.get(eventName).forEach(fn => cb(fn(...params)))
                return null
            }

            if (getOption(this, eventName, 'isEmitCache')) {
                emitCaches.has(eventName) || emitCaches.set(eventName, new Set())
                if (getOption(this, eventName, 'isEmitOnce')) {
                    emitCaches.get(eventName).clear()
                }
                emitCaches.get(eventName).add(params)
                onEmitWeakMap.set(params, cb)
            }

            return params
        }

        onceEmit(...args) {
            let _this
            const params = args.slice(0, -1)
            let cb = args[args.length - 1]
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            _this = this.onEmit(...params, (res) => {
                if (cb) {
                    cb(res)
                    cb = null
                    _this && this.off(_this)
                }
            })
        }

        syncEmit(...args) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            let val
            this.onceEmit(...args, (res) => val = res)
            return val
        }

        promiseEmit(...args) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            return new Promise(resolve => {
                this.onceEmit(...args, resolve)
            })
        }

    }
    return EventChannel
})()
