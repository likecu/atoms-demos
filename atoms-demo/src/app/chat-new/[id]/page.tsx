import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ChatNewClient from './chat-new-client'

/**
 * Chat-New 页面 - 服务端组件
 * 
 * 功能：
 * - 验证用户登录状态
 * - 加载项目信息和历史消息
 * - 渲染客户端聊天组件
 * 
 * @param params - 路由参数，包含项目 ID
 */
export default async function ChatNewPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // 1. 验证用户登录状态
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/auth/login')
    }

    // 2. 查询项目信息
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, current_code, user_id')
        .eq('id', id)
        .single()

    // 3. 验证项目存在且属于当前用户
    if (projectError || !project) {
        notFound()
    }

    if (project.user_id !== user.id) {
        redirect('/dashboard')
    }

    // 4. 查询历史消息（按时间升序）
    const { data: messages } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('project_id', id)
        .order('created_at', { ascending: true })

    // 5. 格式化消息为 Vercel AI SDK 格式
    const initialMessages = (messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
    }))

    return (
        <ChatNewClient
            projectId={id}
            projectName={project.name}
            initialCode={project.current_code || ''}
            initialMessages={initialMessages}
        />
    )
}
