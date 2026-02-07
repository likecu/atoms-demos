import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 }
      )
    }

    // 获取用户详细信息
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: userData?.username || user.user_metadata?.username,
        avatar_url: userData?.avatar_url || user.user_metadata?.avatar_url,
      }
    }, { status: 200 })

  } catch (err) {
    console.error('获取用户信息异常:', err)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
