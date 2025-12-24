-- Add recover-missing-purchases to allowed job names
ALTER TABLE public.tracking_jobs
DROP CONSTRAINT tracking_jobs_job_name_check;

ALTER TABLE public.tracking_jobs
ADD CONSTRAINT tracking_jobs_job_name_check 
CHECK (job_name = ANY (ARRAY['aggregate-tracking-health', 'reconcile-shopify-orders', 'recover-missing-purchases']));