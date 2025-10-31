import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="text-center px-4" role="main">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" aria-hidden="true" />
        </div>
        
        <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-8 text-xl text-muted-foreground max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <Link to="/" aria-label="Return to homepage">
          <Button size="lg" className="gap-2">
            <Home className="w-4 h-4" aria-hidden="true" />
            Return to Home
          </Button>
        </Link>
        
        {location.pathname && (
          <p className="mt-6 text-sm text-muted-foreground/70">
            Attempted path: <code className="px-2 py-1 rounded bg-muted text-muted-foreground">{location.pathname}</code>
          </p>
        )}
      </main>
    </div>
  );
};

export default NotFound;
