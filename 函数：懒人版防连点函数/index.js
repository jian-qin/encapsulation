/**
 * 懒人版防连点函数
 * @param { number | undefined } [ time ] 超时时长
 * @returns { boolean } 是否为连点
 * @example
 *  handleExport() {
 *      if (
 *          this.$tools.debounceClick.call(this.handleExport)
 *      ) return
 *     // ...
 *  }
 */
export function debounceClick(time = 3000) {
    if (this.debounceClick === debounceClick) {
        throw new Error('懒人版防连点函数必须挂载到执行函数上！')
    }
    if (this[debounceClick.sy]) {
        return true
    }
    this[debounceClick.sy] = true
    setTimeout(() => {
        this[debounceClick.sy] = false
    }, time)
    return false
}
debounceClick.sy = Symbol()