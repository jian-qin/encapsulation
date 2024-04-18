<template>
    <div>
        ...

        <VirtualScrollMerge
            ref="virtualScrollMerge"
            v-bind="virtualScrollMergeBind"
        >
            <el-table-column
                label="区域"
                prop="areaName"
                class-name="stickyCol_1"
                width="100"
            />
            <el-table-column
                label="地区"
                prop="cityName"
                class-name="stickyCol_2"
                width="100"
            />
            <el-table-column
                label="门店"
                prop="storeName"
                class-name="stickyCol_3"
                width="100"
            />
            <el-table-column label="工单号" prop="workOrderNo" width="130"/>
            <el-table-column label="出库日期" prop="outboundDate" width="100"/>
            <el-table-column label="开单日期" prop="createTime" width="100"/>
            <el-table-column label="出库单号" prop="outboundNo" width="130"/>
            <el-table-column label="车牌号" prop="licensePlateNumber" width="100"/>
            <el-table-column label="车架号" prop="vin" width="160"/>
            <el-table-column label="销售人员工号" prop="salesWorkNumber" width="100"/>
            <el-table-column label="销售人员姓名" prop="salesName" width="100"/>
            <el-table-column label="领料人工号" prop="pickWorkNumber" width="100"/>
            <el-table-column label="领料人姓名" prop="pickName" width="100"/>
            <el-table-column label="服务顾问工号" prop="consultantWorkNumber" width="100"/>
            <el-table-column label="服务顾问姓名" prop="consultantName" width="100"/>
            <el-table-column label="配件编码" prop="materialCode" width="160"/>
            <el-table-column label="养护品名称" prop="materialName" width="200"/>
            <el-table-column label="数量" prop="outboundNum"/>
            <el-table-column label="金额（元）" prop="showPriceTotal" width="130"/>
        </VirtualScrollMerge>
    </div>
</template>

<script>
import VirtualScrollMerge from '@/components/VirtualScrollMerge/index.vue'
import {
    AfterSalesCareProductStatList,
    AfterSalesCareProductStatCount,
} from '@/api/aftersales/careProductStat.js'

export default {
    components: {
        VirtualScrollMerge,
    },
    data() {
        const getTotals_kMap = {
            areaId: 'areaStats',
            cityId: 'cityStats',
            storeId: 'storeStats',
        }
        return {
            // 查询参数
            queryParams: {
                pageSize: 20,
                cityIds: [],
                storeIds: [],
                salesIds: [],
                createTimeStartStr: this.$utils.getFirstDayOfMount(),
                createTimeEndStr: this.$utils.getNowDate(),
                orderOpenStartTimeStr: null,
                orderOpenEndTimeStr: null,
            },
            // 传参
            virtualScrollMergeBind: {
                // 获取列表数据接口
                getList: (pageNum) => AfterSalesCareProductStatList({
                    pageNum,
                    ...this.queryParams,
                }).then(e => e.rows),
                // 获取合计数据接口
                getTotals: (k, v) => AfterSalesCareProductStatCount({
                    ...this.queryParams,
                    areaId: null,
                    cityId: null,
                    storeId: null,
                    [k]: v,
                }).then(e => e.data[getTotals_kMap[k]]),
                // 用来储存合计数据的id的key
                totalsKeys: ['areaId', 'cityId', 'storeId'],
                // 相同value合并单元格-纵向
                mergeCols: [
                    {
                        key: 'areaId',
                        show: 'areaName',
                    },
                    {
                        key: 'cityId',
                        show: 'cityName',
                    },
                    {
                        key: 'storeId',
                        show: 'storeName',
                    },
                ],
                // 相同value合并单元格-横向
                mergeRows: [
                    {
                        key: ['storeId'],
                        show: ['storeName'],
                        value: '门店合计',
                    },
                    {
                        key: ['cityId', 'storeId'],
                        show: ['cityName', 'storeName'],
                        value: '地区合计',
                    },
                    {
                        key: ['areaId', 'cityId', 'storeId'],
                        show: ['areaName', 'cityName', 'storeName'],
                        value: '区域合计',
                    },
                ],
                // 粘性行
                stickyRows: [
                    {
                        key: 'storeId',
                        value: '门店合计',
                        css: {
                            backgroundColor: '#FFF7DF',
                        },
                    },
                    {
                        key: 'cityId',
                        value: '地区合计',
                        css: {
                            backgroundColor: '#E7FBFF',
                        },
                    },
                    {
                        key: 'areaId',
                        value: '区域合计',
                        css: {
                            backgroundColor: '#FFF1E2',
                        },
                    },
                ],
            },
        }
    },
    methods: {
        /** 搜索按钮操作 */
        handleQuery() {
            this.$refs.virtualScrollMerge?.expose__refresh()
        },
        /** 重置按钮操作 */
        resetQuery() {
            this.resetForm("queryForm")
            this.handleQuery()
        },
    },
}
</script>