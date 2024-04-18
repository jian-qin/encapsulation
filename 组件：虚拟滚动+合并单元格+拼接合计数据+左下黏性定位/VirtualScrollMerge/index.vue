<template>
    <ElTableVirtualScroll
        class="VirtualScrollMerge"
        :style="{
            '--row-height': rowHeight + 'px',
            ...fixedLeftCss,
        }"
        ref="virtualScroll"
        :data="list"
        :key-prop="rowIdKey"
        @change="setVirtualList"
    >
        <el-table
            height="100%"
            border
            v-loading="loading"
            v-infinite-scroll="{
                target: '.el-table__body-wrapper',
                callback: loadMore,
            }"
            :span-method="mergeMethod"
            :data="virtualList"
            :row-key="rowIdKey"
            :row-style="stickyRowsMethod"
        >
            <slot/>
        </el-table>
    </ElTableVirtualScroll>
</template>

<script>
import ElTableVirtualScroll from 'el-table-virtual-scroll'
export default {
    name: "ServiceManProduce",
    components: {
        ElTableVirtualScroll,
    },
    props: {
        // 首页自动加载
        autoLoad: {
            type: Boolean,
            default: true,
        },
        // 唯一标识的key
        rowIdKey: {
            type: String,
            default: 'id',
        },
        // 合并列、粘性行，设置固定在左侧
        fixedLeft: {
            type: Boolean,
            default: true,
        },
        // 获取列表数据接口
        getList: {
            type: Function,
            required: true,
        },
        // 格式化列表数据
        forMateList: {
            type: Function,
            default: list => list,
        },
        // 获取合计数据接口
        getTotals: {
            type: Function,
            required: true,
        },
        // 用来储存合计数据的id的key
        totalsKeys: {
            type: Array,
            default: [],
        },
        // 相同value合并单元格-纵向
        mergeCols: {
            type: Array,
            default: [],
        },
        // 相同value合并单元格-横向
        mergeRows: {
            type: Array,
            default: [],
        },
        // 粘性行
        stickyRows: {
            type: Array,
            default: [],
        },
    },
    data() {
        return {
            // 页码
            count: 1,
            // 全部数据
            list: [],
            // 虚拟滚动数据
            virtualList: [],
            // 合计数据
            totalDatas: {},
            // 区分是否是合计数据
            isTotals: Symbol(),
            // 行高
            rowHeight: 44,
            // 加载中
            loading: false,
            // 没有更多了
            noMore: false,
            // css变量-固定在左侧
            fixedLeftCss: {},
        }
    },
    mounted() {
        this.stickyRowsMethod_attrs()
        this.autoLoad && this.loadMore()
        this.fixedLeft && this.setFixedLeft()
    },
    methods: {
        // 刷新
        expose__refresh() {
            this.count = 1
            this.list = []
            this.virtualList = []
            this.totalDatas = {}
            this.loading = false
            this.noMore = false
            this.loadMore()
        },
        // 加载更多
        loadMore() {
            if (this.loading || this.noMore) return
            this.loading = true
            this.getList(this.count).then((data = []) => {
                if (!data.length) {
                    this.noMore = this.count > 1
                    return
                }
                this.count++
                data = this.forMateList(data)
                this.loadMore_getTotals(data)
                this.listSplicTotals(data)
            }).finally(() => {
                this.loading = false
            })
        },
        // 加载更多-获取合计数据
        loadMore_getTotals(data) {
            data.forEach(item => {
                this.totalsKeys.forEach((idKey, index) => {
                    const k = idKey + item[idKey]
                    if (this.totalDatas[k]) return
                    const obj = {
                        [this.rowIdKey]: Symbol(),
                        [this.isTotals]: true,
                        ...this.setTotalsLinkageMerges(item, index),
                    }
                    this.totalDatas[k] = obj
                    // 获取合计数据
                    this.getTotals(idKey, item[idKey]).then((data = {}) => {
                        Object.assign(obj, {
                            ...data,
                            ...obj,
                        })
                        this.$set(this, 'virtualList', [...this.virtualList])
                    })
                })
            })
        },
        // 设置合计数据联动合并单元格数据
        setTotalsLinkageMerges(item, index) {
            // 设置保留纵向合并数据
            const hold = this.mergeCols.reduce((total, { key, show }) => {
                total[key] = item[key]
                total[show] = item[show]
                return total
            }, {})
            // 设置横向合并数据
            const merge = this.mergeRows[this.mergeRows.length - 1 - index]
            const totals = merge.key.reduce((total, key, i) => {
                total[key] = merge.value
                total[merge.show[i]] = merge.value
                return total
            }, {})
            return {
                ...hold,
                ...totals,
            }
        },
        // 拼接合计数据
        listSplicTotals(data) {
            // 新数据拼接合计数据
            for (let l = data.length - 1; l > -1; l--) {
                this.totalsKeys.forEach(idKey => {
                    const total = this.totalDatas[idKey + data[l][idKey]]
                    if (!total) return
                    if (data.includes(total)) return
                    data.splice(l + 1, 0, total)
                })
            }
            // 老数据去除末尾过时的合计数据
            const list = [...this.list]
            this.totalsKeys.forEach(() => {
                data.includes(list.at(-1)) && list.pop()
            })
            this.list = list.concat(data)
        },
        // 设置虚拟滚动数据（在末尾拼接合计数据，保证底部粘性行显示）
        setVirtualList(current) {
            if (!current?.length) {
                this.virtualList = current
                return
            }
            const endIndex = current.findLastIndex(item => !item[this.isTotals])
            const list = current.slice(0, endIndex + 1)
            this.totalsKeys.findLast(idKey => {
                const total = this.totalDatas[idKey + current[endIndex][idKey]]
                if (!total) return
                list.push(total)
            })
            this.virtualList = list
        },
        // 合并单元格
        mergeMethod(ops) {
            let merge = this.mergeMethod_rowspan(ops)
            merge ||= this.mergeMethod_colspan(ops)
            return merge
        },
        // 合并单元格-纵向
        mergeMethod_rowspan({ row, column, rowIndex }) {
            const merge = this.mergeCols.find(e => e.show === column.property)
            if (!merge) return
            if (!this.$tools.isNumeric(row[merge.key])) return
            // 防止和横向合并单元格冲突，影响到固定在左侧
            const oneStart = this.virtualList.findIndex(item => item[merge.key] === row[merge.key])
            const oneEnd = this.virtualList.findIndex(item => item[merge.key] === row[merge.key] && !item[this.isTotals])
            const oneOffset = oneEnd - oneStart
            if (rowIndex < oneEnd) {
                return
            }
            if (rowIndex > oneEnd) {
                return {
                    rowspan: 0,
                    colspan: 0,
                }
            }
            const rowspan = this.virtualList.reduce((total, item) => {
                const n = item[merge.key] === row[merge.key] ? 1 : 0
                return total + n
            }, 0)
            return {
                rowspan: rowspan - oneOffset,
                colspan: 1,
            }
        },
        // 合并单元格-横向
        mergeMethod_colspan({ row, column }) {
            const merge = this.mergeRows.find(e => {
                const i = e.show.indexOf(column.property)
                if (i === -1) return
                return row[e.key[i]] === e.value
            })
            if (!merge) return
            const isOne = merge.show[0] === column.property
            if (isOne) {
                return {
                    rowspan: 1,
                    colspan: merge.show.length,
                }
            }
            return {
                rowspan: 0,
                colspan: 0,
            }
        },
        // 设置粘性行-覆盖attrs设置（transform会让position:sticky无效）
        async stickyRowsMethod_attrs() {
            await this.$refs.virtualScroll.$nextTick()
            const dom = this.$refs.virtualScroll.$el.querySelector('.el-table__body-wrapper>div>div')
            dom.style.position = 'relative'
            Object.defineProperty(dom.style, 'transform', {
                set(e) {
                    const n = e.match(/\((.+)\)/)[1]
                    dom.style.top = n
                }
            })
        },
        // 设置粘性行
        stickyRowsMethod({ row, rowIndex }) {
            const index = this.stickyRows.findIndex(e => e.value === row[e.key])
            if (index === -1) return
            const css = this.stickyRows[index].css || {}
            // 留出空间联动固定在左侧
            const gap = index * 10000
            return {
                ...css,
                position: 'sticky',
                bottom: this.rowHeight * (this.stickyRows.length - index - 1) + 'px',
                zIndex: this.virtualList.length - rowIndex + gap,
            }
        },
        // 设置固定在左侧
        setFixedLeft() {
            const reg = /stickyCol_\d+/
            const cols = this.$refs.virtualScroll.$children[0].columns.filter(
                ({ className }) => reg.test(className)
            )
            this.fixedLeftCss = cols.reduce((total, { width }, index) => {
                total[`--fixedLeft${index + 1}-offset`] = width * index + 'px'
                total[`--fixedLeft${index + 1}_col-z`] = (this.stickyRows.length - index - 1) * 10000 || 1
                return total
            }, {})
        },
    }
}
</script>

<style lang="scss" scoped>
.VirtualScrollMerge{
    height: 100%;
}
::v-deep {
    .el-table__body tr {
        pointer-events: none;
        background-color: #fff;
        >td {
            background-color: inherit;
        }
    }
    $len: 10;
    @for $i from 1 through $len {
        .stickyCol_#{$i}>div {
            position: sticky;
            top: 0;
            bottom: calc(var(--row-height) * #{$i});
        }
    }
    // 固定在左侧-列
    .el-table__row:not([style]) {
        @for $i from 1 through $len {
            >.stickyCol_#{$i} {
                position: sticky;
                left: var(--fixedLeft#{$i}-offset);
                z-index: var(--fixedLeft#{$i}_col-z);
            }
        }
    }
    // 固定在左侧-行
    .el-table__row[style] {
        @for $i from 1 through $len {
            >.stickyCol_#{$i} {
                position: sticky;
                left: var(--fixedLeft#{$i}-offset);
                z-index: 1;
            }
        }
    }
    // 固定在左侧-标题
    .el-table__header th {
        @for $i from 1 through $len {
            &.stickyCol_#{$i} {
                position: sticky;
                left: var(--fixedLeft#{$i}-offset);
                z-index: 1;
            }
        }
    }
}
</style>