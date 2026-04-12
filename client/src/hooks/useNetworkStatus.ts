import { useState, useEffect, useCallback, useRef } from 'react';

const PING_INTERVAL = 10_000; // check every 10 seconds
const PING_TIMEOUT = 5_000;   // 5s timeout per check

/**
 * Verify actual internet access by fetching a tiny public resource.
 * navigator.onLine only checks network cable/WiFi — it does NOT
 * detect "connected but no internet" (e.g. unpaid bill, captive portal).
 */
async function checkRealConnectivity(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT);

  try {
    // Use opaque fetch to a reliable Google endpoint (generates no CORS issues)
    await fetch('https://www.gstatic.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const prevOnline = useRef(true);

  const updateStatus = useCallback((online: boolean) => {
    setIsOnline(online);
    if (online && !prevOnline.current) {
      setWasOffline(true); // just reconnected
    }
    prevOnline.current = online;
  }, []);

  const clearReconnected = useCallback(() => setWasOffline(false), []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let mounted = true;

    // Run a real connectivity check
    async function ping() {
      const result = await checkRealConnectivity();
      if (mounted) updateStatus(result);
    }

    // Check immediately on mount
    ping();

    // Then check on a regular interval
    intervalId = setInterval(ping, PING_INTERVAL);

    // Also react instantly to browser online/offline events,
    // but always verify with a real ping
    const handleOnline = () => { ping(); };
    const handleOffline = () => {
      if (mounted) updateStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStatus]);

  return { isOnline, wasOffline, clearReconnected };
}
