import { useState, useEffect } from "react";
import { onConnectionChange } from "../stores/socketStore.js";
import { WifiOff } from "lucide-react";

export default function ConnectionStatus() {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    return onConnectionChange(setConnected);
  }, []);

  if (connected) return null;

  return (
    <div className="connection-status offline">
      <WifiOff size={14} />
      <span>Reconnecting...</span>
    </div>
  );
}
