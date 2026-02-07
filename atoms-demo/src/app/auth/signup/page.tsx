"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { signupSchema, type SignupFormData } from "@/lib/auth-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 注册页面组件
 * 提供用户名/密码注册功能
 */
export default function SignupPage() {
    const router = useRouter();
    const { register: registerUser } = useAuth();
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    /**
     * 处理注册表单提交
     * @param data - 表单数据
     */
    const onSubmit = async (data: SignupFormData) => {
        setError("");
        setIsLoading(true);

        try {
            await registerUser(data.username, data.password);
            router.push("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "注册失败");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
            {/* 头部 */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-4">
                    <UserPlus className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">创建账号</h1>
                <p className="text-white/60 mt-2">注册一个账号开始使用 Atoms Demo</p>
            </div>

            {/* 注册表单 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        用户名
                    </label>
                    <Input
                        type="text"
                        placeholder="3-20个字符，字母数字下划线"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                        disabled={isLoading}
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
                        placeholder="至少6个字符"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                        disabled={isLoading}
                        {...register("password")}
                    />
                    {errors.password && (
                        <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        确认密码
                    </label>
                    <Input
                        type="password"
                        placeholder="再次输入密码"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                        disabled={isLoading}
                        {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
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
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            注册中...
                        </>
                    ) : (
                        "注册"
                    )}
                </Button>
            </form>

            {/* 登录链接 */}
            <p className="mt-6 text-center text-sm text-white/60">
                已有账号？{" "}
                <Link
                    href="/auth/login"
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                    立即登录
                </Link>
            </p>
        </div>
    );
}
