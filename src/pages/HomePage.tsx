
import { useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";

const HomePage = () => {
  const [userName, setUserName] = useState<string>("Student");
  const [recentlyViewed, setRecentlyViewed] = useState([
    { title: "OSI Model", path: "/super-stu" },
    { title: "Network Security", path: "/super-stu" },
    { title: "VPN Concepts", path: "/super-stu" }
  ]);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
            
          if (profile?.full_name) {
            // Get the first name from the full name
            const firstName = profile.full_name.split(' ')[0];
            setUserName(firstName);
          } else {
            // Fallback to email if no name is available
            const emailName = user.email?.split('@')[0] || "Student";
            setUserName(emailName);
          }
          
          console.log("Profile data:", profile);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const studyOptions = [
    {
      title: "Ask SuperStu",
      description: "Get instant help with any subject or concept",
      emoji: "💬",
      link: "/super-stu",
    },
    {
      title: "Flashcards",
      description: "Review key concepts with spaced repetition",
      emoji: "📚",
      link: "/flashcards",
    },
    {
      title: "Quizzes",
      description: "Test your knowledge and track your progress",
      emoji: "✅",
      link: "/quizzes",
    }
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section with personalized greeting */}
      <PageHeader 
        title={`Hello, ${userName}!`}
        description="How would you like to study today?"
      />

      {/* Study Options */}
      <div className="grid md:grid-cols-3 gap-6">
        {studyOptions.map((option, index) => (
          <Link to={option.link} key={index} className="block">
            <Card className="h-full transition-all hover:shadow-md hover:border-blue-200">
              <CardHeader>
                <div className="mb-4 p-2 bg-blue-50 rounded-lg w-fit">
                  <span className="text-4xl">{option.emoji}</span>
                </div>
                <CardTitle>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="ghost" className="group text-blue-600">
                  Start now
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recently Viewed Topics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recently Viewed Topics</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/super-stu">View All</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentlyViewed.map((item, index) => (
            <Link to={item.path} key={index}>
              <Card className="hover:bg-gray-50">
                <CardContent className="flex justify-between items-center p-4">
                  <span className="font-medium">{item.title}</span>
                  <ArrowRight className="h-4 w-4" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/upload">
            <Card className="hover:bg-gray-50 text-center p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <span className="text-2xl">📤</span>
                </div>
                <span className="font-medium">Upload Materials</span>
              </div>
            </Card>
          </Link>
          <Link to="/account">
            <Card className="hover:bg-gray-50 text-center p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <span className="text-2xl">📊</span>
                </div>
                <span className="font-medium">My Progress</span>
              </div>
            </Card>
          </Link>
          <Link to="/flashcards">
            <Card className="hover:bg-gray-50 text-center p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <span className="text-2xl">🔖</span>
                </div>
                <span className="font-medium">Create Flashcards</span>
              </div>
            </Card>
          </Link>
          <Link to="/quizzes">
            <Card className="hover:bg-gray-50 text-center p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <span className="text-2xl">📝</span>
                </div>
                <span className="font-medium">Take a Quiz</span>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Help CTA */}
      <div className="bg-cybercoach-blue-dark text-white p-6 rounded-xl text-center">
        <h2 className="text-2xl font-bold mb-2">Need help with your studies?</h2>
        <p className="mb-6 text-blue-100">
          SuperStu's AI assistant can explain complex topics, help with assignments, and quiz you on key concepts.
        </p>
        <Link to="/super-stu">
          <Button size="lg" className="bg-cybercoach-blue-light hover:bg-cybercoach-blue text-white">
            Talk to SuperStu Now
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
