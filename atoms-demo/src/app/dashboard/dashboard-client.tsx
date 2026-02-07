'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Project, createProject, deleteProject } from '@/lib/actions/project'
import ProjectCard from '@/components/dashboard/project-card'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles } from 'lucide-react'
import UserMenu from '@/components/layout/user-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { label } from 'framer-motion/client' // 这里的导入可能有误，应该使用标准的 label 或不使用，改为用文本

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
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
    const [projectName, setProjectName] = useState('未命名项目')
    const router = useRouter()

    /**
     * 创建新项目并跳转
     */
    const handleCreateProject = () => {
        startTransition(async () => {
            const projectId = await createProject(projectName)
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



    /**
     * 重命名项目并更新本地状态
     * @param id - 项目 ID
     * @param newName - 新名称
     */
    const handleRenameProject = (id: string, newName: string) => {
        setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p))
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
                        onClick={() => setIsNameDialogOpen(true)}
                        disabled={isPending}
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-200 px-6"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        新建项目
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
                            onClick={() => setIsNameDialogOpen(true)}
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
                                onRename={handleRenameProject}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* 新建项目命名对话框 */}
            <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>新建项目</DialogTitle>
                        <DialogDescription>
                            给你的新项目取一个名字。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="name" className="text-right text-sm font-medium text-zinc-500">
                                名称
                            </label>
                            <Input
                                id="name"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                className="col-span-3"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateProject()
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsNameDialogOpen(false)}
                            disabled={isPending}
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleCreateProject}
                            disabled={isPending || !projectName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isPending ? '创建中...' : '确认创建'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
