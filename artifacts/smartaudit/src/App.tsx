import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { WalletProvider } from "@/hooks/use-wallet";
import { WalletModal } from "@/components/WalletModal";
import Index from "./pages/Index";
import Results from "./pages/Results";
import HowItWorks from "./pages/HowItWorks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          {/* Global wallet modal — rendered once, accessible from any page */}
          <WalletModal />
          <Router base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Switch>
              <Route path="/" component={Index} />
              <Route path="/results" component={Results} />
              <Route path="/how-it-works" component={HowItWorks} />
              <Route component={NotFound} />
            </Switch>
          </Router>
        </TooltipProvider>
      </WalletProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
