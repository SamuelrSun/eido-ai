
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

const HomePage = () => {
  const features = [
    {
      title: "Search",
      description: "Get personalized cybersecurity guidance from our AI coach",
      icon: "🤖",
      link: "/super-stu",
    },
    {
      title: "Flashcards",
      description: "Review concepts with interactive flashcards",
      icon: "📚",
      link: "/flashcards",
    },
    {
      title: "Quizzes",
      description: "Test your knowledge with quizzes",
      icon: "✅",
      link: "/quizzes",
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
      <PageHeader 
        title="Welcome to CyberCoach"
        description="Your all-in-one platform for cybersecurity guidance, policy management, and compliance."
      />

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
        <Link to="/super-stu">
          <Button size="lg" variant="secondary">
            Talk to SuperStu Now
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
