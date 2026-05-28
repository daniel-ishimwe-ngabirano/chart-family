import { useState, useEffect } from "react";
import { getSocket, onConnectionChange } from "../stores/socketStore.js";
import { WifiOff } from "lucide-react";

export default function ConnectionStatus() {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    return onConnectionChange((status) => {
      if (getSocket()) setConnected(status);
    });
  }, []);

  if (connected) return null;

  return (
    <div className="connection-status offline">
      <WifiOff size={14} />
      <span>Reconnecting...</span>
    </div>
  );
}
