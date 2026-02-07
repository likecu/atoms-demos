import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import SharePreview from "@/components/preview/share-preview";
import { Metadata } from "next";

interface SharePageProps {
    params: Promise<{
        token: string;
    }>;
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
        .select("snapshot_code, is_active, view_count")
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
 * 只显示纯净的预览结果
 */
export default async function SharePage({ params }: SharePageProps) {
    const { token } = await params;

    const deployment = await getDeployment(token);

    if (!deployment) {
        notFound();
    }

    return <SharePreview code={deployment.snapshot_code} />;
}
