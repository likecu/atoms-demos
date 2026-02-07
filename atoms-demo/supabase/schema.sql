-- Atoms Demo 数据库 Schema 设计
-- 基于 PRD v2.1 规划
-- 用于 Supabase/PostgreSQL

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users 表 - 用户认证与基本信息
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects 表 - 项目/站点管理
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Project',
    description TEXT,
    current_code TEXT DEFAULT '',
    prompt_history JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Deployments 表 - 部署/分享记录
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    snapshot_code TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Messages 表 - 对话消息记录（扩展功能）
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    agent_name TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Artifacts 表 - 代码片段/产物记录
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    code_type TEXT DEFAULT 'html' CHECK (code_type IN ('html', 'css', 'js', 'react', 'vue', 'svelte')),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI Call Logs 表 - AI 调用过程记录
CREATE TABLE IF NOT EXISTS ai_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    step_type TEXT NOT NULL CHECK (step_type IN ('thinking', 'tool_call', 'tool_result', 'output')),
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_share_token ON deployments(share_token);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_project_id ON ai_call_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_message_id ON ai_call_logs(message_id);

-- 更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 users, projects, artifacts 表添加更新时间戳触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_artifacts_updated_at BEFORE UPDATE ON artifacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS) 策略
-- ============================================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Users 表 RLS 策略
-- 用户只能查看和修改自己的数据
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects 表 RLS 策略
-- 用户只能访问自己的项目
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Deployments 表 RLS 策略
-- 基于关联项目权限控制
CREATE POLICY "Users can view own deployments" ON deployments FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM projects WHERE id = deployments.project_id AND user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert own deployments" ON deployments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deployments" ON deployments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deployments" ON deployments FOR DELETE USING (auth.uid() = user_id);

-- 公开访问已发布的部署（通过 share_token）
CREATE POLICY "Public can view published deployments" ON deployments FOR SELECT USING (
    is_active = TRUE AND (
        share_token IN (SELECT share_token FROM deployments WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM projects WHERE id = deployments.project_id AND user_id = auth.uid())
    )
);

-- Messages 表 RLS 策略
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = messages.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = messages.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = messages.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = messages.project_id AND user_id = auth.uid())
);

-- Artifacts 表 RLS 策略
CREATE POLICY "Users can view own artifacts" ON artifacts FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = artifacts.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own artifacts" ON artifacts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = artifacts.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own artifacts" ON artifacts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = artifacts.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own artifacts" ON artifacts FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = artifacts.project_id AND user_id = auth.uid())
);

-- AI Call Logs 表 RLS 策略
CREATE POLICY "Users can view own ai_call_logs" ON ai_call_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = ai_call_logs.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own ai_call_logs" ON ai_call_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = ai_call_logs.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own ai_call_logs" ON ai_call_logs FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = ai_call_logs.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own ai_call_logs" ON ai_call_logs FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = ai_call_logs.project_id AND user_id = auth.uid())
);

-- ============================================================
-- 辅助函数
-- ============================================================

-- 生成唯一分享 Token 的函数
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
BEGIN
    LOOP
        token := encode(gen_random_bytes(16), 'hex');
        IF NOT EXISTS (SELECT 1 FROM deployments WHERE share_token = token) THEN
            RETURN token;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 获取用户默认项目（如果不存在则创建）
CREATE OR REPLACE FUNCTION get_or_create_default_project(user_id UUID)
RETURNS UUID AS $$
DECLARE
    project_id UUID;
BEGIN
    SELECT id INTO project_id FROM projects
    WHERE user_id = user_id AND name = 'Untitled Project'
    ORDER BY created_at DESC LIMIT 1;

    IF project_id IS NULL THEN
        INSERT INTO projects (user_id, name) VALUES (user_id, 'Untitled Project')
        RETURNING id INTO project_id;
    END IF;

    RETURN project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
