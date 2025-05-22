
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define the CORS headers to allow the function to be called from the browser
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Invite {
  name: string;
  email: string;
}

interface ClubInfo {
  id: string;
  name: string;
  joinCode: string;
}

interface RequestBody {
  invites: Invite[];
  clubInfo: ClubInfo;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract auth token from header
    const authHeader = req.headers.get("authorization")?.split(" ")[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${authHeader}` } } }
    );
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse request body
    const { invites, clubInfo }: RequestBody = await req.json();
    
    if (!invites || !clubInfo) {
      return new Response(
        JSON.stringify({ error: "Missing invites or club info" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get sender's info
    const { data: senderData } = await supabaseClient
      .from("user_profiles")
      .select("email")
      .eq("id", user.id)
      .single();
    
    // Check if the user is an admin of the club
    const { data: memberData, error: memberError } = await supabaseClient
      .from("club_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("club_id", clubInfo.id)
      .single();
      
    if (memberError || !memberData || memberData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Not authorized to invite members to this club" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Here you would implement the actual email sending logic
    // For demonstration purposes, we'll just log the invitations and return success
    // In a real implementation, you would integrate with an email service like Resend, SendGrid, etc.
    
    console.log(`Sending ${invites.length} invitations to join club ${clubInfo.name}`);
    
    // Mock "sending" invitations
    for (const invite of invites) {
      if (invite.name && invite.email) {
        console.log(`Invitation to ${invite.email} (${invite.name}) to join ${clubInfo.name} with code ${clubInfo.joinCode}`);
        
        // Here you'd send an actual email
        // Example with Resend or SendGrid would go here
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, count: invites.filter(i => i.name && i.email).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in send-club-invitations function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
