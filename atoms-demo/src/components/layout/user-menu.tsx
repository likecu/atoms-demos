'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'

/**
 * 用户菜单组件
 * 提供用户信息、设置和登出功能的下拉菜单
 */
export default function UserMenu() {
    const { user, logout } = useAuth()
    const router = useRouter()

    /**
     * 处理登出
     */
    const handleLogout = async () => {
        if (confirm('确定要登出吗？')) {
            await logout()
            router.push('/')
        }
    }

    if (!user) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="gap-2 text-sm text-zinc-600 hover:text-zinc-900"
                >
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium hidden sm:inline">
                            {user.username || user.email}
                        </span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.username || '用户'}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                    <User className="w-4 h-4 mr-2" />
                    个人信息
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => router.push('/settings')}
                    className="cursor-pointer"
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    登出
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
