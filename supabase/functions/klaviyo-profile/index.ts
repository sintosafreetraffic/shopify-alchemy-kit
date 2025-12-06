import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const profileSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  properties: z.record(z.unknown()).optional().default({}),
  phone_number: z.string().max(20, "Phone number too long").optional(),
  whatsapp_enabled: z.boolean().optional().default(false),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
    if (!KLAVIYO_PRIVATE_API_KEY) {
      throw new Error('Klaviyo API key not configured');
    }

    // Validate input
    const rawBody = await req.json();
    const parseResult = profileSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { email, properties, phone_number, whatsapp_enabled } = parseResult.data;

    console.log(`Updating Klaviyo profile for ${email}, WhatsApp: ${whatsapp_enabled}`);

    // Find profile by email - use encodeURIComponent to prevent injection
    const searchResponse = await fetch(
      `https://a.klaviyo.com/api/profiles/?filter=equals(email,"${encodeURIComponent(email)}")`,
      {
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          'revision': '2024-02-15',
        },
      }
    );

    const searchData = await searchResponse.json();
    const profileId = searchData.data[0]?.id;

    // Build profile attributes
    const profileAttributes: Record<string, unknown> = {
      email,
      properties: {
        ...properties,
        whatsapp_enabled: whatsapp_enabled || false,
      },
    };

    // Add phone number if WhatsApp is enabled
    if (whatsapp_enabled && phone_number) {
      profileAttributes.phone_number = phone_number;
      (profileAttributes.properties as Record<string, unknown>).whatsapp_phone = phone_number;
      console.log(`Syncing WhatsApp phone: ${phone_number}`);
    }

    if (!profileId) {
      console.log('Profile not found, creating new one');
      // Create new profile
      const createResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-02-15',
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: profileAttributes,
          },
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Create profile error:', errorText);
      } else {
        console.log('Profile created successfully');
      }

      return new Response(JSON.stringify({ success: true, created: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update existing profile
    const updateResponse = await fetch(`https://a.klaviyo.com/api/profiles/${profileId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          id: profileId,
          attributes: {
            phone_number: whatsapp_enabled && phone_number ? phone_number : undefined,
            properties: {
              ...properties,
              whatsapp_enabled: whatsapp_enabled || false,
              whatsapp_phone: whatsapp_enabled ? phone_number : null,
            },
          },
        },
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Update profile error:', errorText);
    }

    console.log('Profile updated successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in klaviyo-profile:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
