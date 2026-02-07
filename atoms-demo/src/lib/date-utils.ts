/**
 * 日期工具函数
 */

/**
 * 将日期转换为相对时间描述
 * @param dateString - ISO 日期字符串
 * @returns 相对时间描述，如"1小时前"、"3天前"
 */
export function formatDistanceToNow(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffSecs < 60) {
        return '刚刚'
    } else if (diffMins < 60) {
        return `${diffMins}分钟前`
    } else if (diffHours < 24) {
        return `${diffHours}小时前`
    } else if (diffDays < 7) {
        return `${diffDays}天前`
    } else if (diffWeeks < 4) {
        return `${diffWeeks}周前`
    } else if (diffMonths < 12) {
        return `${diffMonths}个月前`
    } else {
        return date.toLocaleDateString('zh-CN')
    }
}

/**
 * 格式化日期为本地字符串
 * @param dateString - ISO 日期字符串
 * @returns 本地化日期字符串
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

/**
 * 格式化日期和时间
 * @param dateString - ISO 日期字符串
 * @returns 本地化日期时间字符串
 */
export function formatDateTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}
