import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getCurrentUserId } from '@/lib/supabase-server'
import { getProjectById } from '@/lib/actions/project'

/**
 * 预览 API 路由
 * 从工作区文件系统读取项目文件以供预览
 */
export async function GET(request: NextRequest) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('projectId')

        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
        }

        // 验证项目所有权
        const project = await getProjectById(projectId)
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // 构建工作区路径
        const workspaceRoot = process.env.WORKSPACE_ROOT || '/tmp/workspaces'
        const workspacePath = path.join(workspaceRoot, projectId)

        // 检查工作区是否存在
        try {
            await fs.access(workspacePath)
        } catch {
            return NextResponse.json({
                files: {},
                entryFile: null,
                projectType: null,
                isEmpty: true
            })
        }

        // 扫描工作区文件
        const files: Record<string, string> = {}
        let entryFile: string | null = null
        let projectType: 'html' | 'react' | null = null

        // 定义要扫描的文件模式
        const filePatterns = [
            'index.html',
            'index.jsx',
            'index.tsx',
            'App.jsx',
            'App.tsx',
            'src/index.jsx',
            'src/index.tsx',
            'src/App.jsx',
            'src/App.tsx',
            'package.json',
            'README.md'
        ]

        // 读取文件
        for (const pattern of filePatterns) {
            const filePath = path.join(workspacePath, pattern)
            try {
                const content = await fs.readFile(filePath, 'utf-8')
                files[pattern] = content

                // 确定入口文件和项目类型
                if (!entryFile) {
                    if (pattern === 'index.html') {
                        entryFile = 'index.html'
                        projectType = 'html'
                    } else if (pattern.includes('index.jsx') || pattern.includes('index.tsx')) {
                        entryFile = pattern
                        projectType = 'react'
                    } else if (pattern.includes('App.jsx') || pattern.includes('App.tsx')) {
                        entryFile = pattern
                        projectType = 'react'
                    }
                }
            } catch (error) {
                // 文件不存在，跳过
                continue
            }
        }

        // 如果找到了 HTML 文件，尝试读取相关的 JS/JSX 文件
        if (projectType === 'html' && files['index.html']) {
            const htmlContent = files['index.html']
            // 提取 script src 引用
            const scriptMatches = htmlContent.match(/src="([^"]+\.jsx?)"/g)
            if (scriptMatches) {
                for (const match of scriptMatches) {
                    const srcPath = match.match(/src="([^"]+)"/)?.[1]
                    if (srcPath) {
                        const scriptPath = path.join(workspacePath, srcPath)
                        try {
                            const scriptContent = await fs.readFile(scriptPath, 'utf-8')
                            files[srcPath] = scriptContent
                        } catch {
                            // 忽略读取失败
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            files,
            entryFile,
            projectType: projectType as 'html' | 'react' | null,
            isEmpty: Object.keys(files).length === 0
        })

    } catch (error) {
        console.error('[Preview API] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
