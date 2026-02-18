import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole, UserRole } from "@/utils/userRole";

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Ensures the user is authenticated and has one of the allowed roles
 * before rendering the protected children.
 */
export const RoleProtectedRoute = ({ allowedRoles, children }: RoleProtectedRouteProps) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const role = await getUserRole();
      if (role && allowedRoles.includes(role)) {
        setAuthorized(true);
      } else {
        navigate("/dashboard");
      }
      setChecking(false);
    };

    verifyAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, JSON.stringify(allowedRoles)]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
};


