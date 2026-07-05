import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline. Some features may be unavailable.</span>
    </div>
  );
}

export { OfflineIndicator };
