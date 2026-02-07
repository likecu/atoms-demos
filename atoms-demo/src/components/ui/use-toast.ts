"use client"

import { toast } from "sonner"

/**
 * Toast Hook
 * 使用 sonner 库提供 toast 通知功能
 */
function useToast() {
    return {
        toast,
        dismiss: (id?: string) => {
            if (id) {
                toast.dismiss(id)
            } else {
                toast.dismiss()
            }
        },
    }
}

export { useToast }
