'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { ZoomIn, ZoomOut, RotateCcw, Hand, MousePointer2, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DraggableCanvasProps {
    children: React.ReactNode
    className?: string
    initialScale?: number
    /**
     * 画布内容的默认宽度
     */
    defaultWidth?: number | string
    /**
     * 画布内容的默认高度
     */
    defaultHeight?: number | string
}

export function DraggableCanvas({
    children,
    className,
    initialScale = 0.8,
    defaultWidth = "100%",
    defaultHeight = "100%"
}: DraggableCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // 运动值
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    // 状态
    const [isSpacePressed, setIsSpacePressed] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [scale, setScale] = useState(initialScale)

    // 监听空格键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 忽略输入框内的事件
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                (e.target as HTMLElement).isContentEditable
            ) {
                return
            }

            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault() // 防止页面滚动
                setIsSpacePressed(true)
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        // 失去焦点时重置状态
        const handleBlur = () => {
            setIsSpacePressed(false)
        }
        window.addEventListener('blur', handleBlur)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            window.removeEventListener('blur', handleBlur)
        }
    }, [])

    // 滚轮缩放
    const handleWheel = useCallback((e: React.WheelEvent) => {
        // 只有按住 Ctrl/Cmd 时才缩放，或者在画布模式下默认缩放？
        // 为了避免干扰垂直滚动体验，强制要求 Ctrl+滚轮 进行缩放，
        // 或者当不在内容区域时。

        // 这里实现：Ctrl + Wheel = Zoom
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            e.stopPropagation()

            const zoomSensitivity = 0.002
            // 限制缩放范围 0.2 - 3
            const newScale = Math.min(Math.max(0.2, scale - e.deltaY * zoomSensitivity), 3)
            setScale(newScale)
        }
    }, [scale])

    // 重置视图
    const handleReset = () => {
        x.set(0)
        y.set(0)
        setScale(initialScale)
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-full overflow-hidden bg-[#09090b] select-none",
                // 点阵背景图案
                "bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]",
                className
            )}
            onWheel={handleWheel}
        >
            {/* 状态指示器与提示 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
                {isSpacePressed && (
                    <div className="bg-indigo-600/90 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <Move className="w-4 h-4" />
                        拖拽模式
                    </div>
                )}
                {!isDragging && !isSpacePressed && (
                    <div className="bg-zinc-800/50 backdrop-blur-sm text-zinc-400 px-3 py-1 rounded-full text-xs border border-zinc-700/50 opacity-0 hover:opacity-100 transition-opacity duration-300">
                        按住空格键拖拽 • Ctrl+滚轮缩放
                    </div>
                )}
            </div>

            {/* 控制栏 */}
            <div className="absolute bottom-6 right-6 z-50 flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 shadow-2xl backdrop-blur-md">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    onClick={() => setScale(s => Math.max(s - 0.1, 0.2))}
                >
                    <ZoomOut className="w-4 h-4" />
                </Button>

                <div className="w-16 text-center font-mono text-xs text-zinc-300">
                    {Math.round(scale * 100)}%
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    onClick={() => setScale(s => Math.min(s + 0.1, 3))}
                >
                    <ZoomIn className="w-4 h-4" />
                </Button>

                <div className="w-px h-4 bg-zinc-700 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    onClick={handleReset}
                    title="重置视图"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* 可拖拽区域 */}
            <motion.div
                className="w-full h-full flex items-center justify-center cursor-default"
                // 只有按住空格键时才启用拖拽
                drag={isSpacePressed}
                dragConstraints={containerRef}
                dragElastic={0.1}
                dragMomentum={false}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                style={{ x, y, cursor: isSpacePressed ? 'grab' : 'default' }}
                whileDrag={{ cursor: 'grabbing' }}
            >
                {/* 缩放容器 */}
                <motion.div
                    animate={{ scale }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative shadow-2xl"
                    style={{
                        width: defaultWidth,
                        height: defaultHeight,
                    }}
                >
                    {/* 
                        交互遮罩层 
                        当 Space 按下时：pointer-events-auto，拦截所有鼠标事件，使得 motion.div 可以响应拖拽。
                        否则：pointer-events-none，使得鼠标事件可以穿透到内部的 iframe/编辑器。
                    */}
                    <div
                        className={cn(
                            "absolute inset-0 z-50 transition-colors",
                            isSpacePressed ? "bg-transparent pointer-events-auto" : "pointer-events-none"
                        )}
                    />

                    {/* 内容区域 (通常是 iframe) */}
                    <div className="w-full h-full bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
                        {children}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}
