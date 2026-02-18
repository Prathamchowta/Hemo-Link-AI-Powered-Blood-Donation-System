import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Activity, Droplet, Heart, Users, AlertCircle, Award, Shield, Zap, Globe, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero text-white py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Droplet className="h-16 w-16 animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            HEMO LINK
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            AI-Powered Blood Donation  System
          </p>
          <p className="text-lg mb-10 text-white/80 max-w-3xl mx-auto">
            Connecting donors, hospitals, and blood banks to save lives through intelligent emergency response and streamlined blood inventory management
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="gap-2">
                <Users className="h-5 w-5" />
                Get Started
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => document.getElementById('learn-more')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Learn More Section */}
      <section id="learn-more" className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How HEMO LINK Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Learn more about our comprehensive blood donation management platform
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Secure & Reliable Platform</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-4">
                HEMO LINK is built with enterprise-grade security to protect sensitive donor and patient information. 
                Our platform uses encrypted data storage, secure authentication, and follows healthcare compliance standards. 
                All blood inventory data is updated in real-time and synchronized across hospitals, ensuring accuracy and 
                reliability when every second counts.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-emergency" />
                  <span>Instant Emergency Response</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-4">
                When a hospital submits an urgent blood request, our AI system instantly analyzes donor eligibility based 
                on blood type compatibility, donation history (90-day rule), and location proximity. Eligible donors receive 
                immediate SMS notifications with patient details and urgency level. This automated process reduces response 
                time from hours to minutes, significantly improving patient outcomes in emergency situations.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-success" />
                  <span>AI-Powered Smart Matching</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-4">
                Our advanced AI matching algorithm goes beyond blood type compatibility. It considers multiple factors 
                including donor location, donation count (prioritizing experienced donors), last donation date, and historical 
                response patterns. The AI ranks donors and provides hospitals with the top 5 best matches, complete with 
                reasoning and recommendations. This intelligent matching increases donation success rates and optimizes 
                hospital resources.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-info" />
                  <span>Real-Time Inventory Management</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-4">
                Track blood units across all blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-) with live updates. 
                The system automatically monitors inventory levels and triggers low-stock alerts when units fall below 
                critical thresholds. Hospitals can update inventory instantly as donations are received or units are used, 
                ensuring accurate availability data at all times. This transparency helps prevent shortages and enables 
                better resource planning across the healthcare network.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-accent" />
                  <span>Comprehensive Donor Management</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-4">
                Maintain a complete donor database with detailed profiles including contact information, blood group, 
                location, donation history, and eligibility status. Track donation counts to recognize regular contributors 
                and monitor last donation dates to ensure donor health and safety. The system automatically calculates 
                eligibility based on the 90-day donation interval rule, protecting donor wellbeing while maximizing 
                availability for emergency requests.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-warning" />
                  <span>Recognition & Engagement</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-4">
                The system tracks donation milestones (1st, 5th, 10th, 25th donations) to recognize regular contributors 
                and encourage continued participation. Donors can view their complete donation history and track their 
                contributions over time. This engagement approach increases donor retention and encourages regular participation 
                in life-saving blood donation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <span>24/7 AI Assistant</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-4">
                Our intelligent chatbot provides round-the-clock support for hospitals and donors. It can answer questions 
                about donation eligibility criteria, explain system features, provide guidance on blood type compatibility, 
                and help users navigate the platform. The AI assistant uses natural language processing to understand queries 
                and provide accurate, helpful responses instantly, ensuring users always have access to information when they 
                need it.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-12 text-center">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-2xl">The Impact</CardTitle>
                <CardDescription className="text-base pt-2">
                  Every minute counts in blood emergencies. HEMO LINK reduces the time from emergency request to donor 
                  notification from hours to seconds. Our AI-powered system has the potential to save countless lives by 
                  ensuring the right blood reaches the right patient at the right time. Join us in building a more 
                  connected, responsive healthcare system.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comprehensive Blood Management Solution
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage blood donations, inventory, and emergency requests in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-medium hover:shadow-strong transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Donor Management</CardTitle>
                <CardDescription>
                  Complete donor registration, tracking, and engagement system with donation history
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-medium hover:shadow-strong transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 bg-info/10 rounded-lg flex items-center justify-center mb-4">
                  <Activity className="h-6 w-6 text-info" />
                </div>
                <CardTitle>Real-Time Inventory</CardTitle>
                <CardDescription>
                  Track blood units across all groups with live updates and critical alerts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-medium hover:shadow-strong transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 bg-emergency/10 rounded-lg flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-emergency" />
                </div>
                <CardTitle>Emergency Alerts</CardTitle>
                <CardDescription>
                  Instant SMS notifications to eligible donors for urgent blood requirements
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-medium hover:shadow-strong transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-success" />
                </div>
                <CardTitle>Smart Matching</CardTitle>
                <CardDescription>
                  AI-powered donor matching based on location, blood type, and eligibility
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-medium hover:shadow-strong transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Droplet className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>
                  24/7 chatbot support for guidance on donation eligibility and system navigation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-medium hover:shadow-strong transition-smooth">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Certificate Generation</CardTitle>
                <CardDescription>
                  Automated AI-generated certificates for donors upon donation completion with instant download access
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Emergency Response</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-success mb-2">100%</div>
              <div className="text-muted-foreground">Automated Alerts</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-info mb-2">AI</div>
              <div className="text-muted-foreground">Powered Matching</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-warning mb-2">Instant</div>
              <div className="text-muted-foreground">Certificates</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Save Lives?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join HEMO LINK today and be part of a life-saving network
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              <Heart className="h-5 w-5" />
              Join Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 HEMO LINK. Saving lives through technology.</p>
          <Link to="/admin" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-2 inline-block">
            ADMIN ACCESS
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
