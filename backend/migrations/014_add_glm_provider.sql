-- Migration: Add GLM 4.6 Flash Provider Config
INSERT OR IGNORE INTO ProviderConfigs (provider_id, api_key, default_model, is_active)
VALUES ('glm', '', 'glm-4', 0);
