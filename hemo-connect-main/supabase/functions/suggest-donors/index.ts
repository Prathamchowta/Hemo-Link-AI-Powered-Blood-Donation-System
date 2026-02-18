import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DonorSuggestionRequest {
  requestId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId } = await req.json() as DonorSuggestionRequest;

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch blood request details
    const { data: bloodRequest, error: requestError } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !bloodRequest) {
      console.error('Error fetching blood request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Blood request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize blood group for matching (case-insensitive, trim whitespace)
    const normalizedRequestBloodGroup = bloodRequest.blood_group?.trim().toUpperCase();

    // Fetch hospital-managed donors matching the blood group
    const { data: allHospitalDonors, error: hospitalDonorsError } = await supabase
      .from('donors')
      .select('*')
      .eq('hospital_id', bloodRequest.hospital_id);

    if (hospitalDonorsError) {
      console.error('Error fetching hospital donors:', hospitalDonorsError);
    }

    // Filter by blood group in JavaScript (case-insensitive)
    const hospitalDonors = (allHospitalDonors || []).filter(donor => {
      const donorBloodGroup = donor.blood_group?.trim().toUpperCase();
      return donorBloodGroup === normalizedRequestBloodGroup;
    });

    // Also fetch registered donor users (from profiles) with matching blood group
    // These are donors who registered through the donor portal
    const { data: allRegisteredDonors, error: registeredDonorsError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, location, blood_group')
      .not('blood_group', 'is', null);

    if (registeredDonorsError) {
      console.error('Error fetching registered donors:', registeredDonorsError);
    }

    // Filter by blood group in JavaScript (case-insensitive)
    const registeredDonors = (allRegisteredDonors || []).filter(profile => {
      const profileBloodGroup = profile.blood_group?.trim().toUpperCase();
      return profileBloodGroup === normalizedRequestBloodGroup;
    });

    if (registeredDonorsError) {
      console.error('Error fetching registered donors:', registeredDonorsError);
    }

    // Combine both types of donors with deduplication
    const allDonors: any[] = [];
    const seenUserIds = new Set<string>(); // Track user_ids to prevent duplicates
    const seenPhoneNumbers = new Set<string>(); // Also track by phone as fallback
    
    // Add hospital-managed donors first
    if (hospitalDonors) {
      hospitalDonors.forEach(donor => {
        const userId = donor.user_id;
        const phone = donor.phone?.trim().toLowerCase();
        
        // Skip if we've already seen this user_id or phone number
        if (userId && seenUserIds.has(userId)) {
          console.log(`Skipping duplicate donor by user_id: ${donor.full_name} (${userId})`);
          return;
        }
        if (phone && seenPhoneNumbers.has(phone)) {
          console.log(`Skipping duplicate donor by phone: ${donor.full_name} (${phone})`);
          return;
        }
        
        if (userId) seenUserIds.add(userId);
        if (phone) seenPhoneNumbers.add(phone);
        
        allDonors.push({
          id: donor.id,
          full_name: donor.full_name,
          phone: donor.phone,
          location: donor.location,
          blood_group: donor.blood_group,
          donation_count: donor.donation_count || 0,
          last_donation_date: donor.last_donation_date,
          hospital_id: donor.hospital_id,
          user_id: donor.user_id || null,
          is_hospital_managed: true,
        });
      });
    }

    // Add registered donor users (check their donation history)
    // Skip if they already exist in hospital-managed donors
    if (registeredDonors) {
      for (const profile of registeredDonors) {
        const userId = profile.id;
        const phone = profile.phone?.trim().toLowerCase();
        
        // Skip if we've already seen this user_id or phone number
        if (seenUserIds.has(userId)) {
          console.log(`Skipping duplicate registered donor by user_id: ${profile.full_name} (${userId})`);
          continue;
        }
        if (phone && seenPhoneNumbers.has(phone)) {
          console.log(`Skipping duplicate registered donor by phone: ${profile.full_name} (${phone})`);
          continue;
        }
        
        // Check if this registered donor has any donations
        const { data: donations } = await (supabase.from as any)('donations')
          .select('donation_date')
          .eq('donor_user_id', profile.id)
          .order('donation_date', { ascending: false })
          .limit(1);

        const lastDonationDate = donations && donations.length > 0 ? donations[0].donation_date : null;
        
        // Count total donations
        const { count: donationCount } = await (supabase.from as any)('donations')
          .select('*', { count: 'exact', head: true })
          .eq('donor_user_id', profile.id);

        seenUserIds.add(userId);
        if (phone) seenPhoneNumbers.add(phone);

        allDonors.push({
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          location: profile.location || '',
          blood_group: profile.blood_group,
          donation_count: donationCount || 0,
          last_donation_date: lastDonationDate,
          hospital_id: null,
          user_id: profile.id,
          is_hospital_managed: false,
        });
    }
    }

    const donors = allDonors;

    if (!donors || donors.length === 0) {
      return new Response(
        JSON.stringify({ 
          suggestions: [], 
          message: 'No eligible donors found',
          totalDonors: 0,
          eligibleDonors: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare donor data for AI analysis
    const donorData = donors.map(donor => {
      const lastDonation = donor.last_donation_date 
        ? new Date(donor.last_donation_date) 
        : null;
      const daysSinceLastDonation = lastDonation 
        ? Math.floor((Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Never donated = eligible
      
      // For urgent/critical requests, be more lenient with eligibility (60 days instead of 90)
      const eligibilityThreshold = bloodRequest.urgency_level === 'critical' || bloodRequest.urgency_level === 'urgent' 
        ? 60 
        : 90;
      
      return {
        id: donor.id,
        name: donor.full_name,
        phone: donor.phone,
        location: donor.location || '',
        donationCount: donor.donation_count || 0,
        daysSinceLastDonation,
        isEligible: daysSinceLastDonation >= eligibilityThreshold || daysSinceLastDonation === 999, // 3 months = ~90 days, or never donated
        isHospitalManaged: donor.is_hospital_managed || false,
        userId: donor.user_id || null,
      };
    });

    // Use AI to analyze and rank donors
    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "openai").toLowerCase();
    const HEMO_AI_API_KEY = Deno.env.get('HEMO_AI_API_KEY');

    const aiPrompt = `You are an AI assistant helping to match blood donors for emergency requests.

Blood Request Details:
- Patient: ${bloodRequest.patient_name}
- Blood Group: ${bloodRequest.blood_group}
- Units Needed: ${bloodRequest.units_needed}
- Urgency: ${bloodRequest.urgency_level}
- Patient Location: Contact ${bloodRequest.patient_contact}

Available Donors (${donorData.length} total):
${JSON.stringify(donorData, null, 2)}

Analyze these donors and rank the top 5 best matches based on:
1. Eligibility (must have waited at least 90 days since last donation)
2. Donation history (higher donation count = more reliable)
3. Recent availability (fewer days since last donation within the eligible range is better)
4. Location proximity (if available)

Provide your analysis in a structured format with:
- Donor ID
- Reasoning for the ranking (2-3 sentences)
- A match score (0-100)

Focus on donors who are eligible and have a good track record.`;

    let aiSuggestion = '';
    if (HEMO_AI_API_KEY) {
      let aiResponse: Response;
      
      if (AI_PROVIDER === 'openai') {
        aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HEMO_AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a helpful AI assistant specializing in blood donation matching. Provide clear, actionable recommendations.' },
              { role: 'user', content: aiPrompt }
            ],
          }),
        });
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSuggestion = aiData.choices?.[0]?.message?.content || '';
        } else {
          const errorText = await aiResponse.text();
          console.error('AI API error:', aiResponse.status, errorText);
          aiSuggestion = 'AI suggestions are temporarily unavailable. Showing top donors based on donation history.';
        }
      } else if (AI_PROVIDER === 'google') {
        aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${Deno.env.get('GOOGLE_MODEL') || 'gemini-1.5-flash'}:generateContent?key=${HEMO_AI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: 'System: You are a helpful AI assistant specializing in blood donation matching. Provide clear, actionable recommendations.\n\n' + aiPrompt }]
            }],
          }),
        });
        
        if (aiResponse.ok) {
          const geminiData = await aiResponse.json();
          aiSuggestion = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          const errorText = await aiResponse.text();
          console.error('AI API error:', aiResponse.status, errorText);
          aiSuggestion = 'AI suggestions are temporarily unavailable. Showing top donors based on donation history.';
        }
      } else if (AI_PROVIDER === 'anthropic') {
        aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': HEMO_AI_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: Deno.env.get('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: 'You are a helpful AI assistant specializing in blood donation matching. Provide clear, actionable recommendations.',
            messages: [{ role: 'user', content: aiPrompt }],
          }),
        });
        
        if (aiResponse.ok) {
          const claudeData = await aiResponse.json();
          aiSuggestion = claudeData.content?.[0]?.text || '';
        } else {
          const errorText = await aiResponse.text();
          console.error('AI API error:', aiResponse.status, errorText);
          aiSuggestion = 'AI suggestions are temporarily unavailable. Showing top donors based on donation history.';
        }
      } else {
        aiSuggestion = 'AI provider not supported. Showing heuristic-based donor matches.';
      }
    } else {
      aiSuggestion = 'HEMO_AI_API_KEY is not configured. Showing heuristic-based donor matches.';
    }

    // Return the AI analysis along with donor details
    // Prioritize eligible donors but also include ineligible ones (marked as such)
    const eligibleDonors = donorData.filter(d => d.isEligible);
    const ineligibleDonors = donorData.filter(d => !d.isEligible);
    
    // Sort eligible donors first
    const sortedEligible = eligibleDonors.sort((a, b) => {
        // Sort by donation count (descending) and days since last donation (ascending)
        if (a.donationCount !== b.donationCount) {
          return b.donationCount - a.donationCount;
        }
        return a.daysSinceLastDonation - b.daysSinceLastDonation;
    });

    // Sort ineligible donors (for reference)
    const sortedIneligible = ineligibleDonors.sort((a, b) => {
      if (a.donationCount !== b.donationCount) {
        return b.donationCount - a.donationCount;
      }
      return a.daysSinceLastDonation - b.daysSinceLastDonation;
    });

    // Combine: eligible first, then ineligible (limit to top 10 total)
    const allSuggestions = [...sortedEligible, ...sortedIneligible].slice(0, 10);

    const enrichedSuggestions = allSuggestions.map(donor => {
      const donorRecord = donors.find(d => d.id === donor.id);
      return {
        ...donor,
        donor: donorRecord,
      };
    });

    return new Response(
      JSON.stringify({ 
        suggestions: enrichedSuggestions,
        aiAnalysis: aiSuggestion,
        totalDonors: donors.length,
        eligibleDonors: eligibleDonors.length,
        ineligibleDonors: ineligibleDonors.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-donors function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
