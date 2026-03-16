CREATE TABLE IF NOT EXISTS ProviderConfigs (
     provider_id TEXT PRIMARY KEY, -- 'ollama', 'openai', 'claude', 'perplexity', 'openrouter'
     api_key TEXT,
     default_model TEXT,
     is_active INTEGER DEFAULT 0
);

-- Seed defaults for Ollama
INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active) 
VALUES ('ollama', '', 'llama3', 1);

INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active) 
VALUES ('openai', '', 'gpt-4o', 0);

INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active) 
VALUES ('claude', '', 'claude-3-5-sonnet', 0);

INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active) 
VALUES ('perplexity', '', 'sonar-medium', 0);

INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active) 
VALUES ('openrouter', '', 'meta-llama/llama-3-8b-instruct', 0);
