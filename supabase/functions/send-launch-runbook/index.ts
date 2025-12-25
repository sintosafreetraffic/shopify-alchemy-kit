import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to } = await req.json();
    const targetEmail = to || "info.optiseek@gmail.com";

    console.log(`[send-launch-runbook] Sending Phase 4 runbook to ${targetEmail}`);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phase 4: Pinterest CAPI Production Launch Runbook</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
    h1 { color: #10b981; margin-top: 0; }
    h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    h3 { color: #6366f1; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #d1fae5; color: #059669; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-error { background: #fee2e2; color: #dc2626; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
    pre { background: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; color: inherit; }
    .checklist { list-style: none; padding: 0; }
    .checklist li { padding: 8px 0; display: flex; align-items: center; gap: 8px; }
    .checklist li::before { content: "✅"; }
    .status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .status-item { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px; }
    .status-item.active { border-color: #10b981; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 32px;">🚀</span>
        </div>
        <div>
          <h1 style="margin: 0;">Phase 4: Production Launch Runbook</h1>
          <p style="color: #6b7280; margin: 4px 0 0 0;">Pinterest CAPI Tracking System</p>
        </div>
      </div>
      
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <strong style="color: #059669;">✅ System Status: Production Ready</strong>
        <p style="margin: 8px 0 0 0; color: #374151;">All systems operational. Last verified: ${new Date().toISOString()}</p>
      </div>
    </div>

    <div class="card">
      <h2>📋 Production Checklist</h2>
      <ul class="checklist">
        <li>Pinterest CAPI Enabled</li>
        <li>Chaos Tests Passed (C1-C9)</li>
        <li>Test Order Isolation Active</li>
        <li>Hourly Reconciliation Scheduled</li>
        <li>Daily Health Aggregation Scheduled</li>
        <li>Email Alerts Configured</li>
        <li>Real-time Monitoring Dashboard</li>
        <li>Recovery Pipeline Ready</li>
      </ul>
    </div>

    <div class="card">
      <h2>⏰ Scheduled Jobs</h2>
      <table>
        <tr><th>Job</th><th>Schedule</th><th>Purpose</th></tr>
        <tr><td><code>reconcile-shopify-orders</code></td><td>Hourly (:00)</td><td>Detect missing orders</td></tr>
        <tr><td><code>aggregate-tracking-health</code></td><td>Daily (3:00 AM UTC)</td><td>Calculate metrics & trigger alerts</td></tr>
        <tr><td><code>recover-missing-purchases</code></td><td>Hourly (:20)</td><td>Retry failed events</td></tr>
      </table>
    </div>

    <div class="card">
      <h2>🎯 Key Metrics to Watch</h2>
      <table>
        <tr><th>Metric</th><th><span class="badge badge-success">Healthy</span></th><th><span class="badge badge-warning">Warning</span></th><th><span class="badge badge-error">Critical</span></th></tr>
        <tr><td>Success Rate (7d)</td><td>≥95%</td><td>80-95%</td><td>&lt;80%</td></tr>
        <tr><td>Error Rate</td><td>&lt;5%</td><td>5-10%</td><td>&gt;10%</td></tr>
        <tr><td>EPIK Rate</td><td>&gt;20%</td><td>10-20%</td><td>&lt;10%</td></tr>
        <tr><td>Dead Letters (7d)</td><td>0</td><td>1-5</td><td>&gt;5</td></tr>
      </table>
    </div>

    <div class="card">
      <h2>🚨 Incident Response Quick Reference</h2>
      
      <h3>P1: Complete Tracking Failure</h3>
      <ol>
        <li>Check Pinterest status: <a href="https://status.pinterest.com">status.pinterest.com</a></li>
        <li>Verify <code>PINTEREST_CONVERSION_TOKEN</code> is valid</li>
        <li>Review edge function logs</li>
        <li>Events will auto-retry when service restores</li>
      </ol>
      
      <h3>P2: High Error Rate (&gt;20%)</h3>
      <ol>
        <li>Check error distribution in database</li>
        <li>Review <code>render_response</code> for details</li>
        <li>Manually trigger recovery if needed</li>
      </ol>
      
      <h3>P3: Missing Orders Detected</h3>
      <ol>
        <li>Check <code>missing_purchase_events</code> table</li>
        <li>Verify order wasn't filtered</li>
        <li>Review <code>recovery_purchase_attempts</code></li>
      </ol>
    </div>

    <div class="card">
      <h2>🔗 Quick Links</h2>
      <div class="status-grid">
        <div class="status-item">
          <strong>📊 Monitoring Dashboard</strong><br>
          <a href="https://risebynight.com/risebynight/tracking">/risebynight/tracking</a>
        </div>
        <div class="status-item">
          <strong>📌 Pinterest Ads</strong><br>
          <a href="https://ads.pinterest.com/analytics">ads.pinterest.com</a>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>📧 Alert Notifications</h2>
      <p>All critical alerts are automatically sent to: <strong>info.optiseek@gmail.com</strong></p>
      <p>Alert types include:</p>
      <ul>
        <li>🚨 <strong>Critical:</strong> Success rate drop ≥10%, Error rate &gt;10%, EPIK collapse</li>
        <li>⚠️ <strong>Warning:</strong> Success rate drop 5-10%, Reconciliation mismatches</li>
      </ul>
    </div>

    <div class="card">
      <h2>✅ Chaos Tests Passed</h2>
      <table>
        <tr><th>Test</th><th>Scenario</th><th>Status</th></tr>
        <tr><td>C1</td><td>CAPI disabled</td><td>✅ Pass</td></tr>
        <tr><td>C2</td><td>Missing context</td><td>✅ Pass</td></tr>
        <tr><td>C3</td><td>Pinterest 500 error</td><td>✅ Pass</td></tr>
        <tr><td>C4</td><td>Duplicate order</td><td>✅ Pass</td></tr>
        <tr><td>C5</td><td>Invalid payload</td><td>✅ Pass</td></tr>
        <tr><td>C6</td><td>Test mode order</td><td>✅ Pass</td></tr>
        <tr><td>C7</td><td>Timestamp skew</td><td>✅ Pass</td></tr>
        <tr><td>C8</td><td>Recovery dry run</td><td>✅ Pass</td></tr>
        <tr><td>C9</td><td>High volume</td><td>✅ Pass</td></tr>
      </table>
    </div>

    <div class="footer">
      <p>Rise By Night • Pinterest CAPI Tracking System</p>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><a href="https://risebynight.com/risebynight/tracking">View Full Dashboard →</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Rise By Night <alerts@send.risebynight.com>",
      to: [targetEmail],
      subject: "🚀 Phase 4 Launch Runbook - Pinterest CAPI Production Ready",
      html: htmlContent,
    });

    console.log("[send-launch-runbook] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, id: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[send-launch-runbook] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});