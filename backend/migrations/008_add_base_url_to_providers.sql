-- Migration: Add base_url for Cloud/Remote endpoints support flawless
ALTER TABLE ProviderConfigs ADD COLUMN base_url TEXT;

INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, base_url, is_active)
VALUES ('ollama_cloud', '', 'llama3', 'http://YOUR-CLOUD-IP:11434', 0);
