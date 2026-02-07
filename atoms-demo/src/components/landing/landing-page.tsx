'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, Mail, Lock, User, Github, Chrome } from 'lucide-react'

/**
 * Landing Page 组件
 * 显示登录/注册表单，未登录用户可以在这里进行认证
 */
export default function LandingPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { login, register } = useAuth()
    const router = useRouter()

    /**
     * 处理表单提交
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isLogin) {
                await login(username, password)
            } else {
                await register(username, password)
            }
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || '操作失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 flex items-center justify-center p-4">
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">

                {/* 左侧 Hero */}
                <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-600 to-violet-600 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-12">
                            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight">Atoms Demo</span>
                        </div>

                        <h1 className="text-5xl font-extrabold leading-tight mb-6">
                            Build your next <br />idea, <span className="text-indigo-200">faster.</span>
                        </h1>
                        <p className="text-indigo-100 text-lg max-w-md leading-relaxed">
                            使用 AI 快速生成 React 组件，实时预览你的创意。
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <div className="flex -space-x-3 mb-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 w-10 rounded-full border-2 border-indigo-600 bg-gradient-to-br from-indigo-300 to-violet-300" />
                            ))}
                        </div>
                        <p className="text-sm text-indigo-200">AI 驱动的下一代开发体验</p>
                    </div>

                    {/* 装饰性背景 */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl" />
                </div>

                {/* 右侧表单 */}
                <div className="p-8 lg:p-16 flex flex-col justify-center">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            {isLogin ? '欢迎回来' : '创建账号'}
                        </h2>
                        <p className="text-slate-500">
                            {isLogin ? '登录以继续你的创作之旅' : '注册开始你的 AI 开发体验'}
                        </p>
                    </div>

                    {/* 社交登录按钮 */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <button className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-medium text-slate-700">
                            <Chrome size={20} /> Google
                        </button>
                        <button className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-medium text-slate-700">
                            <Github size={20} /> GitHub
                        </button>
                    </div>

                    <div className="relative flex items-center mb-8">
                        <div className="flex-grow border-t border-slate-100"></div>
                        <span className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-widest bg-white">
                            或使用账号
                        </span>
                        <div className="flex-grow border-t border-slate-100"></div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 px-1">用户名</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="输入你的用户名"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 px-1">密码</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center group mt-8"
                        >
                            {loading ? '处理中...' : (isLogin ? '登录' : '创建账号')}
                            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-slate-500">
                        {isLogin ? '还没有账号?' : '已有账号?'}{' '}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="font-bold text-indigo-600 hover:text-indigo-700"
                        >
                            {isLogin ? '注册' : '登录'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
