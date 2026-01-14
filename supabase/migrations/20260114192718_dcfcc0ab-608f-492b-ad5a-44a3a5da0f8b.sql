-- Add A/B traffic split setting to app_settings
INSERT INTO app_settings (key, value)
VALUES ('ab_traffic_split_percent_b', '15')
ON CONFLICT (key) DO UPDATE SET value = '15', updated_at = NOW();