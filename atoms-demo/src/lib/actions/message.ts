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
