
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  X,
  Home,
  UserCircle,
  LogIn,
  Search,
  GraduationCap,
  File,
  BookOpen,
  SquareCheck,
  Calendar,
  LayoutGrid,
  Database,
  Loader2,
  FileInput
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WidgetType } from "@/hooks/use-widgets";
import { AddWidgetsDialog } from "@/components/widgets/AddWidgetsDialog";
import { useClassWidgets } from "@/hooks/use-class-widgets";

interface AppSidebarProps {
  onClose: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWidgetsDialogOpen, setIsWidgetsDialogOpen] = useState(false);
  const [activeClassName, setActiveClassName] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { enabledWidgets, isLoading: widgetsLoading } = useClassWidgets();
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    // Get active class name from session storage
    const activeClass = sessionStorage.getItem('activeClass');
    if (activeClass) {
      try {
        const parsedClass = JSON.parse(activeClass);
        setActiveClassName(parsedClass.title);
      } catch (e) {
        console.error("Error parsing active class:", e);
      }
    }
    
    return () => subscription.unsubscribe();
  }, []);

  // Update active class name when location changes
  useEffect(() => {
    if (location.pathname === '/') {
      setActiveClassName(null);
    } else {
      const activeClass = sessionStorage.getItem('activeClass');
      if (activeClass) {
        try {
          const parsedClass = JSON.parse(activeClass);
          setActiveClassName(parsedClass.title);
        } catch (e) {
          console.error("Error parsing active class:", e);
        }
      }
    }
  }, [location.pathname]);

  console.log("Active class name in sidebar:", activeClassName);
  console.log("Enabled widgets in sidebar:", enabledWidgets);

  // Define all navigation items - core features
  const coreNavItems = [
    {
      icon: <Home className="mr-2 h-5 w-5" />,
      label: "Home",
      to: "/",
      exact: true
    },
    {
      icon: <Calendar className="mr-2 h-5 w-5" />,
      label: "Calendar",
      to: "/calendar",
      exact: false
    }
  ];
  
  const widgetNavItems = [
    {
      icon: <Search className="mr-2 h-5 w-5" />,
      label: "Super Tutor",
      to: "/super-stu",
      widgetId: "supertutor" as WidgetType
    },
    {
      icon: <Database className="mr-2 h-5 w-5" />,
      label: "Database",
      to: "/database",
      widgetId: "database" as WidgetType
    },
    {
      icon: <BookOpen className="mr-2 h-5 w-5" />,
      label: "Flashcards",
      to: "/flashcards",
      widgetId: "flashcards" as WidgetType
    },
    {
      icon: <SquareCheck className="mr-2 h-5 w-5" />,
      label: "Quizzes",
      to: "/quizzes",
      widgetId: "quizzes" as WidgetType
    },
    {
      icon: <FileInput className="mr-2 h-5 w-5" />,
      label: "Practice",
      to: "/practice",
      widgetId: "practice" as WidgetType
    }
  ];
  
  // Filter widget nav items by enabled widgets for the current class
  const visibleWidgetNavItems = widgetNavItems.filter(item => 
    enabledWidgets.includes(item.widgetId)
  );
  
  const accountNavItems = [
    {
      icon: <UserCircle className="mr-2 h-5 w-5" />,
      label: "My Account",
      to: "/account"
    }
  ];

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center mr-2">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-xl">Eido</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <nav className="flex-1 overflow-auto py-4">
        <ul className="space-y-2 px-2">
          {coreNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.exact}
                className={({ isActive }) => 
                  `flex items-center px-4 py-2 rounded-md transition-colors ${
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
          
          {/* Always show the widgets section - but display a message if no class */}
          <div className="mt-4 px-4 py-2">
            <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase">
              {activeClassName ? "Active Class" : "No Active Class"}
            </h3>
            {activeClassName && (
              <p className="text-sm text-sidebar-foreground font-medium py-1 truncate">
                {activeClassName}
              </p>
            )}
          </div>
          
          {/* Widgets section with heading and add button */}
          <div className="pt-2">
            <div className="px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase">
                {activeClassName ? "Class Widgets" : "Available Widgets"}
              </h3>
              {activeClassName && (
                <Button 
                  onClick={() => setIsWidgetsDialogOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 h-7 text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent/80"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              )}
            </div>
            
            {widgetsLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : visibleWidgetNavItems.length > 0 ? (
              visibleWidgetNavItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => 
                      `flex items-center px-4 py-2 rounded-md transition-colors ${
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))
            ) : (
              <p className="text-xs text-muted-foreground px-4 py-2">
                {activeClassName 
                  ? "No widgets added yet" 
                  : "Select a class to use widgets"}
              </p>
            )}
          </div>
        </ul>
      </nav>
      
      {/* Account section */}
      <div className="mt-auto border-t border-sidebar-border/50 px-2 py-4">
        {!loading && !user && (
          <NavLink
            to="/auth"
            className={({ isActive }) => 
              `flex items-center px-4 py-2 rounded-md transition-colors ${
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            <LogIn className="mr-2 h-5 w-5" />
            <span>Sign In</span>
          </NavLink>
        )}
        
        {!loading && user && (
          <>
            <p className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/70 uppercase">
              Account
            </p>
            <ul className="space-y-2">
              {accountNavItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => 
                      `flex items-center px-4 py-2 rounded-md transition-colors ${
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            
            <div className="mt-4 p-2 border-t border-sidebar-border/50">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                  <span className="text-xs font-medium">{user.email?.charAt(0).toUpperCase() || "U"}</span>
                </div>
                <div className="ml-2 overflow-hidden">
                  <p className="font-medium truncate">{user.email}</p>
                  <p className="text-xs opacity-70 truncate">Signed In</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Add Widgets Dialog */}
      <AddWidgetsDialog 
        open={isWidgetsDialogOpen} 
        onOpenChange={setIsWidgetsDialogOpen} 
        classMode={true}
        currentClassName={activeClassName || ""}
      />
    </div>
  );
}
