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

interface DeleteUserRequest {
  userId: string;
  deleteAuthUser?: boolean; // Whether to delete from auth.users (default: true)
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authorization header is required'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify the requesting user is authenticated and is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unauthorized: Invalid authentication'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if the requesting user is an admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unauthorized: Admin access required'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { userId, deleteAuthUser = true }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'User ID is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Cannot delete your own account'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Deleting user ${userId} (deleteAuthUser: ${deleteAuthUser})`);

    // Delete from user_roles table
    const { error: roleDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (roleDeleteError) {
      console.error('Error deleting user role:', roleDeleteError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to delete user role: ${roleDeleteError.message}`
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Delete from profiles table
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to delete profile: ${profileDeleteError.message}`
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Delete from auth.users if requested (default: true)
    if (deleteAuthUser) {
      try {
        // Use Supabase Admin REST API to delete the auth user
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        
        const response = await fetch(
          `${supabaseUrl}/auth/v1/admin/users/${userId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to delete auth user via API:', errorText);
          // Don't fail the entire operation if auth user deletion fails
          // The user is already removed from user_roles and profiles
          console.warn('Auth user deletion failed, but user data has been removed from database');
        } else {
          console.log('Auth user deleted successfully via API');
        }
      } catch (authError: any) {
        console.error('Exception deleting auth user:', authError);
        // Continue - user data is already removed from database tables
        console.warn('Auth user deletion failed, but user data has been removed from database');
      }
    }

    // Also delete related data
    // Delete from donors table if exists
    await supabaseAdmin
      .from('donors')
      .delete()
      .eq('user_id', userId);

    // Delete from blood_requests if user is a hospital
    await supabaseAdmin
      .from('blood_requests')
      .delete()
      .eq('hospital_id', userId);

    // Delete from donations if exists
    await supabaseAdmin
      .from('donations')
      .delete()
      .eq('donor_id', userId);

    console.log(`User ${userId} deleted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User deleted successfully',
        userId: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in delete-user function:', error);
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

