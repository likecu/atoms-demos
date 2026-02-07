import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/supabase-server";
import LandingPage from "@/components/landing/landing-page";

/**
 * 首页 - 服务端组件
 * 已登录用户重定向到 Dashboard，未登录用户显示 Landing Page
 */
export default async function Home() {
  const userId = await getCurrentUserId();

  if (userId) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
