'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Project, createProject, deleteProject } from '@/lib/actions/project'
import ProjectCard from '@/components/dashboard/project-card'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles } from 'lucide-react'
import UserMenu from '@/components/layout/user-menu'

interface DashboardClientProps {
    initialProjects: Project[]
}

/**
 * Dashboard 客户端组件
 * 处理项目列表的交互逻辑
 * @param initialProjects - 初始项目列表
 */
export default function DashboardClient({ initialProjects }: DashboardClientProps) {
    const [projects, setProjects] = useState(initialProjects)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    /**
     * 创建新项目并跳转
     */
    const handleCreateProject = () => {
        startTransition(async () => {
            const projectId = await createProject()
            router.push(`/chat/${projectId}`)
        })
    }

    /**
     * 删除项目
     * @param id - 项目 ID
     */
    const handleDeleteProject = (id: string) => {
        if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) {
            return
        }

        startTransition(async () => {
            await deleteProject(id)
            setProjects(projects.filter(p => p.id !== id))
        })
    }



    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-indigo-50/30">
            {/* 顶部导航 */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-zinc-100">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-zinc-900">Atoms Demo</span>
                    </div>

                    <UserMenu />
                </div>
            </header>

            {/* 主内容区 */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* 页面标题和操作 */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900">我的项目</h1>
                        <p className="text-zinc-500 mt-1">
                            管理你的 AI 生成项目
                        </p>
                    </div>

                    <Button
                        onClick={handleCreateProject}
                        disabled={isPending}
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-200 px-6"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {isPending ? '创建中...' : '新建项目'}
                    </Button>
                </div>

                {/* 项目列表 */}
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-zinc-100 rounded-3xl flex items-center justify-center mb-6">
                            <Sparkles className="w-12 h-12 text-zinc-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-zinc-900 mb-2">
                            还没有任何项目
                        </h2>
                        <p className="text-zinc-500 mb-6 max-w-md">
                            点击上方的"新建项目"按钮，开始使用 AI 生成你的第一个应用
                        </p>
                        <Button
                            onClick={handleCreateProject}
                            disabled={isPending}
                            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            创建第一个项目
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onDelete={handleDeleteProject}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
