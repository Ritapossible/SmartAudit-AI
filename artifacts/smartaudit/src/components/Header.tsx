import { Moon, Sun } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import BackendStatus from "@/components/BackendStatus";

const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header-gradient px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <img
          src="/logo.png"
          alt="SmartAudit AI"
          className="w-8 h-8 rounded-lg object-cover shrink-0"
        />
        <span className="text-white font-extrabold text-base tracking-tight">
          SmartAudit{" "}
          <span className="text-blue-300">AI</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <BackendStatus />
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
