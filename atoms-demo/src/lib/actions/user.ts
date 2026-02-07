'use server'

import { createServerSupabaseClient, getCurrentUserId } from '../supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * 获取当前用户的 MCP 配置
 * @returns MCP 配置字符串，如果未设置则返回空字符串
 */
export async function getUserMcpConfig(): Promise<string> {
    const userId = await getCurrentUserId()
    if (!userId) {
        return ''
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
        .from('users')
        .select('mcp_config')
        .eq('id', userId)
        .single()

    if (error) {
        console.error('Failed to get user MCP config:', error)
        return ''
    }

    return data?.mcp_config || ''
}

/**
 * 更新当前用户的 MCP 配置
 * @param mcpConfig - 新的 MCP 配置字符串
 */
export async function updateUserMcpConfig(mcpConfig: string): Promise<void> {
    const userId = await getCurrentUserId()
    if (!userId) {
        throw new Error('User not logged in')
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
        .from('users')
        .update({ mcp_config: mcpConfig })
        .eq('id', userId)

    if (error) {
        console.error('Failed to update user MCP config:', error)
        throw new Error(`Failed to update settings: ${error.message}`)
    }

    revalidatePath('/settings')
}
