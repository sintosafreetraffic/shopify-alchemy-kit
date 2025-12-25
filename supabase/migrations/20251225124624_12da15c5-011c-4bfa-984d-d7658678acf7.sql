-- Drop old constraint and add new one with all alert types
ALTER TABLE tracking_alerts DROP CONSTRAINT tracking_alerts_type_check;

ALTER TABLE tracking_alerts ADD CONSTRAINT tracking_alerts_type_check 
CHECK (type = ANY (ARRAY[
  'success_rate_drop'::text, 
  'error_spike'::text, 
  'epik_collapse'::text, 
  'context_capture_failure'::text, 
  'reconciliation_mismatch'::text,
  'low_success_rate'::text,
  'high_error_rate'::text,
  'dead_letters_spike'::text
]));