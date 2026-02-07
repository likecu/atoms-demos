'use server'

import { createServerSupabaseClient, getCurrentUserId } from '../supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * 项目接口定义
 */
export interface Project {
    id: string
    user_id: string
    name: string
    description: string | null
    current_code: string
    prompt_history: unknown[]
    status: 'draft' | 'generating' | 'published'
    created_at: string
    updated_at: string
}

/**
 * 获取当前用户的所有项目
 * @returns 项目列表，按更新时间倒序排列
 * @throws 用户未登录时抛出错误
 */
export async function getProjects(): Promise<Project[]> {
    const userId = await getCurrentUserId()
    if (!userId) {
        return []
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('获取项目列表失败:', error)
        return []
    }

    return data as Project[]
}

/**
 * 根据 ID 获取单个项目
 * @param id - 项目 ID
 * @returns 项目详情，不存在时返回 null
 */
export async function getProjectById(id: string): Promise<Project | null> {
    const userId = await getCurrentUserId()
    if (!userId) {
        return null
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

    if (error) {
        console.error('获取项目详情失败:', error)
        return null
    }

    return data as Project
}

/**
 * 创建新项目
 * @param name - 项目名称，默认为 "Untitled Project"
 * @returns 新创建的项目 ID
 * @throws 用户未登录时重定向到首页
 */
export async function createProject(name: string = 'Untitled Project'): Promise<string> {
    const userId = await getCurrentUserId()
    if (!userId) {
        redirect('/')
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
        .from('projects')
        .insert({
            user_id: userId,
            name,
            current_code: '',
            prompt_history: [],
            status: 'draft',
        })
        .select('id')
        .single()

    if (error) {
        // 自动修复：如果是由外键约束导致的（用户在 Auth 中存在但在 public.users 中不存在）
        if (error.code === '23503' && error.message.includes('projects_user_id_fkey')) {
            console.log('检测到用户数据缺失，尝试在创建项目时自动修复:', userId)

            // 获取用户详细信息
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'
                const checkEmail = user.email || `${username}@atoms.demo`

                // 插入缺失的用户记录
                const { error: healError } = await supabase
                    .from('users')
                    .insert({
                        id: userId,
                        username: username,
                        password: 'managed_by_supabase_auth', // 占位符
                        email: checkEmail,
                        avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })

                if (healError) {
                    console.error('自动修复用户数据失败:', healError)
                    throw new Error(`创建项目失败: 用户数据同步失败 - ${healError.message}`)
                }

                console.log('自动修复用户数据成功，重试创建项目...')

                // 重试创建项目
                const { data: retryData, error: retryError } = await supabase
                    .from('projects')
                    .insert({
                        user_id: userId,
                        name,
                        current_code: '',
                        prompt_history: [],
                        status: 'draft',
                    })
                    .select('id')
                    .single()

                if (retryError) {
                    console.error('重试创建项目失败:', retryError)
                    throw new Error(`创建项目失败: ${retryError.message}`)
                }

                revalidatePath('/dashboard')
                return retryData.id
            }
        }

        console.error('创建项目失败:', error)
        throw new Error(`创建项目失败: ${error.message}`)
    }

    revalidatePath('/dashboard')
    return data.id
}

/**
 * 更新项目的代码内容
 * @param id - 项目 ID
 * @param code - 新的代码内容
 */
export async function updateProjectCode(id: string, code: string): Promise<void> {
    const userId = await getCurrentUserId()
    if (!userId) {
        return
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
        .from('projects')
        .update({ current_code: code })
        .eq('id', id)
        .eq('user_id', userId)

    if (error) {
        console.error('更新项目代码失败:', error)
    }
}

/**
 * 更新项目名称
 * @param id - 项目 ID
 * @param name - 新的项目名称
 */
export async function updateProjectName(id: string, name: string): Promise<void> {
    const userId = await getCurrentUserId()
    if (!userId) {
        return
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
        .from('projects')
        .update({ name })
        .eq('id', id)
        .eq('user_id', userId)

    if (error) {
        console.error('更新项目名称失败:', error)
    }

    revalidatePath('/dashboard')
}

/**
 * 删除项目
 * @param id - 项目 ID
 */
export async function deleteProject(id: string): Promise<void> {
    const userId = await getCurrentUserId()
    if (!userId) {
        return
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) {
        console.error('删除项目失败:', error)
    }

    revalidatePath('/dashboard')
}
