"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn, User } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { loginSchema, type LoginFormData } from "@/lib/auth-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 登录页面组件
 * 提供用户名/密码登录和 Guest 快速登录功能
 */
export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGuestLoading, setIsGuestLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    /**
     * 处理登录表单提交
     * @param data - 表单数据
     */
    const onSubmit = async (data: LoginFormData) => {
        setError("");
        setIsLoading(true);

        try {
            await login(data.username, data.password);
            router.push("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "登录失败");
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Guest 快速登录
     * 使用预设的测试账号登录
     */
    const handleGuestLogin = async () => {
        setError("");
        setIsGuestLoading(true);

        try {
            await login("guest", "guest123");
            router.push("/");
        } catch (err) {
            setError("Guest 登录失败，请先注册一个 guest 账号");
        } finally {
            setIsGuestLoading(false);
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
            {/* 头部 */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-4">
                    <LogIn className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">欢迎回来</h1>
                <p className="text-white/60 mt-2">请登录以继续使用 Atoms Demo</p>
            </div>

            {/* 登录表单 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        用户名
                    </label>
                    <Input
                        type="text"
                        placeholder="请输入用户名"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                        disabled={isLoading || isGuestLoading}
                        {...register("username")}
                    />
                    {errors.username && (
                        <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        密码
                    </label>
                    <Input
                        type="password"
                        placeholder="请输入密码"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                        disabled={isLoading || isGuestLoading}
                        {...register("password")}
                    />
                    {errors.password && (
                        <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                    disabled={isLoading || isGuestLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            登录中...
                        </>
                    ) : (
                        "登录"
                    )}
                </Button>
            </form>

            {/* 分隔线 */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-white/40">或者</span>
                </div>
            </div>

            {/* Guest 登录 */}
            <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={handleGuestLogin}
                disabled={isLoading || isGuestLoading}
            >
                {isGuestLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登录中...
                    </>
                ) : (
                    <>
                        <User className="mr-2 h-4 w-4" />
                        以访客身份登录
                    </>
                )}
            </Button>

            {/* 注册链接 */}
            <p className="mt-6 text-center text-sm text-white/60">
                还没有账号？{" "}
                <Link
                    href="/auth/signup"
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                    立即注册
                </Link>
            </p>
        </div>
    );
}
