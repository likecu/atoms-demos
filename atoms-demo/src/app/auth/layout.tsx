import React from "react";

/**
 * 认证页面通用布局
 * 提供居中容器和渐变背景
 * @param children - 页面内容
 */
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>

            {/* 内容容器 */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {children}
            </div>
        </div>
    );
}
