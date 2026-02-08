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

        // 递归读取目录中的所有文件
        async function getFilesRecursively(dir: string, baseDir: string): Promise<Record<string, string>> {
            const files: Record<string, string> = {}
            const entries = await fs.readdir(dir, { withFileTypes: true })

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)
                const relativePath = path.relative(baseDir, fullPath)

                // 忽略 node_modules 和 .git
                if (entry.isDirectory()) {
                    if (entry.name !== 'node_modules' && entry.name !== '.git') {
                        const subFiles = await getFilesRecursively(fullPath, baseDir)
                        Object.assign(files, subFiles)
                    }
                } else {
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8')
                        // 统一使用正斜杠路径
                        const normalizedPath = relativePath.split(path.sep).join('/')
                        files[normalizedPath] = content
                    } catch (error) {
                        // 忽略读取错误
                    }
                }
            }
            return files
        }

        const files = await getFilesRecursively(workspacePath, workspacePath)

        // 确定入口文件和项目类型
        let entryFile: string | null = null
        let projectType: 'html' | 'react' | null = null

        // 1. 优先检查 package.json 中的依赖
        if (files['package.json']) {
            try {
                const pkg = JSON.parse(files['package.json'])
                if (pkg.dependencies && (pkg.dependencies.react || pkg.dependencies.next)) {
                    projectType = 'react'
                }
            } catch (e) {
                // package.json 解析失败，忽略
            }
        }

        // 2. 如果没确定，检查文件扩展名
        if (!projectType) {
            // Check for Babel/React in index.html - signifies a "bundled-in-browser" app
            if (files['index.html']) {
                const html = files['index.html'];
                if (html.includes('babel.min.js') || html.includes('react.development.js') || html.includes('react.production.min.js')) {
                    projectType = 'html';
                    console.log('Detected Babel/React Standalone in index.html -> html mode');
                }
            }

            // Only if NOT standalone HTML, check for JSX files
            if (!projectType) {
                const hasReactFiles = Object.keys(files).some(f =>
                    f.endsWith('.jsx') || f.endsWith('.tsx')
                )
                if (hasReactFiles) {
                    projectType = 'react'
                } else if (files['index.html']) {
                    projectType = 'html'
                }
            }
        }

        // 3. 确定入口文件
        if (projectType === 'react') {
            // 查找常见的 React 入口
            const reactEntries = [
                'src/main.tsx', 'src/main.jsx',
                'src/index.tsx', 'src/index.jsx',
                'index.tsx', 'index.jsx',
                'src/App.tsx', 'src/App.jsx',
                'App.tsx', 'App.jsx'
            ]
            for (const entry of reactEntries) {
                if (files[entry]) {
                    entryFile = entry
                    break
                }
            }
        } else if (projectType === 'html') {
            if (files['index.html']) {
                entryFile = 'index.html'
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
