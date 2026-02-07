import { notFound, redirect } from 'next/navigation'
import { getProjectById } from '@/lib/actions/project'
import { getMessagesByProjectId } from '@/lib/actions/message'
import { getCurrentUserId } from '@/lib/supabase-server'
import ChatPageClient from './chat-page-client'

interface PageProps {
    params: Promise<{
        id: string
    }>
}

/**
 * 动态路由聊天页面 - 服务端组件
 * 负责数据获取和权限验证
 * @param params - 路由参数，包含项目 ID
 */
export default async function ChatPage({ params }: PageProps) {
    const { id } = await params
    const userId = await getCurrentUserId()

    // 未登录时重定向到首页
    if (!userId) {
        redirect('/')
    }

    // 获取项目详情
    const project = await getProjectById(id)

    // 项目不存在时显示 404
    if (!project) {
        notFound()
    }

    // 获取历史消息
    const messages = await getMessagesByProjectId(id)

    // 转换消息格式以适配客户端组件
    const initialMessages = messages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        createdAt: m.created_at,
    }))

    return (
        <ChatPageClient
            projectId={id}
            projectName={project.name}
            initialCode={project.current_code || ''}
            initialMessages={initialMessages}
        />
    )
}
