import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiWifiOff, FiWifi } from 'react-icons/fi';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function NetworkStatusBar() {
  const { isOnline, wasOffline, clearReconnected } = useNetworkStatus();

  // Auto-dismiss the "reconnected" banner after 3s
  useEffect(() => {
    if (!wasOffline) return;
    const t = setTimeout(clearReconnected, 3000);
    return () => clearTimeout(t);
  }, [wasOffline, clearReconnected]);

  // Nothing to show when online and no recent reconnection
  if (isOnline && !wasOffline) return null;

  return createPortal(
    <div className={`network-bar ${isOnline ? 'network-bar--online' : 'network-bar--offline'}`}>
      {isOnline ? (
        <>
          <FiWifi size={18} />
          <span>Internet connection restored.</span>
        </>
      ) : (
        <>
          <FiWifiOff size={18} />
          <span>Please connect to the internet. Without a connection, you cannot continue.</span>
        </>
      )}
    </div>,
    document.body
  );
}

/** Small indicator for the header — always visible */
export function NetworkIndicator() {
  const { isOnline } = useNetworkStatus();

  return (
    <div className={`network-indicator ${isOnline ? 'network-indicator--online' : 'network-indicator--offline'}`}>
      <span className="network-dot" />
      <span className="network-label">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
