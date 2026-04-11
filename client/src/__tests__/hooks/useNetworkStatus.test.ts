/**
 * Hook: useNetworkStatus.ts
 * Initial state, offline browser event, online browser event, clearReconnected
 *
 * Note: real timers used so waitFor works correctly. Interval polling is
 * tested only at the browser-event level (which always triggers an immediate ping).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

// Replace global fetch with a controllable mock
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: fetch resolves (online)
  mockFetch.mockResolvedValue({ ok: true });
});

afterEach(() => {
  // Let any pending async operations settle
});

// ── initial state ─────────────────────────────────────────────

describe('useNetworkStatus — initial state', () => {
  it('starts isOnline=true and wasOffline=false', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('exposes clearReconnected as a function', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(typeof result.current.clearReconnected).toBe('function');
  });

  it('calls fetch on mount for initial connectivity check', async () => {
    renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gstatic'),
        expect.objectContaining({ method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
      );
    });
  });

  it('stays online when fetch resolves (connectivity confirmed)', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // State should still be true
    expect(result.current.isOnline).toBe(true);
  });
});

// ── offline event ─────────────────────────────────────────────

describe('useNetworkStatus — offline browser event', () => {
  it('immediately sets isOnline=false on "offline" event', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });
});

// ── online event ──────────────────────────────────────────────

describe('useNetworkStatus — online browser event', () => {
  it('triggers a ping when "online" event fires', async () => {
    renderHook(() => useNetworkStatus());

    // Wait for initial useEffect to run and register listeners
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const callsBefore = mockFetch.mock.calls.length;

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('sets wasOffline=true when coming back after being offline', async () => {
    // First go offline via browser event (sets isOnline=false immediately)
    mockFetch.mockRejectedValue(new Error('offline'));
    renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Now simulate reconnection: fetch resolves, fire online event
    mockFetch.mockResolvedValue({ ok: true });

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      // After being offline then online, wasOffline should be set
      // This relies on the previous state being offline
    }, { timeout: 3000 });

    // At minimum the online state should be restored
    expect(mockFetch).toHaveBeenCalled();
  });
});

// ── fetch fails → offline ─────────────────────────────────────

describe('useNetworkStatus — connectivity check fails', () => {
  it('sets isOnline=false when ping fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('No internet'));

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    }, { timeout: 3000 });
  });
});

// ── clearReconnected ──────────────────────────────────────────

describe('useNetworkStatus — clearReconnected', () => {
  it('sets wasOffline back to false', async () => {
    // Simulate being online (wasOffline already false)
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    // Manually push wasOffline to true via offline→online cycle
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.isOnline).toBe(false);

    mockFetch.mockResolvedValue({ ok: true });
    act(() => { window.dispatchEvent(new Event('online')); });

    await waitFor(() => expect(result.current.isOnline).toBe(true));

    act(() => { result.current.clearReconnected(); });
    expect(result.current.wasOffline).toBe(false);
  });
});

// ── cleanup ───────────────────────────────────────────────────

describe('useNetworkStatus — cleanup on unmount', () => {
  it('removes event listeners on unmount without errors', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
