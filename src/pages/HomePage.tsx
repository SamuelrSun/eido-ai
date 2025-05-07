
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const HomePage = () => {
  const features = [
    {
      title: "Cyber Coach",
      description: "Get personalized cybersecurity guidance from our AI coach",
      icon: "🤖",
      link: "/cyber-coach",
    },
    {
      title: "Policy Center",
      description: "Access and manage your organization's security policies",
      icon: "📝",
      link: "/policy-center",
    },
    {
      title: "Admin Panel",
      description: "Manage users, settings and customize your experience",
      icon: "⚙️",
      link: "/admin",
    }
  ];

  const stats = [
    { label: "Protected Endpoints", value: "1,200+" },
    { label: "Security Incidents Prevented", value: "350+" },
    { label: "Compliance Score", value: "98%" },
    { label: "Time Saved", value: "32 hrs/week" },
  ];

  return (
    <div className="space-y-12 pb-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-cybercoach-blue-dark">
          Welcome to CyberCoach
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Your all-in-one platform for cybersecurity guidance, policy management, and compliance.
        </p>
        <div className="pt-4">
          <Link to="/cyber-coach">
            <Button size="lg" className="mx-2">
              Get Started with Cyber Coach
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/policy-center">
            <Button size="lg" variant="outline" className="mx-2">
              View Policy Center
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-cybercoach-blue/5 py-6 px-4 rounded-xl">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-cybercoach-blue">{stat.value}</div>
            <div className="text-gray-600 text-sm md:text-base">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div>
        <h2 className="text-2xl font-bold text-center mb-8">Powerful Security Tools</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Link to={feature.link} key={index} className="block">
              <Card className="h-full transition-all hover:shadow-md">
                <CardHeader>
                  <div className="text-3xl mb-2">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="group">
                    Learn more
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-cybercoach-blue-dark text-white p-8 rounded-xl text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to strengthen your security posture?</h2>
        <p className="mb-6 text-gray-200">
          Our AI-driven platform helps you identify and address security risks before they become threats.
        </p>
        <Link to="/cyber-coach">
          <Button size="lg" variant="secondary">
            Talk to Cyber Coach Now
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
