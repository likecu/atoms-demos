"use client";

import { z } from "zod";

/**
 * 登录表单验证 Schema
 * 验证用户名和密码输入
 */
export const loginSchema = z.object({
    username: z
        .string()
        .min(1, "用户名不能为空")
        .min(3, "用户名至少3个字符")
        .max(20, "用户名最多20个字符")
        .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
    password: z
        .string()
        .min(1, "密码不能为空")
        .min(6, "密码至少6个字符"),
});

/**
 * 注册表单验证 Schema
 * 验证用户名、密码和确认密码
 */
export const signupSchema = z
    .object({
        username: z
            .string()
            .min(1, "用户名不能为空")
            .min(3, "用户名至少3个字符")
            .max(20, "用户名最多20个字符")
            .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
        password: z
            .string()
            .min(1, "密码不能为空")
            .min(6, "密码至少6个字符"),
        confirmPassword: z
            .string()
            .min(1, "请确认密码"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "两次输入的密码不一致",
        path: ["confirmPassword"],
    });

/**
 * 登录表单类型
 */
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * 注册表单类型
 */
export type SignupFormData = z.infer<typeof signupSchema>;
