import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import SharePreview from "@/components/preview/share-preview";
import ShareWithChat from "@/components/preview/share-with-chat";
import { Metadata } from "next";

/**
 * 页面属性接口
 */
interface SharePageProps {
    params: Promise<{
        token: string;
    }>;
    searchParams: Promise<{
        mode?: string;
    }>;
}

/**
 * 消息类型定义
 */
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

/**
 * 获取部署记录
 * 通过 share_token 查询对应的代码快照
 * 
 * @param token - 分享 token
 * @returns 部署记录或 null
 */
async function getDeployment(token: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase 配置缺失");
        return null;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
        .from("deployments")
        .select("snapshot_code, is_active, view_count, project_id")
        .eq("share_token", token)
        .single();

    if (error || !data) {
        console.error("查询部署记录失败:", error);
        return null;
    }

    // 如果部署已停用，返回 null
    if (!data.is_active) {
        return null;
    }

    // 更新访问计数
    await supabase
        .from("deployments")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("share_token", token);

    return data;
}

/**
 * 获取项目对话历史
 * 
 * @param projectId - 项目ID
 * @returns 消息列表
 */
async function getMessages(projectId: string): Promise<Message[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase 配置缺失");
        return [];
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("project_id", projectId)
        .neq("role", "system") // 不显示系统消息
        .order("created_at", { ascending: true });

    if (error) {
        console.error("查询消息失败:", error);
        return [];
    }

    return (data || []) as Message[];
}

/**
 * 生成页面元数据
 */
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
    return {
        title: "Atoms Demo - 分享的网页",
        description: "使用 Atoms Demo 创建的网页预览",
    };
}

/**
 * 分享页面组件
 * 公开访问，不需要登录
 * 支持两种模式:
 * - 默认: 只显示纯净的预览结果
 * - ?mode=chat: 显示对话历史+预览
 */
export default async function SharePage({ params, searchParams }: SharePageProps) {
    const { token } = await params;
    const { mode } = await searchParams;

    const deployment = await getDeployment(token);

    if (!deployment) {
        notFound();
    }

    // 如果是对话模式,获取消息历史
    if (mode === "chat" && deployment.project_id) {
        const messages = await getMessages(deployment.project_id);
        return <ShareWithChat code={deployment.snapshot_code} messages={messages} />;
    }

    // 默认纯预览模式
    return <SharePreview code={deployment.snapshot_code} />;
}
