import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase-server";

console.log("[DEBUG] API Route /api/publish loaded (File Load Time)");

/**
 * 发布项目 API
 * 将当前代码快照发布为公开分享链接
 * 
 * @param request - 包含 projectId 和 code 的 POST 请求
 * @returns 发布成功返回分享链接，失败返回错误信息
 */
export async function POST(request: NextRequest) {
    console.log("[DEBUG] POST /api/publish request received");
    try {
        const { projectId, code } = await request.json();

        // 验证必需参数
        if (!code) {
            return NextResponse.json(
                { error: "代码内容不能为空" },
                { status: 400 }
            );
        }

        // 获取当前用户会话
        const supabaseClient = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        // [DEBUG] Auth Logging
        if (authError || !user) {
            console.error("[API_DEBUG] Publish Auth Failed:", authError);
            const cookieStore = await cookies();
            const cookieNames = cookieStore.getAll().map(c => c.name);
            console.error("[API_DEBUG] Cookies present:", cookieNames);
            console.error("[API_DEBUG] Auth Error Details:", JSON.stringify(authError, null, 2));

            return NextResponse.json(
                { error: "请先登录 (Authorization Failed)" },
                { status: 401 }
            );
        }

        const userId = user.id;
        console.log(`[API_DEBUG] User Authenticated: ${userId}`);

        // 创建 Supabase 客户端 (使用 service role key 绕过 RLS)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Supabase 配置缺失");
            return NextResponse.json(
                { error: "服务器配置错误" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 生成唯一的 share_token (32 字符十六进制)
        const shareToken = randomBytes(16).toString("hex");

        // 如果没有 projectId，创建一个默认项目
        let finalProjectId = projectId;

        // [Safety Check] 如果传递了 projectId，验证其是否存在且属于该用户
        if (finalProjectId) {
            const { data: projectCheck, error: checkError } = await supabase
                .from("projects")
                .select("id")
                .eq("id", finalProjectId)
                .eq("user_id", userId)
                .single();

            if (checkError || !projectCheck) {
                console.warn(`[API_WARN] Project ID ${finalProjectId} invalid or not owned by user. Creating new project instead.`);
                console.warn(`[API_WARN] Check Error:`, checkError);
                finalProjectId = null; // Reset to null to trigger creation
            } else {
                console.log(`[API_DEBUG] Project ID ${finalProjectId} validated.`);
            }
        }

        if (!finalProjectId) {
            const { data: newProject, error: projectError } = await supabase
                .from("projects")
                .insert({
                    user_id: userId,
                    name: "Published Project",
                    current_code: code,
                    status: "published",
                })
                .select("id")
                .single();

            if (projectError) {
                console.error("创建项目失败:", projectError);
                return NextResponse.json(
                    { error: "创建项目失败" },
                    { status: 500 }
                );
            }
            finalProjectId = newProject.id;
        }

        // 插入 deployment 记录
        const { data: deployment, error: deploymentError } = await supabase
            .from("deployments")
            .insert({
                project_id: finalProjectId,
                user_id: userId,
                share_token: shareToken,
                snapshot_code: code,
                is_active: true,
            })
            .select()
            .single();

        if (deploymentError) {
            console.error("创建部署记录失败:", deploymentError);
            return NextResponse.json(
                { error: "发布失败，请重试" },
                { status: 500 }
            );
        }

        // 构建分享链接
        const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const shareUrl = `${origin}/share/${shareToken}`;

        return NextResponse.json({
            success: true,
            shareUrl,
            token: shareToken,
            deploymentId: deployment.id,
        });

    } catch (error) {
        console.error("发布接口错误:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}
