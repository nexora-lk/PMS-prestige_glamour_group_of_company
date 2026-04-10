/**
 * Component: NetworkStatus.tsx
 * NetworkStatusBar — shows offline banner, reconnected banner, auto-dismisses
 * NetworkIndicator — shows online/offline label
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { NetworkStatusBar, NetworkIndicator } from '../../components/NetworkStatus';

// Mock the useNetworkStatus hook
vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}));

import { useNetworkStatus } from '../../hooks/useNetworkStatus';
const mockUseNetworkStatus = useNetworkStatus as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Default: online, no recent reconnect
  mockUseNetworkStatus.mockReturnValue({
    isOnline: true,
    wasOffline: false,
    clearReconnected: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── NetworkStatusBar ──────────────────────────────────────────

describe('NetworkStatusBar', () => {
  it('renders nothing when online and no recent reconnect', () => {
    const { container } = render(<NetworkStatusBar />);
    expect(container.querySelector('.network-bar')).toBeNull();
  });

  it('renders offline banner when offline', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      wasOffline: false,
      clearReconnected: vi.fn(),
    });

    render(<NetworkStatusBar />);

    expect(screen.getByText(/please connect to the internet/i)).toBeInTheDocument();
  });

  it('renders reconnected banner when wasOffline=true and now online', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: true,
      clearReconnected: vi.fn(),
    });

    render(<NetworkStatusBar />);

    expect(screen.getByText(/internet connection restored/i)).toBeInTheDocument();
  });

  it('reconnected banner has network-bar--online class', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: true,
      clearReconnected: vi.fn(),
    });

    render(<NetworkStatusBar />);

    const bar = document.querySelector('.network-bar');
    expect(bar?.classList.contains('network-bar--online')).toBe(true);
  });

  it('offline banner has network-bar--offline class', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      wasOffline: false,
      clearReconnected: vi.fn(),
    });

    render(<NetworkStatusBar />);

    const bar = document.querySelector('.network-bar');
    expect(bar?.classList.contains('network-bar--offline')).toBe(true);
  });

  it('calls clearReconnected after 3 seconds when wasOffline=true', async () => {
    const clearReconnected = vi.fn();
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: true,
      clearReconnected,
    });

    render(<NetworkStatusBar />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(clearReconnected).toHaveBeenCalled();
  });

  it('does NOT call clearReconnected when wasOffline=false', () => {
    const clearReconnected = vi.fn();
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      clearReconnected,
    });

    render(<NetworkStatusBar />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(clearReconnected).not.toHaveBeenCalled();
  });
});

// ── NetworkIndicator ──────────────────────────────────────────

describe('NetworkIndicator', () => {
  it('shows "Online" when isOnline=true', () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: true, wasOffline: false, clearReconnected: vi.fn() });

    render(<NetworkIndicator />);

    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows "Offline" when isOnline=false', () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false, wasOffline: false, clearReconnected: vi.fn() });

    render(<NetworkIndicator />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('has network-indicator--online class when online', () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: true, wasOffline: false, clearReconnected: vi.fn() });

    render(<NetworkIndicator />);

    expect(document.querySelector('.network-indicator--online')).not.toBeNull();
  });

  it('has network-indicator--offline class when offline', () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false, wasOffline: false, clearReconnected: vi.fn() });

    render(<NetworkIndicator />);

    expect(document.querySelector('.network-indicator--offline')).not.toBeNull();
  });
});
