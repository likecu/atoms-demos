'use client'

import { Project, updateProjectName } from '@/lib/actions/project'
import { formatDistanceToNow } from '@/lib/date-utils'
import { FolderOpen, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

interface ProjectCardProps {
    project: Project
    onDelete?: (id: string) => void
    onRename?: (id: string, name: string) => void
}

/**
 * 项目卡片组件
 * 显示项目名称、状态、更新时间，点击进入聊天页面
 * @param project - 项目数据
 * @param onDelete - 删除回调函数
 * @param onRename - 重命名回调函数
 */
export default function ProjectCard({ project, onDelete, onRename }: ProjectCardProps) {
    const [showMenu, setShowMenu] = useState(false)
    const [showRenameDialog, setShowRenameDialog] = useState(false)
    const [newName, setNewName] = useState(project.name)
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()
    const router = useRouter()

    const statusColors = {
        draft: 'bg-amber-100 text-amber-700',
        generating: 'bg-blue-100 text-blue-700',
        published: 'bg-green-100 text-green-700',
    }

    const statusLabels = {
        draft: '草稿',
        generating: '生成中',
        published: '已发布',
    }

    /**
     * 处理重命名逻辑
     */
    const handleRename = () => {
        if (!newName.trim() || newName === project.name) return

        startTransition(async () => {
            try {
                await updateProjectName(project.id, newName.trim())
                onRename?.(project.id, newName.trim())
                router.refresh()
                setShowRenameDialog(false)
                toast.success('项目重命名成功')
            } catch (error) {
                console.error('重命名失败:', error)
                toast.error('重命名失败，请稍后重试')
            }
        })
    }

    return (
        <div className="group relative bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 overflow-hidden">
            {/* 项目预览区域 */}
            <Link href={`/chat/${project.id}`}>
                <div className="h-40 bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                        <FolderOpen className="w-10 h-10 text-white" />
                    </div>
                </div>
            </Link>

            {/* 项目信息 */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <Link href={`/chat/${project.id}`} className="flex-1 min-w-0">
                        <h3 className="font-semibold text-zinc-900 truncate hover:text-indigo-600 transition-colors">
                            {project.name}
                        </h3>
                    </Link>

                    {/* 更多操作按钮 */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <MoreVertical className="w-4 h-4" />
                        </Button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-20">
                                    <button
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-zinc-50 flex items-center gap-2"
                                        onClick={() => {
                                            setShowMenu(false)
                                            setShowRenameDialog(true)
                                        }}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        重命名
                                    </button>
                                    <button
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                                        onClick={() => {
                                            setShowMenu(false)
                                            onDelete?.(project.id)
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        删除
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 描述 */}
                {project.description && (
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                        {project.description}
                    </p>
                )}

                {/* 底部信息 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                    </span>
                    <span className="text-xs text-zinc-400">
                        {formatDistanceToNow(project.updated_at)}
                    </span>
                </div>
            </div>

            {/* 重命名对话框 */}
            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>重命名项目</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="请输入新项目名称"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRename()
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                            取消
                        </Button>
                        <Button
                            onClick={handleRename}
                            disabled={isPending || !newName.trim() || newName === project.name}
                        >
                            {isPending ? '保存中...' : '确定'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
