"use client"

import { Toaster as Sonner } from "sonner"

import { cn } from "@/lib/utils"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Toast 提示器组件
 * 基于 sonner 库，提供轻量级的 toast 通知功能
 * 
 * @param props - Sonner 组件的 props
 */
function Toaster({ ...props }: ToasterProps) {
    return (
        <Sonner
            theme="dark"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: cn(
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                        "data-[type=success]:data-[side=top]:border-l-success data-[type=success]:data-[side=top]:text-success data-[type=success]:data-[icon]:text-success",
                        "data-[type=error]:data-[side=top]:border-l-destructive data-[type=error]:data-[side=top]:text-destructive data-[type=error]:data-[icon]:text-destructive",
                        "data-[type=warning]:data-[side=top]:border-l-yellow-500 data-[type=warning]:data-[side=top]:text-yellow-500 data-[type=warning]:data-[icon]:text-yellow-500",
                        "data-[type=info]:data-[side=top]:border-l-blue-500 data-[type=info]:data-[side=top]:text-blue-500 data-[type=info]:data-[icon]:text-blue-500"
                    ),
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
