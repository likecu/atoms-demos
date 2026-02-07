import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 创建项目
 * POST /api/projects
 * 请求体: { name: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: '项目名称不能为空' },
        { status: 400 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 }
      )
    }

    // 尝试直接创建项目
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name,
        current_code: '',
        prompt_history: [],
        status: 'draft',
      })
      .select('id, name, created_at')
      .single()

    if (error) {
      // 如果是由外键约束导致的错误，尝试修复用户数据
      if (error.code === '23503' && error.message.includes('projects_user_id_fkey')) {
        console.log('检测到用户数据缺失，尝试自动修复...')

        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'
        const userEmail = user.email || `${username}@atoms.demo`

        // 插入缺失的用户记录
        const { error: healError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            username: username,
            password: 'managed_by_supabase_auth',
            email: userEmail,
            avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (healError) {
          console.error('自动修复用户数据失败:', healError)
          return NextResponse.json(
            { error: '创建项目失败: 用户数据同步失败' },
            { status: 500 }
          )
        }

        console.log('自动修复用户数据成功，重试创建项目...')

        // 重试创建项目
        const { data: retryProject, error: retryError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: name,
            current_code: '',
            prompt_history: [],
            status: 'draft',
          })
          .select('id, name, created_at')
          .single()

        if (retryError) {
          console.error('重试创建项目失败:', retryError)
          return NextResponse.json(
            { error: `创建项目失败: ${retryError.message}` },
            { status: 500 }
          )
        }

        return NextResponse.json({
          message: '项目创建成功',
          project: retryProject
        }, { status: 201 })
      }

      console.error('创建项目失败:', error)
      return NextResponse.json(
        { error: `创建项目失败: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '项目创建成功',
      project: {
        id: project.id,
        name: project.name,
        created_at: project.created_at
      }
    }, { status: 201 })

  } catch (err) {
    console.error('创建项目异常:', err)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * 获取当前用户的所有项目
 * GET /api/projects
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 }
      )
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('获取项目列表失败:', error)
      return NextResponse.json(
        { error: '获取项目列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      projects: projects || []
    }, { status: 200 })

  } catch (err) {
    console.error('获取项目列表异常:', err)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
