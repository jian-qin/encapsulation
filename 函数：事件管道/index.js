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
    /**
     * @typedef {typeof EventChannel['defaultOptions']} EventChannelOptions 
     * @typedef {{
     *      options: Partial<EventChannelOptions>
     *      optionsMap: Map<any, Partial<EventChannelOptions>>
     *      listeners: Map<any, Set<Function>>
     *      emitCaches: Map<any, Set<any[]>>
     *      watchOffWeakMap: WeakMap<any, Function>
     *      watchOffMap: Map<any, Function>
     *      onEmitWeakMap: WeakMap<any[], Function>
     *      promiseEmitWeakMap: WeakMap<Promise<any>, Function>
     * }} WmapValue
     * @typedef {ReturnType<InstanceType<typeof EventChannel>['on']> | ReturnType<InstanceType<typeof EventChannel>['emit']>} IdThis
     */

    let id = 0
    /**
     * @type {WeakMap<InstanceType<typeof EventChannel>, WmapValue>}
     */
    const wmap = new WeakMap()

    /**
     * 获取配置
     * @template {keyof EventChannelOptions} K
     * @param {InstanceType<typeof EventChannel>} ctx 事件通道构造器实例
     * @param {any} eventName 事件名称
     * @param {K} key 配置键
     * @returns 配置值
     * @see
     * 配置优先级:事件配置 > 默认配置 > 实例配置
     */
    const getOption = (ctx, eventName, key) => {
        const level0 = EventChannel.defaultOptions
        const level1 = /**@type {NonNullable<ReturnType<typeof wmap['get']>>}*/ (wmap.get(ctx)).options
        const level2 = /**@type {NonNullable<ReturnType<typeof wmap['get']>>}*/ (wmap.get(ctx)).optionsMap.get(eventName) || {}
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
         * @param {object} [options] 当前实例配置 
         * @param {boolean} [options.isEmitCache] 是否缓存未监听的事件
         * @param {boolean} [options.isEmitOnce] 是否只触发一次事件
         * @param {boolean} [options.isOnOnce] 是否只监听一次事件
         * @param {WmapValue['optionsMap']} [optionsMap] 指定事件使用单独配置
         */
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
                promiseEmitWeakMap: new WeakMap(),
            })
        }

        /**
         * 监听事件
         * @param {any} eventName 事件名称
         * @param {Function} cb 回调函数
         * @returns 唯一标识（用于取消监听）
         */
        on(eventName, cb) {
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { listeners, emitCaches, onEmitWeakMap } = /**@type {NonNullable<ReturnType<typeof wmap['get']>>}*/ (wmap.get(this))
            listeners.has(eventName) || listeners.set(eventName, new Set())

            if (getOption(this, eventName, 'isOnOnce')){
                /**@type {NonNullable<ReturnType<typeof listeners['get']>>}*/ (listeners.get(eventName)).clear()
            }
            /**@type {NonNullable<ReturnType<typeof listeners['get']>>}*/ (listeners.get(eventName)).add(cb)

            if (getOption(this, eventName, 'isEmitCache')) {
                Promise.resolve().then(() => {
                    const cachesSet = emitCaches.get(eventName)
                    if (!cachesSet) return
                    cachesSet.forEach(args => {
                        const val = cb(...args)
                        const fn = onEmitWeakMap.get(args)
                        if (fn) {
                            fn(val)
                            onEmitWeakMap.delete(args)
                        }
                    })
                    emitCaches.delete(eventName)
                })
            }

            return cb
        }

        /**
         * 触发事件
         * @param {any[]} args 事件名称及参数
         * @returns 唯一标识（用于取消监听） 或 null
         */
        emit(...args) {
            if (args.length === 0) {
                throw new Error('必须传入事件名称')
            }
            const [eventName, ...params] = args
            const { listeners, emitCaches } = /**@type {NonNullable<ReturnType<typeof wmap['get']>>}*/ (wmap.get(this))

            if (listeners.has(eventName)) {
                /**@type {NonNullable<ReturnType<typeof listeners['get']>>}*/ (listeners.get(eventName)).forEach(cb => cb(...params))
                return null
            }

            if (getOption(this, eventName, 'isEmitCache')) {
                emitCaches.has(eventName) || emitCaches.set(eventName, new Set())
                if (getOption(this, eventName, 'isEmitOnce')) {
                    /**@type {NonNullable<ReturnType<typeof emitCaches['get']>>}*/ (emitCaches.get(eventName)).clear()
                }
                /**@type {NonNullable<ReturnType<typeof emitCaches['get']>>}*/ (emitCaches.get(eventName)).add(params)
            }

            return params
        }

        /**
         * 取消监听
         * @param {(any | IdThis)[]} args 唯一标识或事件名称 的列表
         */
        off(...args) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            const { listeners, emitCaches, watchOffWeakMap, watchOffMap, onEmitWeakMap, promiseEmitWeakMap } = /**@type {NonNullable<ReturnType<typeof wmap['get']>>}*/ (wmap.get(this))
            /**
             * 代理删除
             * @param {WmapValue['listeners']
             *      | WmapValue['emitCaches']
             *      | NonNullable<ReturnType<WmapValue['listeners']['get']>>
             *      | NonNullable<ReturnType<WmapValue['emitCaches']['get']>>} MS 
             * @param {(any | IdThis)[]} _idThis 
             */
            const proxyDelete = (MS, _idThis) => {
                const cb = watchOffWeakMap.get(_idThis) || watchOffMap.get(_idThis)
                if (MS.has(_idThis) && cb) {
                    cb()
                    watchOffWeakMap.delete(_idThis)
                    watchOffMap.delete(_idThis)
                }
                MS.delete(_idThis)
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

            args.forEach(_idThis => {
                if (promiseEmitWeakMap.has(_idThis)) {
                    /**@type {NonNullable<ReturnType<typeof promiseEmitWeakMap['get']>>}*/ (promiseEmitWeakMap.get(_idThis))('手动取消Promise')
                }
            })
        }

        /**
         * 监听销毁
         * @param {any | IdThis} _idThis 唯一标识或事件名称
         * @param {Function} cb 回调函数
         * @returns 取消监听函数（不使用off方法，防止套娃）
         */
        watchOff(_idThis, cb) {
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { watchOffWeakMap, watchOffMap } = /**@type {NonNullable<ReturnType<typeof wmap['get']>>}*/ (wmap.get(this))

            try{
                watchOffWeakMap.set(_idThis, cb)
            } catch (e) {
                watchOffMap.set(_idThis, cb)
            }

            return () => {
                watchOffWeakMap.delete(_idThis)
                watchOffMap.delete(_idThis)
            }
        }

        /**
         * 只监听一次
         * @param {any} eventName 事件名称
         * @param {Function} cb 回调函数
         * @returns 唯一标识（用于取消监听）
         */
        once(eventName, cb) {
            /**
             * @type {Function | null}
             */
            let _cb = cb
            const proxyCb = (...args) => {
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
         * @param {any} eventName 事件名称
         * @param {[...any[], Function]} args 事件参数及回调函数（最后一个参数必须是回调函数）
         * @returns 唯一标识（用于取消监听） 或 null
         * @description
         * 回调函数会接收监听器回调函数的返回值
         */
        onEmit(eventName, ...args) {
            const params = args.slice(0, -1)
            /**
             * @type {Function | undefined}
             */
            const cb = args[args.length - 1]
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            const { listeners, emitCaches, onEmitWeakMap } = /**@type {NonNullable<ReturnType<typeof wmap['get']>>}*/ (wmap.get(this))

            if (listeners.has(eventName)) {
                /**@type {NonNullable<ReturnType<typeof listeners['get']>>}*/ (listeners.get(eventName)).forEach(fn => cb(fn(...params)))
                return null
            }

            if (getOption(this, eventName, 'isEmitCache')) {
                emitCaches.has(eventName) || emitCaches.set(eventName, new Set())
                if (getOption(this, eventName, 'isEmitOnce')) {
                    /**@type {NonNullable<ReturnType<typeof emitCaches['get']>>}*/ (emitCaches.get(eventName)).clear()
                }
                /**@type {NonNullable<ReturnType<typeof emitCaches['get']>>}*/ (emitCaches.get(eventName)).add(params)
                onEmitWeakMap.set(params, cb)
            }

            return params
        }

        /**
         * 触发事件，并监听事件的触发，只触发一次
         * @param {any} eventName 事件名称
         * @param {[...any[], Function]} args 事件参数及回调函数（最后一个参数必须是回调函数）
         * @returns 唯一标识（用于取消监听） 或 null
         * @description
         * 回调函数会接收监听器回调函数的返回值
         */
        onceEmit(eventName, ...args) {
            const params = args.slice(0, -1)
            /**
             * @type {Function | undefined}
             */
            const cb = args[args.length - 1]
            if (typeof cb !== 'function') {
                throw new Error('必须传入回调函数')
            }
            /**
             * @type {Function | null}
             */
            let _cb = cb
            /**
             * @type {IdThis | undefined}
             */
            let _idThis
            _idThis = this.onEmit(eventName, ...params, (res) => {
                if (_cb) {
                    _cb(res)
                    _cb = null
                    _idThis && this.off(_idThis)
                }
            })
            return _idThis
        }

        /**
         * 触发事件，返回监听器回调函数的返回值（不会缓存的emit）
         * @param {any[]} args [事件名称, ...事件参数]
         * @returns 监听器回调函数的返回值
         * @description
         * 必须是已注册的事件才能拿到返回值（非缓存的emit）
         */
        syncEmit(...args) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            /**
             * @type {any | undefined}
             */
            let val
            const _idThis = this.onceEmit(
                // @ts-ignore
                ...args,
                (res) => val = res
            )
            _idThis && this.off(_idThis)
            return val
        }

        /**
         * 触发事件，返回Promise对象，在监听器触发时把触发器回调函数的返回值传递给Promise对象
         * @param {any[]} args [事件名称, ...事件参数]
         * @returns Promise对象
         */
        promiseEmit(...args) {
            if (args.length === 0) {
                throw new Error('至少需要一个参数')
            }
            const { promiseEmitWeakMap } = /**@type {NonNullable<ReturnType<typeof wmap['get']>>}*/ (wmap.get(this))
            /**
             * @type {Function | undefined}
             */
            let cancel

            const pm = new Promise((resolve, reject) => {
                let unwatchOff
                const _idThis = this.onceEmit(
                    // @ts-ignore
                    ...args,
                    (res) => {
                        resolve(res)
                        unwatchOff && unwatchOff()
                    },
                )

                if (_idThis) {
                    unwatchOff = this.watchOff(_idThis, () => reject('手动取消Promise'))
                    cancel = (err) => {
                        reject(err)
                        unwatchOff()
                        this.off(_idThis)
                    }
                }
            })

            cancel && promiseEmitWeakMap.set(pm, cancel)
            pm.finally(() => promiseEmitWeakMap.delete(pm))

            return pm
        }

    }
    return EventChannel
})()
