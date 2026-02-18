import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole, UserRole } from "@/utils/userRole";
import HospitalDashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";

/**
 * Role-based router component that redirects users to the appropriate dashboard
 * based on their role after login
 */
export const RoleBasedRouter = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndRedirect();
  }, [navigate]);

  useEffect(() => {
    if (!loading && role === "donor") {
      navigate("/donor", { replace: true });
    }
  }, [loading, role, navigate]);

  const checkUserAndRedirect = async () => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch user role
      const userRole = await getUserRole();
      
      if (!userRole) {
        // If no role found, redirect to auth
        navigate("/auth");
        return;
      }

      setRole(userRole);
    } catch (error) {
      console.error("Error checking user role:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (role === "donor") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Redirecting to donor portal...</div>
      </div>
    );
  } else if (role === "admin") {
    return <AdminDashboard />;
  } else if (role === "hospital") {
    return <HospitalDashboard />;
  }

  // Fallback - should not reach here, but redirect to auth if it does
  return null;
};

