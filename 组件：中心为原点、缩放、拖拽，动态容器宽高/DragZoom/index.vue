<template>
    <!-- 中心为原点、缩放、拖拽，动态容器宽高 -->
    <div
        ref="wrap"
        class="wrap"
        @wheel.prevent="onWheel"
    >
        <div
            ref="content"
            :style="[
                `transform: translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${zoom})`,
                followWrap ? 'width: 100%; height: 100%;' : '',
            ]"
        >
            <slot></slot>
        </div>
    </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted } from "vue"
import resize from "element-resize-detector"

const props = defineProps({
    // 拖拽最小显示范围
    minShow: {
        type: Number,
        default: 40,
    },
    // 缩放比率
    zoomRatio: {
        type: Number,
        default: 1000,
    },
    // 最小缩显示面积
    minZoomArea: {
        type: Number,
        default: 40,
    },
    // 最大缩放比率
    maxZoomRatio: {
        type: Number,
        default: 4,
    },
    // 内容填充至容器大小
    followWrap: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['changeAreaWH'])

onMounted(() => {
    erdWrap.listenTo(wrap.value, () => {
        limitDrag()
        emit('changeAreaWH', wrap.value.clientWidth, wrap.value.clientHeight)
    })
    erdContent.listenTo(content.value, limitDrag)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
})

onBeforeUnmount(() => {
    erdWrap.uninstall(wrap.value)
    erdContent.uninstall(content.value)
    document.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
})

// 监听容器大小变化
const wrap = ref()
const content = ref()
const erdWrap = resize()
const erdContent = resize()

// 缩放值、拖拽值
const zoom = ref(1)
const x = ref(0)
const y = ref(0)

// 鼠标按下时的坐标
let startX = 0
let startY = 0

// 鼠标按下时的元素是否包含在容器内
let isWrap = false

// 鼠标按下
function onMouseDown(e) {
    isWrap = wrap.value?.contains(e.target)
    if (!isWrap) return
    startX = e.clientX
    startY = e.clientY
}

// 鼠标移动
function onMouseMove(e) {
    if (!isWrap) return
    x.value += e.clientX - startX
    y.value += e.clientY - startY
    startX = e.clientX
    startY = e.clientY
    limitDrag()
}

// 鼠标抬起
function onMouseUp() {
    isWrap = false
}

// 鼠标滚轮
const onWheel = createSyncFn(function (e) {
    const oldZoom = zoom.value
    zoom.value = zoom.value - e.deltaY / props.zoomRatio
    limitZoom()
    zoomOffset(e, oldZoom)
    limitDrag()
})

// 限制拖拽范围
function limitDrag() {
    const { clientWidth: areaW, clientHeight: areaH } = wrap.value
    const { clientWidth: dragW, clientHeight: dragH } = content.value
    const top = -(areaH + dragH * zoom.value) / 2 + props.minShow
    const bottom = -top
    const left = -(areaW + dragW * zoom.value) / 2 + props.minShow
    const right = -left
    if (y.value < top) {
        y.value = top
    } else if (y.value > bottom) {
        y.value = bottom
    }
    if (x.value < left) {
        x.value = left
    } else if (x.value > right) {
        x.value = right
    }
}

// 限制缩放范围
function limitZoom() {
    const { clientWidth: dragW, clientHeight: dragH } = content.value
    const minZoom = Math.max(props.minZoomArea / dragW, props.minZoomArea / dragH)
    if (zoom.value < minZoom) {
        zoom.value = minZoom
    } else if (zoom.value > props.maxZoomRatio) {
        zoom.value = props.maxZoomRatio
    }
}

// 缩放位置跟随鼠标位置偏移
function zoomOffset(e, oldZoom) {
    // 中心点为原点，缩放位置跟随鼠标位置偏移计算公式：
    // 缩放后的鼠标位置距离原点的距离 = 缩放前的鼠标位置距离原点的距离 * 缩放后的缩放比例 / 缩放前的缩放比例
    // 缩放后的偏移值 = 缩放后的鼠标位置距离原点的距离 - 缩放前的鼠标位置距离原点的距离
    // 注意：异步的缩放事件在高频调用偏移计算函数时，会导致计算结果被覆盖，所以需要改造成同步单线程的方式
    const { clientWidth: areaW, clientHeight: areaH } = wrap.value
    const { left: areaX, top: areaY } = wrap.value.getBoundingClientRect()
    // 原点坐标
    const originX = areaW / 2 + areaX + x.value
    const originY = areaH / 2 + areaY + y.value
    // 缩放前的鼠标位置距离原点的距离
    const oldX = e.clientX - originX
    const oldY = e.clientY - originY
    // 缩放后的鼠标位置距离原点的距离
    const newX = oldX * zoom.value / oldZoom
    const newY = oldY * zoom.value / oldZoom
    // 缩放后的偏移值
    const offsetX = newX - oldX
    const offsetY = newY - oldY
    // 缩放后的拖拽值
    x.value -= offsetX
    y.value -= offsetY
}

// 生成同步单线程函数
function createSyncFn(fn) {
    let isRunning = false
    return function (...args) {
        if (isRunning) return
        isRunning = true
        fn.apply(this, args)
        isRunning = false
    }
}

// 缩放至容器大小
function zoomToWrap() {
    const { clientWidth: areaW, clientHeight: areaH } = wrap.value
    const { clientWidth: dragW, clientHeight: dragH } = content.value
    const zoomW = areaW / dragW
    const zoomH = areaH / dragH
    zoom.value = Math.min(zoomW, zoomH)
}

// 缩小至容器大小（只缩小，不放大）
function zoomOutToWrap() {
    const { clientWidth: areaW, clientHeight: areaH } = wrap.value
    const { clientWidth: dragW, clientHeight: dragH } = content.value
    const zoomW = areaW / dragW
    const zoomH = areaH / dragH
    zoom.value = Math.min(zoomW, zoomH, zoom.value)
}

defineExpose({
    zoom,
    x,
    y,
    zoomToWrap,
    zoomOutToWrap,
})
</script>

<style lang="scss" scoped>
.wrap {
    position: relative;
    width: 100%;
    height: 100%;
    user-select: none;
    cursor: grab;
    &:active {
        cursor: grabbing;
    }
    >div {
        position: absolute;
        left: 50%;
        top: 50%;
    }
}
</style>