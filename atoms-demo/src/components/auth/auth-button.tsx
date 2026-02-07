"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

interface AuthButtonProps {
  onClick?: () => void;
}

export function AuthButton({ onClick }: AuthButtonProps) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        加载中...
      </Button>
    );
  }

  if (!user) {
    return (
      <Button variant="default" size="sm" onClick={onClick}>
        登录 / 注册
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="gap-2">
        <User size={16} />
        <span>{user.username || "用户"}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        title="登出"
      >
        <LogOut size={16} />
      </Button>
    </div>
  );
}
