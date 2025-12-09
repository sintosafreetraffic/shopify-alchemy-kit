-- ============================================================
-- Fix sleep_attributes_history RLS policies
-- Add explicit DENY policies for INSERT, UPDATE, DELETE
-- This table should only be written to by service role (edge functions)
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE public.sleep_attributes_history ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive INSERT policy if exists (cleanup)
DROP POLICY IF EXISTS "Users can insert own sleep attributes history" ON public.sleep_attributes_history;
DROP POLICY IF EXISTS "Service role can insert history" ON public.sleep_attributes_history;

-- Create explicit DENY policies to prevent any user INSERT/UPDATE/DELETE
-- These policies use "false" condition to deny all operations

-- Deny all INSERT operations from authenticated users
-- (Only service role can insert via edge functions)
CREATE POLICY "No user inserts on history" 
ON public.sleep_attributes_history 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Deny all UPDATE operations
CREATE POLICY "No updates on history" 
ON public.sleep_attributes_history 
FOR UPDATE 
TO authenticated
USING (false);

-- Deny all DELETE operations  
CREATE POLICY "No deletes on history" 
ON public.sleep_attributes_history 
FOR DELETE 
TO authenticated
USING (false);