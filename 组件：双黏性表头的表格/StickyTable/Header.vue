<template>
    <div
        class="Header"
        v-for="(item, index) in props.data"
        :key="index"
        :class="{
            start: index === 0,
        }"
        :style="{
            width: props.sizes?.[index]?.width + 'px',
        }"
        v-element-size="[
            e => emit('resize', e, index),
            { width: 0, height: 0 },
            { box: 'border-box'},
        ]"
        @click="emit('click', index)"
    >
        <span :class="{
            'active': props.sortOptions?.active === index,
        }">{{ item }}</span>
        <IconSvg
            v-if="
                props.sortOptions
                && index > 0
                && props.sortOptions.list.includes(index)
            "
            class="icon"
            :src="icon_sort"
            :cssVars="cssVars(index)"
        />
    </div>
</template>

<script lang="ts" setup>
import { vElementSize } from '@vueuse/components'
import icon_sort from '@/assets/svg/sort.svg'

const props = defineProps<{
    data: (string | number | null)[]
    sizes?: Record<number, { width: number, height: number }>
    sortOptions?: {
        list: number[]
        active: number
        direction: 'asc' | 'desc'
    }
}>()

const emit = defineEmits<{
    (
        e: 'resize',
        size: { width: number, height: number },
        index: number
    ): void
    (e: 'click', index: number): void
}>()

const iconColorMap = {
    asc: {
        '--left-color': 'rgb(0, 106, 243, 0.15)',
        '--right-color': '#006AF3',
    },
    desc: {
        '--left-color': '#006AF3',
        '--right-color': 'rgb(0, 106, 243, 0.15)',
    },
}

const cssVars = (index: number) => {
    if (!props.sortOptions) return
    if (props.sortOptions.active !== index) return
    return iconColorMap[props.sortOptions.direction]
}
</script>

<style lang="scss" scoped>
.Header{
    white-space: pre;
    line-height: 14px;
    padding: 6px 10px;
    box-sizing: border-box;
    min-height: 40px;
    background-color: #F5F7F9;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    &:not(:first-child){
        border-left: 1px solid #F3F3F3;
    }
    &.start{
        position: sticky;
        left: 0;
        background-color: #F0F6FB;
    }
    >.active{
        color: #006AF3;
    }
    >.icon{
        width: 14px;
        height: 14px;
        margin-left: 2px;
    }
}
</style>