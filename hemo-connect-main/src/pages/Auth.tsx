import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplet, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { getUserRole, UserRole } from "@/utils/userRole";

type RegistrationRole = Extract<UserRole, "donor" | "hospital">;

// Validation schemas
const indianPhoneSchema = z.string()
  .regex(/^(\+91)?[6-9]\d{9}$/, "Please enter a valid Indian phone number (10 digits starting with 6-9)");

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[@$!%*?&#]/, "Password must contain at least one special character (@$!%*?&#)");

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<RegistrationRole>("donor");
  const [isLoading, setIsLoading] = useState(false);

  // Validation errors
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [location, setLocation] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const userRole = await getUserRole();
        navigate(userRole === "donor" ? "/donor" : "/dashboard");
      }
    };
    redirectIfLoggedIn();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast({
        title: "Login successful!",
        description: "Welcome back to HEMO LINK",
      });

      const userRole = await getUserRole();
      navigate(userRole === "donor" ? "/donor" : "/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validatePhone = (phone: string) => {
    try {
      indianPhoneSchema.parse(phone);
      setPhoneError("");
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setPhoneError(error.errors[0].message);
      }
      return false;
    }
  };

  const validatePassword = (password: string) => {
    try {
      passwordSchema.parse(password);
      setPasswordError("");
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setPasswordError(error.errors[0].message);
      }
      return false;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!registerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    if (!registerEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number
    if (!validatePhone(registerPhone)) {
      toast({
        title: "Invalid phone number",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }

    // Validate donor-specific fields
    if (role === "donor" && !bloodGroup) {
      toast({
        title: "Blood group required",
        description: "Please select your blood group.",
        variant: "destructive",
      });
      return;
    }

    if (role === "donor" && !location?.trim()) {
      toast({
        title: "Location required",
        description: "Please enter your location.",
        variant: "destructive",
      });
      return;
    }

    // Validate hospital-specific fields
    if (role === "hospital" && !hospitalAddress?.trim()) {
      toast({
        title: "Hospital address required",
        description: "Please enter the hospital address.",
        variant: "destructive",
      });
      return;
    }

    // Validate password
    if (!validatePassword(registerPassword)) {
      toast({
        title: "Invalid password",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { role },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from signup");

      // Use database function to create profile and role
      // This works even if email confirmation is required
      const { error: createProfileError } = await (supabase.rpc as any)('create_user_profile_and_role', {
        p_user_id: authData.user.id,
        p_full_name: registerName,
        p_phone: registerPhone,
        p_role: role,
        p_blood_group: role === "donor" ? bloodGroup : null,
        p_location: role === "donor" ? location : null,
        p_hospital_name: role === "hospital" ? registerName : null,
        p_hospital_address: role === "hospital" ? hospitalAddress : null,
      });

      if (createProfileError) {
        // Fallback to direct insertion if function fails (for backward compatibility)
        console.warn('Function call failed, trying direct insertion:', createProfileError);
        
        // Try direct insertion
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          full_name: registerName,
          phone: registerPhone,
          blood_group: role === "donor" ? bloodGroup : null,
          location: role === "donor" ? location : null,
          hospital_name: role === "hospital" ? registerName : null,
          hospital_address: role === "hospital" ? hospitalAddress : null,
        });

        if (profileError) throw profileError;

        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: role,
        });

        if (roleError) throw roleError;
      }

      toast({
        title: "Registration successful!",
        description: "Your account has been created. Redirecting to your portal...",
      });

      const destination = role === "donor" ? "/donor" : "/dashboard";
      // Small delay to ensure role is saved before redirect
      setTimeout(() => {
        navigate(destination);
      }, 500);
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Provide more specific error messages
      let errorMessage = "Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
        
        // Handle common Supabase errors
        if (error.message.includes("User already registered")) {
          errorMessage = "This email is already registered. Please use the login page.";
        } else if (error.message.includes("Password")) {
          errorMessage = "Password does not meet requirements. Please check and try again.";
        } else if (error.message.includes("Email")) {
          errorMessage = "Invalid email address. Please check and try again.";
        } else if (error.message.includes("phone")) {
          errorMessage = "Invalid phone number. Please enter a valid Indian phone number.";
        } else if (error.message.includes("violates row-level security") || error.message.includes("RLS")) {
          errorMessage = "Registration failed due to security policy. Please contact support.";
        }
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        
        <Card className="shadow-strong">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Droplet className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to HEMO LINK</CardTitle>
            <CardDescription>
              Sign in to manage blood donations and save lives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Register As</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as RegistrationRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="donor">Donor</SelectItem>
                        <SelectItem value="hospital">Hospital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-name">
                      {role === "hospital" ? "Hospital Name" : "Full Name"}
                    </Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder={role === "hospital" ? "City General Hospital" : ""}
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Phone Number</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="+91 9876543210 "
                      value={registerPhone}
                      onChange={(e) => {
                        setRegisterPhone(e.target.value);
                        validatePhone(e.target.value);
                      }}
                      className={phoneError ? "border-destructive" : ""}
                      required
                    />
                    {phoneError && (
                      <p className="text-sm text-destructive">{phoneError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      
                    </p>
                  </div>

                  {role === "donor" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="blood-group">Blood Group</Label>
                        <Select value={bloodGroup} onValueChange={setBloodGroup}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          type="text"
                          placeholder="City, State"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {role === "hospital" && (
                    <div className="space-y-2">
                      <Label htmlFor="address">Hospital Address</Label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="123 Medical Center Blvd"
                        value={hospitalAddress}
                        onChange={(e) => setHospitalAddress(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        validatePassword(e.target.value);
                      }}
                      className={passwordError ? "border-destructive" : ""}
                      required
                    />
                    {passwordError && (
                      <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
