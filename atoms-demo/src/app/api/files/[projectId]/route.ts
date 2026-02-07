import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'
import { getProjectFiles } from '@/lib/actions/files'

/**
 * 获取项目的文件列表
 * GET /api/files/[projectId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const subPath = searchParams.get('path') || ''

    const supabase = await createServerSupabaseClient()

    // 验证用户登录状态
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: '未登录或登录已过期' },
        { status: 401 }
      )
    }

    // 验证项目归属
    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== user.id) {
      return NextResponse.json(
        { error: '无权访问此项目' },
        { status: 403 }
      )
    }

    // 获取文件列表
    const files = await getProjectFiles(projectId, subPath)

    return NextResponse.json({
      projectId,
      path: subPath,
      files
    }, { status: 200 })

  } catch (err) {
    console.error('获取文件列表异常:', err)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
