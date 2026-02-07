
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 创建服务端 Supabase 客户端
 * 用于 Server Components 和 Server Actions
 * @returns Supabase 客户端实例
 */
export async function createServerSupabaseClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch {
                        // Server Component 中无法设置 Cookie，忽略错误
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch {
                        // Server Component 中无法删除 Cookie，忽略错误
                    }
                },
            },
        }
    )
}

/**
 * 创建 Service Role 客户端 (无需 Cookie，拥有管理员权限)
 * 用于后台任务和脚本
 */
export function createServiceRoleClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * 获取当前登录用户的 ID
 * @returns 用户 ID，未登录时返回 null
 */
export async function getCurrentUserId(): Promise<string | null> {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
}
