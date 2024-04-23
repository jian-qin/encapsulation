/**
 * 事件通道构造器
 * @description
 * 类似div上的事件监听：同一个事件类型（名称），可以有多个监听者，也可以有多个触发者；
 * 可以设置是否缓存未监听的事件，未监听的事件会在注册监听时触发；
 * 引出的可以监听，缓存事件触发，并接收监听器回调函数的返回值（onEmit）；
 * 可以销毁（off）：事件监听（on）、缓存的事件触发（emit）、监听事件的触发（onEmit）、事件名称下的所有监听；
 * 可以监听销毁（watchOff）：支持所有销毁函数（off）支持的参数；
 * 可以监听一次事件触发，并返回监听器回调函数的返回值：执行一次emit，接受on中回调函数的返回值（不会缓存的emit）；
 */
export const EventChannel = (() => {
    type EventChannelOptions = typeof EventChannel['defaultOptions']
    interface WmapValue {
        options: Partial<EventChannelOptions>
        optionsMap: Map<any, Partial<EventChannelOptions>>
        listeners: Map<any, Set<Function>>
        emitCaches: Map<any, Set<any[]>>
        watchOffWeakMap: WeakMap<any, Function>
        watchOffMap: Map<any, Function>
        onEmitWeakMap: WeakMap<any[], Function>
    }
    type IdThis = ReturnType<InstanceType<typeof EventChannel>['on']> | ReturnType<InstanceType<typeof EventChannel>['emit']>

    let id = 0
    const wmap: WeakMap<InstanceType<typeof EventChannel>, WmapValue> = new WeakMap()

    /**
     * 获取配置
     * @param ctx 事件通道构造器实例
     * @param eventName 事件名称
     * @param key 配置键
     * @returns 配置值
     * @see
     * 配置优先级：事件配置 > 默认配置 > 实例配置
     */
    const getOption = <K extends keyof EventChannelOptions>(
        ctx: InstanceType<typeof EventChannel>,
        eventName: any,
        key: K
    ) => {
        const level0 = EventChannel.defaultOptions
        const level1 = wmap.get(ctx)!.options
        const level2 = wmap.get(ctx)!.optionsMap.get(eventName) || {}
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

        /**
         * @param options 当前实例配置 
         * @param options.isEmitCache 是否缓存未监听的事件
         * @param options.isEmitOnce 是否只触发一次事件
         * @param options.isOnOnce 是否只监听一次事件
         * @param optionsMap 指定事件使用单独配置
         */
        constructor(
            options?: WmapValue['options'],
            optionsMap?: WmapValue['optionsMap']
        ) {
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

        /**
         * 监听事件
         * @param eventName 事件名称
         * @param cb 回调函数
         * @returns 唯一标识（用于取消监听）
         */
        on(eventName: any, cb: Function) {
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { listeners, emitCaches, onEmitWeakMap } = wmap.get(this)!
            listeners.has(eventName) || listeners.set(eventName, new Set())

            if (getOption(this, eventName, 'isOnOnce')){
                listeners.get(eventName)!.clear()
            }
            listeners.get(eventName)!.add(cb)

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

        /**
         * 触发事件
         * @param args 事件名称及参数
         * @returns 唯一标识（用于取消监听） 或 null
         */
        emit(...args: any[]) {
            if (args.length === 0) {
                throw new Error('必须传入事件名称')
            }
            const [eventName, ...params] = args
            const { listeners, emitCaches } = wmap.get(this)!

            if (listeners.has(eventName)) {
                listeners.get(eventName)!.forEach(cb => cb(...params))
                return null
            }

            if (getOption(this, eventName, 'isEmitCache')) {
                emitCaches.has(eventName) || emitCaches.set(eventName, new Set())
                if (getOption(this, eventName, 'isEmitOnce')) {
                    emitCaches.get(eventName)!.clear()
                }
                emitCaches.get(eventName)!.add(params)
            }

            return params
        }

        /**
         * 取消监听
         * @param args 唯一标识或事件名称 的列表
         */
        off(...args: (any | IdThis)[]) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            const { listeners, emitCaches, watchOffWeakMap, watchOffMap, onEmitWeakMap } = wmap.get(this)!
            const proxyDelete = (
                MS:
                    | WmapValue['listeners']
                    | WmapValue['emitCaches']
                    | NonNullable<ReturnType<WmapValue['listeners']['get']>>
                    | NonNullable<ReturnType<WmapValue['emitCaches']['get']>>
                ,
                _idThis: (any | IdThis)[]
            ) => {
                const cb = watchOffWeakMap.get(_idThis) || watchOffMap.get(_idThis)
                MS.delete(_idThis) && cb && cb()
                watchOffWeakMap.delete(_idThis)
                watchOffMap.delete(_idThis)
                onEmitWeakMap.delete(_idThis)
            }

            args.forEach(_idThis => {
                proxyDelete(listeners, _idThis)
                proxyDelete(emitCaches, _idThis)
            })

            listeners.forEach((set, eventName) => {
                args.forEach(_idThis => {
                    proxyDelete(set, _idThis)
                })
                set.size === 0 && proxyDelete(listeners, eventName)
            })
            emitCaches.forEach((set, eventName) => {
                args.forEach(_idThis => {
                    proxyDelete(set, _idThis)
                })
                set.size === 0 && proxyDelete(emitCaches, eventName)
            })
        }

        /**
         * 监听销毁
         * @param _idThis 唯一标识或事件名称
         * @param cb 回调函数
         */
        watchOff(_idThis: any | IdThis, cb: Function) {
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { watchOffWeakMap, watchOffMap } = wmap.get(this)!

            try{
                watchOffWeakMap.set(_idThis, cb)
            } catch (e) {
                watchOffMap.set(_idThis, cb)
            }
        }

        /**
         * 只监听一次
         * @param eventName 事件名称
         * @param cb 回调函数
         * @returns 唯一标识（用于取消监听）
         */
        once(eventName: any, cb: Function) {
            let _cb: Function | null = cb
            const proxyCb = (...args: any[]) => {
                if (_cb) {
                    const val = _cb(...args)
                    _cb = null
                    this.off(proxyCb)
                    return val
                }
            }
            return this.on(eventName, proxyCb)
        }

        /**
         * 触发事件，并监听事件的触发
         * @param eventName 事件名称
         * @param args 事件参数及回调函数（最后一个参数必须是回调函数）
         * @returns 唯一标识（用于取消监听） 或 null
         * @description
         * 回调函数会接收监听器回调函数的返回值
         */
        onEmit(eventName: any, ...args: [...any[], Function]) {
            const params = args.slice(0, -1)
            const cb: Function | undefined = args[args.length - 1]
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { listeners, emitCaches, onEmitWeakMap } = wmap.get(this)!

            if (listeners.has(eventName)) {
                listeners.get(eventName)!.forEach(fn => cb(fn(...params)))
                return null
            }

            if (getOption(this, eventName, 'isEmitCache')) {
                emitCaches.has(eventName) || emitCaches.set(eventName, new Set())
                if (getOption(this, eventName, 'isEmitOnce')) {
                    emitCaches.get(eventName)!.clear()
                }
                emitCaches.get(eventName)!.add(params)
                onEmitWeakMap.set(params, cb)
            }

            return params
        }

        /**
         * 触发事件，并监听事件的触发，只触发一次
         * @param eventName 事件名称
         * @param args 事件参数及回调函数（最后一个参数必须是回调函数）
         * @description
         * 回调函数会接收监听器回调函数的返回值
         */
        onceEmit(eventName: any, ...args: [...any[], Function]) {
            const params = args.slice(0, -1)
            const cb: Function | undefined = args[args.length - 1]
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            let _cb: Function | null = cb
            let _idThis: IdThis | undefined
            _idThis = this.onEmit(eventName, ...params, (res: any) => {
                if (_cb) {
                    _cb(res)
                    _cb = null
                    _idThis && this.off(_idThis)
                }
            })
        }

        /**
         * 触发事件，返回监听器回调函数的返回值（不会缓存的emit）
         * @param args [事件名称, ...事件参数]
         * @returns 监听器回调函数的返回值
         * @description
         * 必须是已注册的事件才能拿到返回值（非缓存的emit）
         */
        syncEmit(...args: any[]) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            let val: any | undefined
            this.onceEmit(
                // @ts-ignore
                ...args,
                (res: any) => val = res
            )
            return val
        }

        /**
         * 触发事件，返回Promise对象，在监听器触发时把触发器回调函数的返回值传递给Promise对象
         * @param args [事件名称, ...事件参数]
         * @returns Promise对象
         */
        promiseEmit(...args: any[]) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            return new Promise(resolve => {
                this.onceEmit(
                    // @ts-ignore
                    ...args,
                    resolve,
                )
            })
        }

    }
    return EventChannel
})()
