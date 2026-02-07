import { redirect } from 'next/navigation'
import { getProjects, deleteProject, createProject } from '@/lib/actions/project'
import { getCurrentUserId } from '@/lib/supabase-server'
import DashboardClient from './dashboard-client'

/**
 * Dashboard 页面 - 服务端组件
 * 显示用户的所有项目列表
 */
export default async function DashboardPage() {
    const userId = await getCurrentUserId()

    // 未登录时重定向到首页
    if (!userId) {
        redirect('/')
    }

    const projects = await getProjects()

    return <DashboardClient initialProjects={projects} />
}
