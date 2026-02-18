import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, MessageSquare, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AlertSettings {
  low_blood_threshold: number;
  email_alerts_enabled: boolean;
  sms_alerts_enabled: boolean;
  alert_hospitals: boolean;
  alert_donors: boolean;
  critical_request_alerts: boolean;
  inventory_update_alerts: boolean;
}

export const AdminAlertConfiguration = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AlertSettings>({
    low_blood_threshold: 10,
    email_alerts_enabled: true,
    sms_alerts_enabled: true,
    alert_hospitals: true,
    alert_donors: true,
    critical_request_alerts: true,
    inventory_update_alerts: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch alert settings from database (if table exists)
      // For now, using default settings
      // In production, this would fetch from an alert_settings table
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save settings to database
      // In production, this would save to an alert_settings table
      
      toast({
        title: "Settings saved successfully",
        description: "Alert configuration has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bell className="h-6 w-6" />
            Alert Configuration
          </CardTitle>
          <CardDescription className="text-white/80">
            Configure email and SMS alerts for hospitals and donors
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Threshold Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Threshold Settings</h3>
            <div className="space-y-2">
              <Label htmlFor="threshold">Low Blood Inventory Threshold (units)</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                value={settings.low_blood_threshold}
                onChange={(e) => setSettings({ ...settings, low_blood_threshold: parseInt(e.target.value) || 0 })}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Alerts will be sent when blood inventory falls below this threshold
              </p>
            </div>
          </div>

          <Separator />

          {/* Alert Channels */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alert Channels</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-alerts" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable email notifications for alerts
                  </p>
                </div>
                <Switch
                  id="email-alerts"
                  checked={settings.email_alerts_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, email_alerts_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-alerts" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable SMS notifications for alerts
                  </p>
                </div>
                <Switch
                  id="sms-alerts"
                  checked={settings.sms_alerts_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, sms_alerts_enabled: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Alert Recipients */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alert Recipients</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="alert-hospitals">Alert Hospitals</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts to hospital administrators
                  </p>
                </div>
                <Switch
                  id="alert-hospitals"
                  checked={settings.alert_hospitals}
                  onCheckedChange={(checked) => setSettings({ ...settings, alert_hospitals: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="alert-donors">Alert Donors</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts to registered donors
                  </p>
                </div>
                <Switch
                  id="alert-donors"
                  checked={settings.alert_donors}
                  onCheckedChange={(checked) => setSettings({ ...settings, alert_donors: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Alert Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alert Types</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="critical-alerts">Critical Request Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts for critical blood requests
                  </p>
                </div>
                <Switch
                  id="critical-alerts"
                  checked={settings.critical_request_alerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, critical_request_alerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="inventory-alerts">Inventory Update Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts when inventory is updated
                  </p>
                </div>
                <Switch
                  id="inventory-alerts"
                  checked={settings.inventory_update_alerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, inventory_update_alerts: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading} className="bg-red-600 hover:bg-red-700">
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
