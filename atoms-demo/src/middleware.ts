import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 需要登录才能访问的路由前缀
 */
const PROTECTED_ROUTES = ["/dashboard", "/chat"];

/**
 * 认证相关页面（已登录用户重定向到首页）
 */
const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

/**
 * 公开访问的路由（不需要任何认证检查）
 */
const PUBLIC_ROUTES = ["/share"];

/**
 * Next.js 中间件
 * 处理路由保护和认证状态检查
 * @param request - 请求对象
 * @returns 重定向响应或继续请求
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 检查是否是公开路由（如分享页面）
    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    // 公开路由直接放行
    if (isPublicRoute) {
        return NextResponse.next({ request });
    }

    // 检查 Supabase 配置是否存在
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 如果 Supabase 未配置，跳过认证检查
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase 配置缺失，跳过认证检查");
        return NextResponse.next({ request });
    }

    let response = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // 获取当前用户
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 检查是否是受保护的路由
    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    // 检查是否是认证页面
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

    // 未登录用户访问受保护路由 -> 重定向到登录页
    if (isProtectedRoute && !user) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 已登录用户访问认证页面 -> 重定向到首页
    if (isAuthRoute && user) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
}

/**
 * 中间件匹配配置
 * 排除静态资源和 API 路由
 */
export const config = {
    matcher: [
        /*
         * 匹配所有路径除了:
         * - _next/static (静态资源)
         * - _next/image (图片优化)
         * - favicon.ico (网站图标)
         * - public 文件夹
         * - api 路由（API 有自己的认证逻辑）
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
    ],
};

