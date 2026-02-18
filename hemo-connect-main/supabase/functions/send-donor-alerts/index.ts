// Deno global type declaration for Supabase Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DonorAlertRequest {
  requestId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { requestId }: DonorAlertRequest = await req.json();
    console.log('Processing alert for request:', requestId);

    if (!requestId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Request ID is required',
          notified: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the blood request details
    const { data: request, error: requestError } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Error fetching request:', requestError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Blood request not found: ${requestError?.message || 'Unknown error'}`,
          notified: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch hospital profile separately
    let hospitalName = 'Hospital';
    let hospitalAddress = '';
    let hospitalPhone = '';
    
    if (request.hospital_id) {
      const { data: hospitalProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, hospital_name, hospital_address, phone')
        .eq('id', request.hospital_id)
        .single();

      if (!profileError && hospitalProfile) {
        hospitalName = hospitalProfile.hospital_name || hospitalProfile.full_name || 'Hospital';
        hospitalAddress = hospitalProfile.hospital_address || '';
        hospitalPhone = hospitalProfile.phone || '';
      }
    }

    // Validate hospital_id exists
    if (!request.hospital_id) {
      console.error('Blood request missing hospital_id:', JSON.stringify(request, null, 2));
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Blood request is missing hospital information',
          notified: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing alert for hospital ${request.hospital_id}, blood group ${request.blood_group}`);

    // Find matching donors (same blood group, last donation > 90 days ago or null)
    // Only fetch donors belonging to the requesting hospital
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // First, fetch ALL donors for this hospital (without blood group filter to debug)
    const { data: allHospitalDonors, error: allHospitalDonorsError } = await supabase
      .from('donors')
      .select('*')
      .eq('hospital_id', request.hospital_id);

    console.log(`Found ${allHospitalDonors?.length || 0} total donors for hospital ${request.hospital_id}`);
    
    // Filter by blood group in JavaScript (case-insensitive, trim whitespace)
    const normalizedRequestBloodGroup = request.blood_group?.trim().toUpperCase();
    const allDonors = (allHospitalDonors || []).filter(donor => {
      const donorBloodGroup = donor.blood_group?.trim().toUpperCase();
      return donorBloodGroup === normalizedRequestBloodGroup;
    });

    const allDonorsError = allHospitalDonorsError;

    console.log(`Found ${allDonors?.length || 0} total donors with blood group ${request.blood_group} for hospital ${request.hospital_id}`);
    
    if (allDonors && allDonors.length > 0) {
      console.log('Donor details:', allDonors.map(d => ({
        id: d.id,
        name: d.full_name,
        blood_group: d.blood_group,
        last_donation_date: d.last_donation_date,
        hospital_id: d.hospital_id,
        user_id: d.user_id
      })));
    }

    if (allDonorsError) {
      console.error('Error fetching hospital donors:', allDonorsError);
      // Return error response with 200 status so frontend can handle it
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to fetch donors: ${allDonorsError.message}`,
          notified: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Filter donors based on eligibility: last donation must be at least 56 days ago (or never donated)
    const today = new Date();
    const fiftySixDaysAgo = new Date(today);
    fiftySixDaysAgo.setDate(today.getDate() - 56);

    // Also fetch registered donor users (from profiles) with matching blood group
    const { data: registeredDonors, error: registeredDonorsError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, location, blood_group')
      .not('blood_group', 'is', null);

    let registeredDonorsList: any[] = [];
    if (!registeredDonorsError && registeredDonors) {
      // Filter by blood group (case-insensitive)
      const matchingRegistered = registeredDonors.filter(profile => {
        const profileBloodGroup = profile.blood_group?.trim().toUpperCase();
        return profileBloodGroup === normalizedRequestBloodGroup;
      });

      // Check donation history for registered donors
      for (const profile of matchingRegistered) {
        const { data: lastDonation } = await (supabase.from as any)('donations')
          .select('donation_date')
          .eq('donor_user_id', profile.id)
          .order('donation_date', { ascending: false })
          .limit(1)
          .single();

        const lastDonationDate = lastDonation?.donation_date 
          ? new Date(lastDonation.donation_date) 
          : null;

        // Eligible if never donated or last donation was 56+ days ago
        const isEligible = !lastDonationDate || lastDonationDate <= fiftySixDaysAgo;

        if (isEligible) {
          registeredDonorsList.push({
            id: profile.id,
            full_name: profile.full_name,
            phone: profile.phone,
            location: profile.location || '',
            blood_group: profile.blood_group,
            last_donation_date: lastDonationDate?.toISOString().split('T')[0] || null,
            donation_count: 0, // Will be calculated if needed
            hospital_id: null,
            user_id: profile.id,
            email: null,
          });
        }
      }
    }

    // Filter hospital-managed donors: eligible if last donation was 56+ days ago or never donated
    const eligibleHospitalDonors = (allDonors || []).filter(donor => {
      if (!donor.last_donation_date) {
        // Never donated = eligible
        return true;
      }
      const lastDonationDate = new Date(donor.last_donation_date);
      // Eligible if last donation was 56+ days ago
      return lastDonationDate <= fiftySixDaysAgo;
    });

    // Combine eligible hospital donors and registered donors
    const donors = [...eligibleHospitalDonors, ...registeredDonorsList];

    console.log(`Found ${eligibleHospitalDonors.length} eligible hospital donors and ${registeredDonorsList.length} eligible registered donors (56+ days since last donation)`);

    console.log(`Found ${donors.length} eligible donors matching blood group ${request.blood_group} (normalized: ${normalizedRequestBloodGroup}) for hospital ${request.hospital_id} (56+ days since last donation)`);

    if (!donors || donors.length === 0) {
      const totalMatchingBloodGroup = (allDonors || []).length;
      console.log(`No eligible donors found (56+ days since last donation). Total donors with matching blood group: ${totalMatchingBloodGroup}`);
      if (allDonors && allDonors.length > 0) {
        console.log('Donor details (including ineligible):', allDonors.map(d => ({
          id: d.id,
          name: d.full_name,
          blood_group: d.blood_group,
          last_donation_date: d.last_donation_date,
          hospital_id: d.hospital_id,
          daysSinceLastDonation: d.last_donation_date 
            ? Math.floor((Date.now() - new Date(d.last_donation_date).getTime()) / (1000 * 60 * 60 * 24))
            : 'Never'
        })));
      }
      
      // Update request status even if no donors found
      await supabase
        .from('blood_requests')
        .update({ status: 'alert_sent' })
        .eq('id', requestId);
        
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No eligible donors found. Found ${totalMatchingBloodGroup} donors with blood group ${request.blood_group}, but none have waited 56+ days since their last donation.`,
          notified: 0,
          total: allHospitalDonors?.length || 0,
          matchingBloodGroup: request.blood_group,
          eligibleCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    const twilioConfigured = !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber);
    console.log(`Twilio configured: ${twilioConfigured} (Account SID: ${twilioAccountSid ? 'Yes' : 'No'}, Auth Token: ${twilioAuthToken ? 'Yes' : 'No'}, Phone: ${twilioPhoneNumber ? 'Yes' : 'No'})`);

    const urgencyEmoji = request.urgency_level === 'critical' ? '🚨' : 
                        request.urgency_level === 'urgent' ? '⚡' : 'ℹ️';
    
    // Create a concise SMS message that fits within Twilio trial account limits
    // Trial accounts: 70 chars for Unicode/emoji messages, 160 for standard
    // Keep it short and essential to avoid error 30044 (message too long)
    const hospitalShort = hospitalName.length > 20 ? hospitalName.substring(0, 17) + '...' : hospitalName;
    const addressShort = hospitalAddress && hospitalAddress.length > 25 
      ? hospitalAddress.substring(0, 22) + '...' 
      : (hospitalAddress || 'Address not provided');
    
    const patientShort = request.patient_name.length > 15 
      ? request.patient_name.substring(0, 12) + '...' 
      : request.patient_name;
    const hospitalContact = hospitalPhone || 'Contact not provided';
    
    // Compact message format - essential info only
    const smsMessage = `URGENT BLOOD NEEDED\n` +
      `Type: ${request.blood_group}\n` +
      `Units: ${request.units_needed}\n` +
      `Patient: ${patientShort}\n` +
      `Hospital: ${hospitalShort}\n` +
      `Address: ${addressShort}\n` +
      `Contact: ${hospitalContact}\n` +
      `"Save a life! Please respond if available"   HEMO LINK Team`;
    
    // Log the SMS message that will be sent
    console.log(`\n=== SMS MESSAGE TO BE SENT ===`);
    console.log(smsMessage);
    console.log(`Message length: ${smsMessage.length} characters`);
    console.log(`Unicode/emoji: ${smsMessage.length <= 70 ? '✅ Within limit' : '❌ TOO LONG (max 70 for trial)'}`);
    console.log(`Standard SMS: ${smsMessage.length <= 160 ? '✅ Within limit' : '❌ TOO LONG (max 160)'}`);
    console.log(`=== END SMS MESSAGE ===\n`);

    // Email HTML template
    const createEmailHtml = (donorName: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0;">🩸 URGENT BLOOD NEEDED</h1>
        </div>
        <div style="background: #fff; border: 1px solid #e5e5e5; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Dear <strong>${donorName}</strong>,</p>
          <p style="font-size: 16px;">A patient urgently needs blood donation. Your blood type matches!</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Blood Type:</strong> ${request.blood_group}</p>
            <p style="margin: 5px 0;"><strong>Units Needed:</strong> ${request.units_needed}</p>
            <p style="margin: 5px 0;"><strong>Urgency:</strong> <span style="color: #dc2626; font-weight: bold;">${request.urgency_level.toUpperCase()}</span></p>
            <p style="margin: 5px 0;"><strong>Patient:</strong> ${request.patient_name}</p>
            <p style="margin: 5px 0;"><strong>Contact:</strong> ${request.patient_contact}</p>
            <p style="margin: 5px 0;"><strong>Hospital:</strong> ${hospitalName}</p>
            ${hospitalAddress ? `<p style="margin: 5px 0;"><strong>Address:</strong> ${hospitalAddress}</p>` : ''}
          </div>
          
          <p style="font-size: 16px; color: #dc2626; font-weight: bold;">Your donation can save a life! Please respond if available.</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Thank you for being a blood donor. 💜<br>
            - HEMO LINK Team
          </p>
        </div>
      </div>
    `;

    // Helper function to format and validate phone number with country code
    const formatPhoneNumber = (phone: string): { formatted: string; valid: boolean; error?: string } => {
      if (!phone) {
        return { formatted: '', valid: false, error: 'Phone number is empty' };
      }
      
      // Remove all spaces, dashes, parentheses, and other formatting
      const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
      
      // Handle Indian numbers (most common case)
      if (cleaned.startsWith('+91')) {
        const number = cleaned.substring(3);
        // Indian mobile numbers must be 10 digits and start with 6, 7, 8, or 9
        if (number.length === 10 && /^[6-9]\d{9}$/.test(number)) {
          return { formatted: '+91' + number, valid: true };
        } else {
          return { formatted: cleaned, valid: false, error: `Invalid Indian mobile number. Must be 10 digits starting with 6-9. Got: ${number} (length: ${number.length})` };
        }
      }
      
      if (cleaned.startsWith('91') && cleaned.length === 12) {
        const number = cleaned.substring(2);
        if (/^[6-9]\d{9}$/.test(number)) {
          return { formatted: '+' + cleaned, valid: true };
        } else {
          return { formatted: '+' + cleaned, valid: false, error: `Invalid Indian mobile number. Must be 10 digits starting with 6-9. Got: ${number}` };
        }
      }
      
      if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
        return { formatted: '+91' + cleaned, valid: true };
      }
      
      // For other international numbers, basic validation
      if (cleaned.length < 10) {
        return { formatted: cleaned.startsWith('+') ? cleaned : '+' + cleaned, valid: false, error: `Phone number too short (${cleaned.length} digits). Minimum 10 digits required.` };
      }
      
      // For other international numbers, ensure they start with +
      return { formatted: cleaned.startsWith('+') ? cleaned : '+' + cleaned, valid: true };
    };

    // Log comprehensive summary before sending notifications
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 NOTIFICATION SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total donors to notify: ${donors.length}`);
    console.log(`Twilio configured: ${twilioConfigured}`);
    console.log(`Hospital: ${hospitalName}`);
    console.log(`Blood Group: ${request.blood_group}`);
    console.log(`Units Needed: ${request.units_needed}`);
    console.log(`Urgency: ${request.urgency_level}`);
    
    if (donors.length > 0) {
      console.log(`\n📱 Donor Details:`);
      donors.forEach((d, index) => {
        const phoneValidation = d.phone ? formatPhoneNumber(d.phone) : null;
        console.log(`   ${index + 1}. ${d.full_name}`);
        console.log(`      Phone: ${d.phone || 'NOT PROVIDED'}`);
        if (phoneValidation) {
          console.log(`      Formatted: ${phoneValidation.formatted}`);
          console.log(`      Valid: ${phoneValidation.valid ? '✅' : '❌'} ${phoneValidation.error || ''}`);
        } else {
          console.log(`      Formatted: N/A`);
        }
        console.log(`      Email: ${d.email || 'NOT PROVIDED'}`);
      });
    }
    console.log(`${'='.repeat(60)}\n`);

    const notificationResults = await Promise.allSettled(
      donors.map(async (donor) => {
        let smsSuccess = false;
        let emailSuccess = false;

        // Try SMS first if Twilio is configured
        console.log(`\n--- Processing SMS for ${donor.full_name} ---`);
        console.log(`Twilio configured check: Account SID=${!!twilioAccountSid}, Auth Token=${!!twilioAuthToken}, Phone=${!!twilioPhoneNumber}`);
        
        if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
          console.log(`✅ Twilio is configured, proceeding with SMS...`);
          try {
            if (!donor.phone) {
              console.warn(`⚠️  Skipping SMS for ${donor.full_name}: No phone number in donor record`);
            } else {
              console.log(`📱 Donor has phone number: ${donor.phone}`);
              const phoneValidation = formatPhoneNumber(donor.phone);
              console.log(`📱 Phone validation result:`, phoneValidation);
              
              // Validate phone number format before sending
              if (!phoneValidation.valid) {
                console.error(`❌ INVALID PHONE NUMBER for ${donor.full_name}:`);
                console.error(`   Original: ${donor.phone}`);
                console.error(`   Formatted: ${phoneValidation.formatted}`);
                console.error(`   Error: ${phoneValidation.error}`);
                console.error(`   ⚠️  This phone number will cause Twilio error 30044 (Invalid phone number)`);
              } else {
                const formattedPhone = phoneValidation.formatted;
                console.log(`✅ Phone number validated successfully: ${formattedPhone}`);
                console.log(`\n🚀 ATTEMPTING TO SEND SMS:`);
                console.log(`   To: ${formattedPhone} (${donor.full_name})`);
                console.log(`   From: ${twilioPhoneNumber}`);
                console.log(`   Message length: ${smsMessage.length} characters`);
                console.log(`   Message preview: ${smsMessage.substring(0, 100)}...`);
              
              const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
                  },
                  body: new URLSearchParams({
                    To: formattedPhone,
                    From: twilioPhoneNumber,
                    Body: smsMessage,
                  }),
                }
              );

              const responseData = await response.text();
              
              // Log raw response for debugging
              console.log(`Raw Twilio response for ${donor.full_name}:`, responseData);
              
              if (response.ok) {
                try {
                  const twilioResponse = JSON.parse(responseData);
                  
                  // Log COMPLETE Twilio response with all fields
                  console.log(`=== FULL Twilio API response for ${donor.full_name} ===`);
                  console.log(JSON.stringify(twilioResponse, null, 2));
                  console.log(`=== End of Twilio response ===`);
                  
                  // Extract key fields
                  const messageStatus = twilioResponse.status;
                  const messageSid = twilioResponse.sid;
                  const errorCode = twilioResponse.error_code;
                  const errorMessage = twilioResponse.error_message;
                  const uri = twilioResponse.uri;
                  
                  console.log(`Twilio response summary for ${donor.full_name}:`, {
                    status: messageStatus,
                    sid: messageSid,
                    to: twilioResponse.to,
                    from: twilioResponse.from,
                    error_code: errorCode,
                    error_message: errorMessage,
                    uri: uri
                  });
                  
                  // Check for errors first
                  if (errorCode || errorMessage) {
                    console.error(`❌ Twilio ERROR for ${donor.full_name}:`, {
                      code: errorCode,
                      message: errorMessage,
                      status: messageStatus
                    });
                    // Common error codes:
                    // 21211 - Invalid 'To' phone number
                    // 21608 - Unverified number (trial account restriction)
                    // 21610 - Unsubscribed recipient
                    // 30044 - Message exceeded segment length for Trial accounts
                    if (errorCode === 30044) {
                      console.error(`\n🚨 TWILIO ERROR 30044: Message Too Long for Trial Account`);
                      console.error(`   The message exceeded the segment length allowed for Trial accounts.`);
                      console.error(`   Current message length: ${smsMessage.length} characters`);
                      console.error(`   Trial account limits:`);
                      console.error(`   - Unicode/emoji messages: 70 characters max`);
                      console.error(`   - Standard messages: 160 characters max`);
                      console.error(`   Solution: Shorten the message or upgrade to a paid Twilio account.`);
                      console.error(`   Message sent: ${smsMessage.substring(0, 100)}...`);
                    } else if (errorCode === 21608) {
                      console.error(`⚠️  WARNING: Phone number ${formattedPhone} is not verified in Twilio. Trial accounts can only send to verified numbers.`);
                    } else if (errorCode === 21211) {
                      console.error(`⚠️  WARNING: Invalid 'To' phone number format: ${formattedPhone}`);
                    }
                  } else if (messageStatus === 'queued' || messageStatus === 'sending' || messageStatus === 'sent') {
                    console.log(`✅ SMS accepted by Twilio for ${donor.full_name} at ${formattedPhone}`);
                    console.log(`   Status: ${messageStatus}`);
                    console.log(`   Message SID: ${messageSid}`);
                    console.log(`   Note: Status "${messageStatus}" means Twilio accepted the message, but delivery is not guaranteed.`);
                    console.log(`   For trial accounts, SMS will only be sent to verified phone numbers.`);
                    smsSuccess = true;
                  } else if (messageStatus === 'delivered') {
                    console.log(`✅✅ SMS DELIVERED to ${donor.full_name} at ${formattedPhone} (Status: ${messageStatus})`);
                    smsSuccess = true;
                  } else if (messageStatus === 'undelivered' || messageStatus === 'failed') {
                    console.error(`❌ SMS FAILED to deliver to ${donor.full_name} at ${formattedPhone} (Status: ${messageStatus})`);
                  } else {
                    console.warn(`⚠️  Unknown Twilio status for ${donor.full_name}: ${messageStatus}`);
                    console.log(`   Full response:`, JSON.stringify(twilioResponse, null, 2));
                  }
                } catch (parseError) {
                  // Response is not JSON, but status is OK
                  console.log(`⚠️  Twilio returned non-JSON response for ${donor.full_name} at ${formattedPhone}`);
                  console.log(`   Raw response:`, responseData);
                  console.log(`   Parse error:`, parseError);
                  smsSuccess = true;
                }
              } else {
                console.error(`SMS failed for ${donor.full_name} at ${formattedPhone}:`, response.status, responseData);
                // Try to parse error for better logging
                try {
                  const errorJson = JSON.parse(responseData);
                  console.error(`Twilio error details:`, {
                    code: errorJson.code,
                    message: errorJson.message,
                    more_info: errorJson.more_info,
                    status: errorJson.status
                  });
                } catch (e) {
                  console.error(`Twilio error (non-JSON):`, responseData);
                }
              }
              }
            }
          } catch (error) {
            console.error(`SMS error for ${donor.full_name}:`, error);
          }
        } else {
          console.error(`❌ SKIPPING SMS for ${donor.full_name}: Twilio NOT configured`);
          console.error(`   Missing: Account SID=${!twilioAccountSid}, Auth Token=${!twilioAuthToken}, Phone=${!twilioPhoneNumber}`);
          console.error(`   To enable SMS, set these Supabase secrets:`);
          console.error(`   - TWILIO_ACCOUNT_SID`);
          console.error(`   - TWILIO_AUTH_TOKEN`);
          console.error(`   - TWILIO_PHONE_NUMBER`);
        }

        // Send email as fallback (or always for reliability)
        if (donor.email && resend) {
          try {
            console.log(`Sending email notification to ${donor.full_name} at ${donor.email}`);
          
            const emailResponse = await resend.emails.send({
              from: 'HEMO LINK <onboarding@resend.dev>',
              to: [donor.email],
              subject: `🚨 URGENT: ${request.blood_group} Blood Needed - HEMO LINK`,
              html: createEmailHtml(donor.full_name),
            });

            if (emailResponse.error) {
              console.error(`Email failed for ${donor.full_name}:`, emailResponse.error);
            } else {
              console.log(`Email sent successfully to ${donor.full_name}`);
              emailSuccess = true;
            }
          } catch (error) {
            console.error(`Email error for ${donor.full_name}:`, error);
          }
        }

        return { 
          success: smsSuccess || emailSuccess, 
          donor: donor.full_name,
          smsSuccess,
          emailSuccess
        };
      })
    );

    const successCount = notificationResults.filter(
      (result) => result.status === 'fulfilled' && result.value.success
    ).length;

    const smsSuccessCount = notificationResults.filter(
      (result) => result.status === 'fulfilled' && result.value.smsSuccess
    ).length;

    const emailSuccessCount = notificationResults.filter(
      (result) => result.status === 'fulfilled' && result.value.emailSuccess
    ).length;

    const failedResults = notificationResults.filter(
      (result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    );

    // Update request status to alert_sent
    await supabase
      .from('blood_requests')
      .update({ status: 'alert_sent' })
      .eq('id', requestId);

    console.log(`Successfully notified ${successCount}/${donors.length} donors (SMS: ${smsSuccessCount}, Email: ${emailSuccessCount})`);
    
    if (!twilioConfigured) {
      console.warn('Twilio is not configured. SMS notifications are disabled. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.');
    } else if (smsSuccessCount > 0) {
      console.log(`\n📱 SMS TROUBLESHOOTING INFO:`);
      console.log(`   - ${smsSuccessCount} SMS messages were accepted by Twilio`);
      console.log(`   - If SMS is not received, check the Twilio Console: https://console.twilio.com/`);
      console.log(`   - Look for Message SIDs in the logs above and check their status in Twilio Console`);
      console.log(`   - Common issues:`);
      console.log(`     * Trial accounts can only send to verified phone numbers`);
      console.log(`     * Phone numbers must be in E.164 format (+91XXXXXXXXXX)`);
      console.log(`     * Check Twilio account balance/credits`);
      console.log(`     * Verify phone numbers in Twilio Console → Phone Numbers → Verified Caller IDs`);
    }

    const message = twilioConfigured 
      ? `Alerts sent to ${successCount} matching donors (SMS: ${smsSuccessCount}, Email: ${emailSuccessCount})`
      : `Alerts sent to ${successCount} matching donors (Email: ${emailSuccessCount}). SMS disabled - Twilio not configured.`;

    return new Response(
      JSON.stringify({
        success: true,
        message: message,
        notified: successCount,
        total: donors.length,
        smsSuccess: smsSuccessCount,
        emailSuccess: emailSuccessCount,
        twilioConfigured: twilioConfigured,
        failedCount: failedResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-donor-alerts function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An unexpected error occurred',
        notified: 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
