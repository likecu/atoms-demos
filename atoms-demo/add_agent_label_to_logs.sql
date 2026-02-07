
-- Add agent_label column to ai_call_logs table
ALTER TABLE ai_call_logs 
ADD COLUMN IF NOT EXISTS agent_label TEXT DEFAULT 'Main Agent';

-- Comment on column
COMMENT ON COLUMN ai_call_logs.agent_label IS '标识哪个代理产生的日志 (Main Agent, Research Subagent 등)';
