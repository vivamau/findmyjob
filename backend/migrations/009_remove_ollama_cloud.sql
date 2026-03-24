-- Migration: Remove ollama_cloud redundant entry flawless
DELETE FROM ProviderConfigs WHERE provider_id = 'ollama_cloud';
