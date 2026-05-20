import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/genlayer";

type Status = "checking" | "connected" | "disconnected";

const BackendStatus = () => {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (!API_BASE_URL) {
      setStatus("disconnected");
      return;
    }

    fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(5000) })
      .then((res) => setStatus(res.ok ? "connected" : "disconnected"))
      .catch(() => setStatus("disconnected"));
  }, []);

  const config: Record<Status, { dot: string; label: string }> = {
    checking: { dot: "bg-yellow-400 animate-pulse", label: "Checking..." },
    connected: { dot: "bg-emerald-400", label: "Backend Live" },
    disconnected: { dot: "bg-red-400", label: "Offline" },
  };

  const { dot, label } = config[status];

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary-foreground/10 text-[10px] font-medium text-primary-foreground/80">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
};

export default BackendStatus;
