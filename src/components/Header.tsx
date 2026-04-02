import { Moon, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import logo from "@/assets/logo.jpg";
import BackendStatus from "@/components/BackendStatus";

const Header = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navLink = location.pathname === "/results"
    ? { label: "How It Works →", to: "/how-it-works" }
    : location.pathname === "/how-it-works"
    ? { label: "Audit Results →", to: "/results" }
    : null;

  return (
    <header className="header-gradient px-4 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <img src={logo} alt="SmartAudit AI Logo" className="w-8 h-8 rounded-md" />
        <span className="text-primary-foreground font-bold text-lg">SmartAudit <span className="bg-gradient-to-r from-primary to-[hsl(180,70%,50%)] bg-clip-text text-transparent">AI</span></span>
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        <BackendStatus />
        {navLink && (
          <Link
            to={navLink.to}
            className="text-primary-foreground/90 hover:text-primary-foreground text-sm font-medium transition-colors"
          >
            {navLink.label}
          </Link>
        )}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
