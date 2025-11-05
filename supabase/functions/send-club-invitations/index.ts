import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define the CORS headers to allow the function to be called from the browser
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${authHeader}` } } }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invites, clubInfo } = body as Partial<RequestBody>;
    if (
      !clubInfo ||
      typeof clubInfo.id !== "string" ||
      typeof clubInfo.name !== "string" ||
      typeof clubInfo.joinCode !== "string" ||
      !Array.isArray(invites) ||
      invites.length === 0 ||
      invites.some(
        (i) =>
          !i ||
          typeof i.name !== "string" ||
          i.name.trim() === "" ||
          typeof i.email !== "string" ||
          i.email.trim() === ""
      )
    ) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid invites/club info" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the user is the creator of the club or an admin
    const { data: clubData, error: clubError } = await supabaseClient
      .from("clubs")
      .select("created_by")
      .eq("id", clubInfo.id)
      .single();

    if (clubError || !clubData) {
      return new Response(JSON.stringify({ error: "Club not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is the club creator OR an active admin
    if (clubData.created_by !== user.id) {
      const { data: memberData, error: memberError } = await supabaseClient
        .from("club_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("club_id", clubInfo.id)
        .eq("is_active", true)
        .eq("status", "active")
        .maybeSingle();

      // Treat 406 (no rows) as "not found"
      const notAdmin =
        !!memberError || !memberData || memberData.role !== "admin";

      if (notAdmin) {
        return new Response(
          JSON.stringify({
            error: "Not authorized to invite members to this club",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Here you would implement the actual email sending logic
    // For now, we'll just log the invitations and return success
    //console. log(`Sending ${invites.length} invitations to join club ${clubInfo.name}`);

    // Mock "sending" invitations
    for (const invite of invites) {
      if (invite.name && invite.email) {
        //console. log(`Invitation to ${invite.email} (${invite.name}) to join ${clubInfo.name} with code ${clubInfo.joinCode}`);
        // Here you'd send an actual email
        // Example with Resend or SendGrid would go here
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: invites.filter((i) => i.name && i.email).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-club-invitations function:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
