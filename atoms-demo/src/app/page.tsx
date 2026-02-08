import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/supabase-server";
import LandingPage from "@/components/landing/landing-page";

/**
 * 首页 - 服务端组件
 * 已登录用户重定向到 Dashboard，未登录用户显示 Landing Page
 */
export default async function Home() {
  try {
    const userId = await getCurrentUserId();

    if (userId) {
      redirect("/dashboard");
    }
  } catch (error) {
    console.error("Error in Home page:", error);
    // Fallback to landing page if auth check fails, or show error
  }

  return <LandingPage />;
}
