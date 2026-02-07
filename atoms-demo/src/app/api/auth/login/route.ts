import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 登录接口
 * POST /api/auth/login
 * 请求体: { username: string, password: string }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
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
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  try {
    const body = await request.json()
    const { username, password } = body

    // 极简校验：只检查非空
    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    // 使用 Supabase Auth 登录
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username}@atoms.demo`,
      password,
    })

    if (error) {
      console.error('登录错误:', error)
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 检查并修复 public.users 数据（如果缺失）
    // 这是为了修复之前注册流程不完整导致的遗留数据
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user?.id)
      .single()

    if (!existingUser && data.user) {
      console.log('检测到用户数据缺失，尝试自动修复:', data.user.id)
      const { error: healError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          username,
          password, // 同样存储明文/原始密码以符合当前 schema
          email: `${username}@atoms.demo`,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (healError) {
        console.error('自动修复用户数据失败:', healError)
      } else {
        console.log('自动修复用户数据成功')
      }
    }

    // 获取用户元数据
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user?.id)
      .single()

    return NextResponse.json(
      {
        message: '登录成功',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          username: userData?.username || username,
        },
        session: {
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
        }
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('登录异常:', err)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
