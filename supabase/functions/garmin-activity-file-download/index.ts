import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Activity File Download - Downloads FIT files from callbacks
// POST /garmin-activity-file-download
// 
// This function processes pending activity file downloads from Garmin.
// Callback URLs are valid for 24 hours and can only be used ONCE.
// After download, URL returns 410 Gone.
//
// Modes:
// - CRON: Process all pending downloads (validates CRON_SECRET)
// - Manual: Process specific summary_id (requires JWT)
//
// Storage: Files stored in Supabase Storage bucket 'garmin-activity-files'
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface PendingFile {
  id: string;
  summary_id: string;
  user_id: string;
  garmin_user_id: string;
  activity_type: string | null;
  file_type: string | null;
  callback_expires_at: string;
  download_status: string;
}

interface CallbackData {
  url: string;
  user_id: string;
  expires_at: string;
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  delete safeData.url;
  delete safeData.callbackURL;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-activity-file-download',
    message,
    ...safeData,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

async function downloadAndStoreFitFile(
  supabaseAdmin: SupabaseClient,
  file: PendingFile,
  callbackUrl: string
): Promise<{ success: boolean; error?: string; storagePath?: string }> {
  const startTime = Date.now();
  
  try {
    // Mark as downloading
    await supabaseAdmin
      .from('garmin_activity_files')
      .update({ download_status: 'downloading' })
      .eq('id', file.id);
    
    log('info', 'Starting FIT file download', { 
      summaryId: file.summary_id, 
      userId: file.user_id 
    });
    
    // Download from Garmin callback URL
    const response = await fetch(callbackUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream',
      },
    });
    
    if (response.status === 410) {
      // URL already used or expired
      log('warn', 'Callback URL already consumed (410 Gone)', { summaryId: file.summary_id });
      return { success: false, error: 'CALLBACK_CONSUMED' };
    }
    
    if (response.status === 403) {
      // Permission revoked
      log('warn', 'Permission revoked (403)', { summaryId: file.summary_id });
      return { success: false, error: 'PERMISSION_REVOKED' };
    }
    
    if (!response.ok) {
      log('error', 'Failed to download FIT file', { 
        summaryId: file.summary_id, 
        status: response.status 
      });
      return { success: false, error: `HTTP_${response.status}` };
    }
    
    // Get file content
    const fileBuffer = await response.arrayBuffer();
    const fileSize = fileBuffer.byteLength;
    
    if (fileSize === 0) {
      log('warn', 'Downloaded file is empty', { summaryId: file.summary_id });
      return { success: false, error: 'EMPTY_FILE' };
    }
    
