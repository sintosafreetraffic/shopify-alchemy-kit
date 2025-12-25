-- Add is_test column to pinterest_purchase_events
ALTER TABLE pinterest_purchase_events 
ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;

-- Mark existing chaos test orders as test data
UPDATE pinterest_purchase_events 
SET is_test = true 
WHERE render_status ILIKE 'chaos%' 
   OR order_id IN (
     '1766656957985',
     '1766656948568', 
     '1766656947364',
     '1766656946021',
     '1766656077979',
     '1766656071116',
     '1766656069039',
     '1766656065633'
   );

-- Add index for efficient filtering
CREATE INDEX idx_pinterest_purchase_events_is_test 
ON pinterest_purchase_events(is_test) 
WHERE is_test = false;