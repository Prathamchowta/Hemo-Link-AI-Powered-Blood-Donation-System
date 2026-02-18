import { supabase } from "@/integrations/supabase/client";

export type UserRole = "donor" | "hospital" | "admin";

/**
 * Fetches the user's role.
 *
 * For now we read the role from the authenticated user's metadata instead of
 * querying the `user_roles` table. This avoids 500 errors when that table
 * doesn't exist or migrations haven't been applied yet.
 */
export const getUserRole = async (): Promise<UserRole | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Prefer a `role` field stored in the user's metadata
    const metadataRole = (user.user_metadata as any)?.role as UserRole | undefined;

    if (metadataRole === "donor" || metadataRole === "hospital" || metadataRole === "admin") {
      return metadataRole;
    }

    // Fallback to user_roles table for legacy accounts
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user role:", error);
      return null;
    }

    return (data?.role as UserRole) || "hospital";
  } catch (error) {
    console.error("Error in getUserRole:", error);
    return null;
  }
};

