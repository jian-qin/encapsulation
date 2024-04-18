import Big from 'big.js'

/**
 * el-table合计函数
 * @param { object } params 参数
 * @param { { string: number | function } } params.labels 合计列的标题和对应的保留小数位数/格式化函数
 * @param { function | undefined } [ params.formatter ] 默认格式化函数
 * @param { string | undefined } [ params.title ] 总计标题
 * @param { string | undefined } [ params.other ] 其他列的值
 * @returns { function } 合计函数
 * @example
 *  <el-table
 *      :data="data"
 *      show-summary
 *      :summary-method="$tools.elTableSum({
 *          labels: {
 *              '数量': 0,
 *              '单价': 2,
 *              '总价': 2,
 *          }
 *      })"
 *  >
 *      <el-table-column label="数量" prop="count" />
 *      <el-table-column label="单价" prop="price" />
 *      <el-table-column label="总价" :formatter="row => row.count * row.price" />
 *  </el-table>
 */
export const elTableSum = (params) => ({ columns, data }) => {
    const {
        labels = {},
        formatter = elTableSum.defaultFormatter,
        title = '总计',
        other = '',
    } = params
    const labelsArr = Object.keys(labels)
    const sums = []
    columns.forEach((column, index) => {
        if (index === 0) {
            sums[index] = title
            return
        }
        sums[index] = other
        if (labelsArr.includes(column.label)) {
            const value = labels[column.label]
            const valueType = typeof value
            switch (valueType) {
                case 'function':
                    sums[index] = value(data, column)
                    break
                case 'number':
                    sums[index] = formatter(data, column, value)
                    break
                default:
                    // 其他类型返回原值
                    sums[index] = value
            }
        }
    })
    return sums
}
/**
 * el-table合计函数-默认格式化
 * @param { object } column 表格列
 * @param { object[] } data 表格数据
 * @param { number } float 保留小数位数
 * @returns { string } 合计值
 */
elTableSum.defaultFormatter = (data, column, float = 0) => {
    if (column.formatter) {
        return data.reduce(
            (pre, row) => pre.plus(column.formatter(row)),
            Big(0),
        ).toFixed(float)
    }
    const nums = data.map(
        item => Number(item[column.property]) || 0
    )
    const sum = nums.reduce(
        (total, num) => Big(total).plus(num),
        0,
    )
    return sum.toFixed(float)
}