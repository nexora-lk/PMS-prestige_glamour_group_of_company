import { useState, useEffect, useCallback, useRef } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const prevOnline = useRef(navigator.onLine);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (!prevOnline.current) setWasOffline(true);
    prevOnline.current = true;
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    prevOnline.current = false;
  }, []);

  const clearReconnected = useCallback(() => setWasOffline(false), []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline, clearReconnected };
}
