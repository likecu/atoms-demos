'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Project, getProjectById, updateProjectCode } from '@/lib/actions/project'
import { Message as DbMessage, getMessagesByProjectId, saveMessage } from '@/lib/actions/message'

interface ProjectContextType {
    projectId: string
    project: Project | null
    loading: boolean
    messages: DbMessage[]
    refreshProject: () => Promise<void>
    refreshMessages: () => Promise<void>
    saveNewMessage: (role: 'user' | 'assistant' | 'system', content: string) => Promise<void>
    updateCode: (code: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

interface ProjectProviderProps {
    projectId: string
    children: React.ReactNode
}

/**
 * 项目上下文 Provider
 * 提供当前项目数据和操作方法
 * @param projectId - 项目 ID
 * @param children - 子组件
 */
export function ProjectProvider({ projectId, children }: ProjectProviderProps) {
    const [project, setProject] = useState<Project | null>(null)
    const [messages, setMessages] = useState<DbMessage[]>([])
    const [loading, setLoading] = useState(true)

    /**
     * 刷新项目数据
     */
    const refreshProject = useCallback(async () => {
        const data = await getProjectById(projectId)
        setProject(data)
    }, [projectId])

    /**
     * 刷新消息列表
     */
    const refreshMessages = useCallback(async () => {
        const data = await getMessagesByProjectId(projectId)
        setMessages(data)
    }, [projectId])

    /**
     * 保存新消息
     * @param role - 消息角色
     * @param content - 消息内容
     */
    const saveNewMessage = useCallback(async (
        role: 'user' | 'assistant' | 'system',
        content: string
    ) => {
        await saveMessage(projectId, role, content)
    }, [projectId])

    /**
     * 更新项目代码
     * @param code - 新代码
     */
    const updateCode = useCallback(async (code: string) => {
        await updateProjectCode(projectId, code)
        // 本地更新
        setProject(prev => prev ? { ...prev, current_code: code } : null)
    }, [projectId])

    // 初始加载
    useEffect(() => {
        const load = async () => {
            setLoading(true)
            await Promise.all([refreshProject(), refreshMessages()])
            setLoading(false)
        }
        load()
    }, [refreshProject, refreshMessages])

    return (
        <ProjectContext.Provider
            value={{
                projectId,
                project,
                loading,
                messages,
                refreshProject,
                refreshMessages,
                saveNewMessage,
                updateCode,
            }}
        >
            {children}
        </ProjectContext.Provider>
    )
}

/**
 * 使用项目上下文的 Hook
 * @returns 项目上下文
 * @throws 在 ProjectProvider 外部使用时抛出错误
 */
export function useProject() {
    const context = useContext(ProjectContext)
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider')
    }
    return context
}