    // Generate storage path: user_id/YYYY-MM/summary_id.fit
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const storagePath = `${file.user_id}/${yearMonth}/${file.summary_id}.fit`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('garmin-activity-files')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/octet-stream',
        upsert: false, // Don't overwrite existing files
      });
    
    if (uploadError) {
      // Check if file already exists
      if (uploadError.message?.includes('already exists')) {
        log('info', 'File already exists in storage', { summaryId: file.summary_id, storagePath });
        return { success: true, storagePath };
      }
      
      log('error', 'Failed to upload to storage', { 
        summaryId: file.summary_id, 
        error: uploadError.message 
      });
      return { success: false, error: `STORAGE_${uploadError.message}` };
    }
    
    const duration = Date.now() - startTime;
    log('info', 'Successfully downloaded and stored FIT file', { 
      summaryId: file.summary_id, 
      storagePath,
      fileSize,
      durationMs: duration 
    });
    
    return { success: true, storagePath };
    
  } catch (error) {
    log('error', 'Exception during file download', { 
      summaryId: file.summary_id, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return { success: false, error: String(error) };
  }
}

async function processFile(
  supabaseAdmin: SupabaseClient,
  file: PendingFile
): Promise<{ summaryId: string; status: string; error?: string }> {
  const summaryId = file.summary_id;
  
  try {
    // Get callback URL from app_settings
    const { data: callbackData, error: fetchError } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', `garmin_callback:${summaryId}`)
      .single();
    
    if (fetchError || !callbackData) {
      log('warn', 'Callback URL not found', { summaryId });
      await supabaseAdmin
        .from('garmin_activity_files')
        .update({ download_status: 'failed' })
        .eq('id', file.id);
      return { summaryId, status: 'error', error: 'CALLBACK_NOT_FOUND' };
    }
    
    const callback = callbackData.value as CallbackData;
    
    // Check if expired
    if (new Date(callback.expires_at) < new Date()) {
      log('warn', 'Callback URL expired', { summaryId, expiresAt: callback.expires_at });
      await supabaseAdmin
        .from('garmin_activity_files')
        .update({ download_status: 'expired' })
        .eq('id', file.id);
      
      // Clean up expired callback
      await supabaseAdmin
        .from('app_settings')
        .delete()
        .eq('key', `garmin_callback:${summaryId}`);
      
      return { summaryId, status: 'expired', error: 'CALLBACK_EXPIRED' };
    }
    
    // Download and store file
    const result = await downloadAndStoreFitFile(supabaseAdmin, file, callback.url);
    
    if (result.success) {
      // Update file record
      await supabaseAdmin
        .from('garmin_activity_files')
        .update({ 
          download_status: 'completed',
          storage_path: result.storagePath,
          downloaded_at: new Date().toISOString(),
        })
        .eq('id', file.id);
      
      // Clean up callback URL (one-time use)
      await supabaseAdmin
        .from('app_settings')
        .delete()
        .eq('key', `garmin_callback:${summaryId}`);
      
      return { summaryId, status: 'success' };
    } else {
      // Handle specific error cases
      const finalStatus = result.error === 'CALLBACK_CONSUMED' ? 'consumed' 
        : result.error === 'PERMISSION_REVOKED' ? 'permission_revoked'
        : 'failed';
      
      await supabaseAdmin
        .from('garmin_activity_files')
        .update({ download_status: finalStatus })
        .eq('id', file.id);
      
      // Clean up callback if consumed
      if (result.error === 'CALLBACK_CONSUMED') {
        await supabaseAdmin
          .from('app_settings')
          .delete()
          .eq('key', `garmin_callback:${summaryId}`);
      }
      
      return { summaryId, status: 'error', error: result.error };
    }
    
  } catch (error) {
    log('error', 'Exception processing file', { summaryId, error: String(error) });
    
    await supabaseAdmin
      .from('garmin_activity_files')
      .update({ download_status: 'failed' })
      .eq('id', file.id);
    
    return { summaryId, status: 'error', error: String(error) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    // Parse request body
    let body: { summary_id?: string; cron_secret?: string } = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is OK for CRON
    }
    
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    const isCronRequest = body.cron_secret === cronSecret;
    
    if (!isCronRequest && !authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Get pending files to process
    let query = supabaseAdmin
      .from('garmin_activity_files')
      .select('id, summary_id, user_id, garmin_user_id, activity_type, file_type, callback_expires_at, download_status')
      .eq('download_status', 'pending')
      .lt('callback_expires_at', new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()) // Expires within 23h
      .order('callback_expires_at', { ascending: true }); // Process oldest first
    
    // If specific summary_id provided, filter to just that one
    if (body.summary_id) {
      query = query.eq('summary_id', body.summary_id);
    } else {
      // Limit batch size for CRON
      query = query.limit(10);
    }
    
    const { data: pendingFiles, error: queryError } = await query;
    
    if (queryError) {
      log('error', 'Failed to query pending files', { error: queryError.message });
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!pendingFiles || pendingFiles.length === 0) {
      log('info', 'No pending files to process');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No pending files' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Processing pending file downloads', { count: pendingFiles.length });
    
    // Process files sequentially to avoid overwhelming Garmin API
    const results: Array<{ summaryId: string; status: string; error?: string }> = [];
    
    for (const file of pendingFiles as PendingFile[]) {
      const result = await processFile(supabaseAdmin, file);
      results.push(result);
      
      // Small delay between downloads to be nice to Garmin
      if (pendingFiles.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const expiredCount = results.filter(r => r.status === 'expired').length;
    
    log('info', 'File download batch complete', { 
      total: results.length,
      success: successCount,
      error: errorCount,
      expired: expiredCount,
      durationMs: duration 
    });
    
    return new Response(
      JSON.stringify({ 
        processed: results.length,
        success: successCount,
        error: errorCount,
        expired: expiredCount,
        results,
        durationMs: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    log('error', 'Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
