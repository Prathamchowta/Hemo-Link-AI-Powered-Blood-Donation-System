// Deno global type declaration for Supabase Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateCertificateRequest {
  donationId: string;
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

    const { donationId }: GenerateCertificateRequest = await req.json();

    if (!donationId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Donation ID is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating certificate for donation:', donationId);

    // Fetch donation details
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .select('*')
      .eq('id', donationId)
      .single();

    if (donationError || !donation) {
      console.error('Error fetching donation:', donationError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Donation not found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch hospital information
    let hospitalName = 'Hospital';
    let hospitalAddress = '';
    let hospitalPhone = '';

    if (donation.hospital_id) {
      const { data: hospitalProfile, error: hospitalError } = await supabase
        .from('profiles')
        .select('hospital_name, full_name, hospital_address, phone')
        .eq('id', donation.hospital_id)
        .single();

      if (!hospitalError && hospitalProfile) {
        hospitalName = hospitalProfile.hospital_name || hospitalProfile.full_name || 'Hospital';
        hospitalAddress = hospitalProfile.hospital_address || '';
        hospitalPhone = hospitalProfile.phone || '';
      }
    }

    // Determine donor information
    let donorName = '';
    let donorPhone = '';
    let donorEmail = '';

    if (donation.donor_user_id) {
      // Registered donor user
      const { data: donorProfile, error: donorProfileError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', donation.donor_user_id)
        .single();

      if (!donorProfileError && donorProfile) {
        donorName = donorProfile.full_name || 'Donor';
        donorPhone = donorProfile.phone || '';
      } else {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Donor profile not found'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else if (donation.donor_id) {
      // Hospital-managed donor
      const { data: donor, error: donorError } = await supabase
        .from('donors')
        .select('full_name, phone, email')
        .eq('id', donation.donor_id)
        .single();

      if (!donorError && donor) {
        donorName = donor.full_name || 'Donor';
        donorPhone = donor.phone || '';
        donorEmail = donor.email || '';
      } else {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Donor information not found'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Donor information not found'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format donation date
    const donationDate = new Date(donation.donation_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate certificate content using AI
    const HEMO_AI_API_KEY = Deno.env.get('HEMO_AI_API_KEY');
    
    if (!HEMO_AI_API_KEY) {
      console.warn('HEMO_AI_API_KEY not configured, generating basic certificate');
    }

    // Create certificate HTML content
    const certificateHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blood Donation Certificate</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            position: relative;
        }
        .certificate {
            background: white;
            width: 800px;
            padding: 60px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            border: 8px solid #dc2626;
            position: relative;
        }
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: bold;
            color: #dc2626;
            opacity: 0.08;
            z-index: 1;
            pointer-events: none;
            white-space: nowrap;
            letter-spacing: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .certificate::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 2px solid #dc2626;
            pointer-events: none;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            color: #dc2626;
            font-size: 42px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 3px;
        }
        .header .subtitle {
            color: #666;
            font-size: 18px;
            font-style: italic;
        }
        .content {
            text-align: center;
            margin: 50px 0;
            position: relative;
            z-index: 2;
        }
        .content p {
            font-size: 20px;
            line-height: 1.8;
            color: #333;
            margin-bottom: 20px;
        }
        .donor-name {
            font-size: 36px;
            font-weight: bold;
            color: #dc2626;
            margin: 30px 0;
            text-decoration: underline;
            text-decoration-color: #dc2626;
        }
        .details {
            margin: 40px 0;
            padding: 30px;
            background: #fef2f2;
            border-left: 4px solid #dc2626;
            position: relative;
            z-index: 2;
        }
        .details-row {
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
            font-size: 16px;
        }
        .details-label {
            font-weight: bold;
            color: #666;
        }
        .details-value {
            color: #333;
        }
        .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            z-index: 2;
        }
        .signature {
            text-align: center;
            flex: 1;
        }
        .signature-line {
            border-top: 2px solid #333;
            width: 200px;
            margin: 10px auto;
        }
        .signature-name {
            font-weight: bold;
            margin-top: 5px;
        }
        .certificate-id {
            position: absolute;
            bottom: 20px;
            right: 30px;
            font-size: 12px;
            color: #999;
            z-index: 2;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .certificate {
                box-shadow: none;
                border: 8px solid #dc2626;
            }
            .watermark {
                opacity: 0.05;
            }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="watermark">HEMO LINK</div>
        <div class="header" style="position: relative; z-index: 2;">
            <h1>Certificate of Appreciation</h1>
            <div class="subtitle">For Voluntary Blood Donation</div>
        </div>
        <div class="content">
            <p>This is to certify that</p>
            <div class="donor-name">${donorName}</div>
            <p>has voluntarily donated blood on <strong>${donationDate}</strong></p>
            <p>This noble act of generosity has the potential to save lives and make a significant difference in our community.</p>
        </div>
        <div class="details">
            <div class="details-row">
                <span class="details-label">Blood Group:</span>
                <span class="details-value"><strong>${donation.blood_group}</strong></span>
            </div>
            <div class="details-row">
                <span class="details-label">Units Donated:</span>
                <span class="details-value"><strong>${donation.units_donated}</strong></span>
            </div>
            <div class="details-row">
                <span class="details-label">Hospital:</span>
                <span class="details-value">${hospitalName}</span>
            </div>
            ${hospitalAddress ? `<div class="details-row">
                <span class="details-label">Hospital Address:</span>
                <span class="details-value">${hospitalAddress}</span>
            </div>` : ''}
        </div>
        <div class="footer">
            <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-name">${hospitalName}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">Authorized Signatory</div>
            </div>
            <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-name">Date</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">${donationDate}</div>
            </div>
        </div>
        <div class="certificate-id">
            Certificate ID: ${donation.id.substring(0, 8).toUpperCase()}
        </div>
    </div>
</body>
</html>
    `;

    // Store certificate in Supabase Storage
    const certificateFileName = `certificates/${donationId}.html`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(certificateFileName, certificateHtml, {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading certificate:', uploadError);
      // Try to create the bucket if it doesn't exist
      const { error: createBucketError } = await supabase.storage.createBucket('certificates', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['text/html', 'application/pdf']
      });

      if (createBucketError && !createBucketError.message.includes('already exists')) {
        console.error('Error creating bucket:', createBucketError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to create certificate storage'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Retry upload
      const { data: retryUpload, error: retryError } = await supabase.storage
        .from('certificates')
        .upload(certificateFileName, certificateHtml, {
          contentType: 'text/html',
          upsert: true
        });

      if (retryError) {
        console.error('Error on retry upload:', retryError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to upload certificate'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(certificateFileName);

    const certificateUrl = urlData.publicUrl;

    // Update donation record
    const { error: updateError } = await supabase
      .from('donations')
      .update({
        certificate_generated: true,
        certificate_url: certificateUrl
      })
      .eq('id', donationId);

    if (updateError) {
      console.error('Error updating donation:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to update donation record'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Certificate generated successfully:', certificateUrl);

    return new Response(
      JSON.stringify({
        success: true,
        certificateUrl: certificateUrl,
        donationId: donationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-certificate function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);

