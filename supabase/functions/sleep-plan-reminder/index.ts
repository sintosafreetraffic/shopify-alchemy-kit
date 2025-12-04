import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');

    if (!KLAVIYO_PRIVATE_API_KEY) {
      throw new Error('Klaviyo API key not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting sleep plan reminder check...');

    const now = new Date();

    // Get all sleep profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('sleep_profiles')
      .select('email');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found');
      return new Response(
        JSON.stringify({ success: true, message: 'No profiles found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let remindersSent = 0;

    for (const profile of profiles) {
      // Get the latest plan for this user
      const { data: latestPlan, error: planError } = await supabaseAdmin
        .from('coach_plans')
        .select('id, valid_until, generated_at')
        .eq('email', profile.email)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planError) {
        console.error(`Error fetching plan for ${profile.email}:`, planError);
        continue;
      }

      // Check if plan is expired or doesn't exist
      const needsNewPlan = !latestPlan || 
        (latestPlan.valid_until && new Date(latestPlan.valid_until) < now);

      if (!needsNewPlan) {
        continue;
      }

      // Check if we already sent a reminder recently (within last 24 hours)
      const { data: recentReminder } = await supabaseAdmin
        .from('engagement_meta')
        .select('last_reminder_type, updated_at')
        .eq('email', profile.email)
        .maybeSingle();

      if (recentReminder?.last_reminder_type === 'new_plan_available') {
        const lastReminderTime = new Date(recentReminder.updated_at);
        const hoursSinceReminder = (now.getTime() - lastReminderTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceReminder < 24) {
          console.log(`Skipping ${profile.email} - reminder sent ${hoursSinceReminder.toFixed(1)} hours ago`);
          continue;
        }
      }

      // Send Klaviyo notification
      const response = await fetch('https://a.klaviyo.com/api/events/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-02-15',
        },
        body: JSON.stringify({
          data: {
            type: 'event',
            attributes: {
              metric: { data: { type: 'metric', attributes: { name: 'RBN_New_Plan_Available' } } },
              profile: { data: { type: 'profile', attributes: { email: profile.email } } },
              properties: {
                last_plan_date: latestPlan?.generated_at || null,
                plan_expired_date: latestPlan?.valid_until || null,
                dashboard_url: 'https://www.risebynight.com/sleep-coach',
                sent_at: now.toISOString(),
              },
              time: now.toISOString(),
            },
          },
        }),
      });

      if (!response.ok) {
        console.error(`Failed to send reminder to ${profile.email}:`, await response.text());
        continue;
      }

      // Update engagement_meta to track reminder
      await supabaseAdmin
        .from('engagement_meta')
        .upsert({
          email: profile.email,
          last_reminder_type: 'new_plan_available',
          updated_at: now.toISOString(),
        }, {
          onConflict: 'email',
        });

      remindersSent++;
      console.log(`New plan reminder sent to ${profile.email}`);
    }

    console.log(`Sleep plan reminder job complete. Sent ${remindersSent} reminders.`);

    return new Response(
      JSON.stringify({ success: true, reminders_sent: remindersSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sleep plan reminder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
