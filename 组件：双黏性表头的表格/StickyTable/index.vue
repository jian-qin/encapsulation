<template>
    <div v-if="props.data.length > 1">
        <div class="header">
            <div class="table" ref="headerRef">
                <Header
                    :data="props.data[0]"
                    :sortOptions="props.sortOptions"
                    :sizes="headerSizes"
                    @click="headerClick"
                />
            </div>
        </div>
        <div class="table body" ref="bodyRef" @scroll="bodyScroll">
            <Header
                :data="props.data[0]"
                :sortOptions="props.sortOptions"
                @resize="(e, index) => headerSizes[index] = e"
            />
            <div
                v-for="(item, index) in list"
                :key="index"
                :class="
                    index % props.data[0].length === 0
                        ? 'headerY'
                        : 'cell'
                "
                :style="{
                    order: orders[
                        Math.floor((index + props.data[0].length) / props.data[0].length)
                    ],
                }"
            >{{ item }}</div>
        </div>
    </div>
    <van-empty v-else description="暂无数据" />
</template>

<script lang="ts" setup>
import { formatNumber } from '@/utils/tools'
import Header from './Header.vue'

const props = defineProps<{
    data: (string | number | null)[][]
    sortOptions?: {
        list: number[]
        active: number
        direction: 'asc' | 'desc'
    }
}>()

const emit = defineEmits<{
    (e: 'update:sortOptions', value: typeof props.sortOptions): void
}>()

const list = computed(() => props.data.flatMap(
    (arr, index) => index > 0
        ? arr.map((item, index2) => index2 > 0 ? formatNumber(item) : item)
        : []
))
const headerSizes = reactive<Record<number, { width: number, height: number }>>({})

const bodyRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const bodyScroll = () => {
    headerRef.value!.style.left = -bodyRef.value!.scrollLeft + 'px'
}

const headerClick = (index: number) => {
    if (index === 0) return
    if (!props.sortOptions) return
    if (props.sortOptions.active === index) {
        emit('update:sortOptions', {
            ...props.sortOptions,
            direction: props.sortOptions.direction === 'asc' ? 'desc' : 'asc',
        })
    } else {
        emit('update:sortOptions', {
            ...props.sortOptions,
            active: index,
            direction: 'asc',
        })
    }
}

const orders = ref<Record<number, number>>({})
const getNumber = (val: any) => {
    if (typeof val === 'string') {
        val = val.replace(/\D/g, '')
    }
    return Number(val)
}
watch(
    props,
    ({ sortOptions, data }) => {
        if (!sortOptions) return
        const newOrders: Record<number, number> = {}
        const values = data.map((arr, index) => [index, arr[sortOptions.active]]).slice(1) as [number, typeof data[0][0]][]
        if (sortOptions.direction === 'asc') {
            values.sort((a, b) => getNumber(a[1]) - getNumber(b[1]))
        } else {
            values.sort((a, b) => getNumber(b[1]) - getNumber(a[1]))
        }
        values.forEach(([index], i) => {
            newOrders[index] = i
        })
        orders.value = newOrders
    },
    { deep: true, immediate: true },
)
</script>

<style lang="scss" scoped>
.table{
    display: grid;
    grid-template-columns: 80px repeat(v-bind('props.data[0]?.length - 1'), 1fr);
}
@mixin cell{
    padding: 6px 10px;
    box-sizing: border-box;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
}
.cell{
    @include cell;
    border-top: 1px solid #F9F9F9;
    border-left: 1px solid #F9F9F9;
    background-color: #fff;
    &:empty::before{
        content: '-';
    }
}
.headerY{
    @include cell;
    position: sticky;
    left: 0;
    background-color: #F0F6FB;
    border-top: solid 1px #F9F9F9;
    color: #003B88;
}
.header{
    position: sticky;
    top: 0;
    z-index: 1;
    height: calc(v-bind('headerSizes[0]?.height') * 1px);
    overflow: hidden;
    >div{
        position: absolute;
        top: 0;
        left: 0;
        width: fit-content;
    }
}
.body{
    overflow: auto;
    margin-top: calc(v-bind('headerSizes[0]?.height') * -1px);
}
</style>