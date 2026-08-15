import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("You must be logged in.");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, service);
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid login session.");
    const callerId = userData.user.id;
    const { data: caller, error: callerError } = await admin.from("users").select("role").eq("id", callerId).single();
    if (callerError || caller?.role !== "super_admin") throw new Error("Only Super Admin can manage user accounts.");

    const body = await req.json();
    const action = body.action;
    const slugFor: Record<string, string> = { store_admin: "store", real_estate_admin: "real-estate", motors_admin: "motors" };

    if (action === "list") {
      const { data: profiles, error } = await admin.from("users").select("id, full_name, role, branch_id, branches(name)").order("full_name");
      if (error) throw error;
      const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (authError) throw authError;
      const emails = new Map(authUsers.users.map((u) => [u.id, u.email ?? ""]));
      return Response.json({ admins: (profiles ?? []).map((p: any) => ({ ...p, email: emails.get(p.id) ?? "", branch_name: p.branches?.name ?? null })) }, { headers: corsHeaders });
    }

    if (action === "create") {
      const { full_name, email, password, role } = body;
      if (!full_name || !email || !password || !slugFor[role]) throw new Error("Name, email, password, and a valid branch role are required.");
      const { data: branch, error: branchError } = await admin.from("branches").select("id").eq("slug", slugFor[role]).single();
      if (branchError || !branch) throw new Error("The selected branch could not be found.");
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (createError || !created.user) throw new Error(createError?.message ?? "Could not create login account.");
      const { error: profileError } = await admin.from("users").insert({ id: created.user.id, full_name, role, branch_id: branch.id });
      if (profileError) { await admin.auth.admin.deleteUser(created.user.id); throw profileError; }
      return Response.json({ success: true, message: `${full_name} was created successfully.` }, { headers: corsHeaders });
    }

    if (action === "update") {
      const { user_id, role } = body;
      if (!user_id || !slugFor[role]) throw new Error("A valid user and branch role are required.");
      if (user_id === callerId) throw new Error("You cannot change your own Super Admin role here.");
      const { data: branch, error: branchError } = await admin.from("branches").select("id").eq("slug", slugFor[role]).single();
      if (branchError || !branch) throw new Error("The selected branch could not be found.");
      const { error } = await admin.from("users").update({ role, branch_id: branch.id }).eq("id", user_id);
      if (error) throw error;
      return Response.json({ success: true, message: "Admin role updated." }, { headers: corsHeaders });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) throw new Error("User is required.");
      if (user_id === callerId) throw new Error("You cannot delete your own account.");
      const { data: target, error: targetError } = await admin.from("users").select("role").eq("id", user_id).single();
      if (targetError) throw targetError;
      if (target.role === "super_admin") throw new Error("Super Admin accounts cannot be deleted here.");
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return Response.json({ success: true, message: "Admin account deleted." }, { headers: corsHeaders });
    }

    throw new Error("Unknown action.");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400, headers: corsHeaders });
  }
});
