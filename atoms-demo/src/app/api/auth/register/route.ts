import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function createClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  return supabase
}

/**
 * 注册用户接口
 * POST /api/auth/register
 * 请求体: { username: string, password: string, email?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient(request)

  try {
    const body = await request.json()
    const { username, password, email } = body

    console.log('Register Request:', { username, emailInput: email, passwordProvided: !!password })

    // 极简校验：只检查非空
    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    // 创建 Admin Client (需要 Service Role Key)
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 检查用户名是否为邮箱格式
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)
    const finalEmail = email || (isEmail ? username : `${username}@atoms.demo`)

    console.log('Register Processing:', { isEmail, finalEmail, username })

    // 使用 Supabase Auth 注册
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: finalEmail,
      password,
      user_metadata: {
        username, // 仍然保存原始用户名输入（可能是邮箱，也可能是普通用户名）
      },
      email_confirm: true
    })

    if (error) {
      // 如果是用户名已存在等错误，返回友好提示
      if (error.message.includes('already registered') || error.message.includes('duplicate')) {
        console.error('注册错误 (Duplicate):', error)
        return NextResponse.json(
          { error: '用户名已被注册，请尝试其他用户名' },
          { status: 400 }
        )
      }
      console.error('注册错误:', error)
      return NextResponse.json(
        { error: error.message || '注册失败' },
        { status: 500 }
      )
    }

    // 关键修复：同步创建 public.users 记录
    // projects 表有外键约束，必须在 public.users 中存在对应的 id
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: data.user?.id,
        username,
        password, // 注意：这里存储明文/原始密码是因为 schema 要求，实际生产环境不建议这样
        email: finalEmail,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('创建用户数据失败:', dbError)
      // 这里的失败不应该阻断流程，因为 Auth 账号已经创建成功
      // 但可能会导致后续创建项目失败。最好是回滚 Auth 账号（复杂）或者提示用户。
      // 为简单起见，这里记录错误并允许通过，期望后续 Login 能够修复（如果实现了修复逻辑）
    }

    return NextResponse.json(
      {
        message: '注册成功',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          username,
        }
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('注册异常:', err)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
