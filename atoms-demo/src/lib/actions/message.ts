'use server'

import { createServerSupabaseClient, getCurrentUserId } from '../supabase-server'

/**
 * 消息接口定义
 */
export interface Message {
    id: string
    project_id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    agent_name: string | null
    status: 'pending' | 'processing' | 'completed' | 'error'
    created_at: string
}

/**
 * AI 调用日志接口定义
 */
export interface AICallLog {
    id: string
    message_id: string | null
    project_id: string
    step_type: 'thinking' | 'tool_call' | 'tool_result' | 'output'
    content: string | null
    metadata: any
    created_at: string
}

/**
 * 获取项目的所有消息
 * @param projectId - 项目 ID
 * @returns 消息列表，按创建时间正序排列
 */
export async function getMessagesByProjectId(projectId: string): Promise<Message[]> {
    const userId = await getCurrentUserId()
    if (!userId) {
        return []
    }

    const supabase = await createServerSupabaseClient()

    // 首先验证项目属于当前用户
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()

    if (!project) {
        return []
    }

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('获取消息列表失败:', error)
        return []
    }

    return data as Message[]
}

/**
 * 保存消息到数据库
 * @param projectId - 项目 ID
 * @param role - 消息角色
 * @param content - 消息内容
 * @returns 新创建的消息 ID
 */
export async function saveMessage(
    projectId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
): Promise<string | null> {
    const userId = await getCurrentUserId()
    if (!userId) {
        return null
    }

    const supabase = await createServerSupabaseClient()

    // 首先验证项目属于当前用户
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()

    if (!project) {
        return null
    }

    const { data, error } = await supabase
        .from('messages')
        .insert({
            project_id: projectId,
            role,
            content,
            status: 'completed',
        })
        .select('id')
        .single()

    if (error) {
        console.error('保存消息失败:', error)
        return null
    }

    // 更新项目的 updated_at
    await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId)

    return data.id
}

/**
 * 批量保存消息到数据库
 * @param projectId - 项目 ID
 * @param messages - 消息数组 [{role, content}]
 */
export async function saveMessages(
    projectId: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<void> {
    const userId = await getCurrentUserId()
    if (!userId || messages.length === 0) {
        return
    }

    const supabase = await createServerSupabaseClient()

    // 首先验证项目属于当前用户
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()

    if (!project) {
        return
    }

    const messagesToInsert = messages.map(msg => ({
        project_id: projectId,
        role: msg.role,
        content: msg.content,
        status: 'completed' as const,
    }))

    const { error } = await supabase
        .from('messages')
        .insert(messagesToInsert)

    if (error) {
        console.error('批量保存消息失败:', error)
    }

    // 更新项目的 updated_at
    await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId)
}

/**
 * 保存 AI 条用日志
 * @param log - 日志对象
 */
export async function saveAICallLog(log: Omit<AICallLog, 'id' | 'created_at'>): Promise<void> {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
        .from('ai_call_logs')
        .insert(log)

    if (error) {
        console.error('保存 AI 调用日志失败:', error)
    }
}

/**
 * 获取项目最新的 AI 调用日志
 * @param projectId - 项目 ID
 * @returns 日志列表
 */
export async function getAICallLogsByProjectId(projectId: string): Promise<AICallLog[]> {
    const supabase = await createServerSupabaseClient()

    // 1. 先获取该项目的最后一条用户消息 ID
    const { data: lastMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('project_id', projectId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (!lastMessage) return []

    // 2. 获取与该消息关联的所有日志，或者该消息之后的所有日志
    const { data, error } = await supabase
        .from('ai_call_logs')
        .select('*')
        .eq('project_id', projectId)
        .eq('message_id', lastMessage.id)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('获取 AI 调用日志失败:', error)
        return []
    }

    return data as AICallLog[]
}
