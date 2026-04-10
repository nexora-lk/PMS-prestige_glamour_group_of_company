/**
 * Page: DotMatrixPrinting.tsx
 * Renders controls, employee selector, generate button, preview section
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/userService', () => ({
  userService: { listUsers: vi.fn() },
}));
vi.mock('../../services/paysheetService', () => ({
  paysheetService: { getMonthPaysheets: vi.fn() },
}));
vi.mock('../../services/api', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('../../components/Toast', () => ({ showToast: vi.fn() }));
// Use correct prop name: onSelectionChange (not onChange)
vi.mock('../../components/EmployeeSelector', () => ({
  default: ({
    onSelectionChange,
    payMonth,
    onPayMonthChange,
    title,
    actionButton,
  }: {
    onSelectionChange: (codes: Set<string>) => void;
    payMonth?: string;
    onPayMonthChange?: (m: string) => void;
    title?: string;
    actionButton?: React.ReactNode;
  }) => (
    <div data-testid="employee-selector">
      <span data-testid="selector-title">{title}</span>
      {payMonth !== undefined && onPayMonthChange && (
        <input
          type="month"
          data-testid="month-input"
          value={payMonth}
          onChange={(e) => onPayMonthChange(e.target.value)}
        />
      )}
      <button onClick={() => onSelectionChange(new Set(['E001']))}>Select Employee</button>
      {actionButton}
    </div>
  ),
}));

import { userService } from '../../services/userService';
import { paysheetService } from '../../services/paysheetService';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import DotMatrixPrinting from '../../pages/DotMatrixPrinting';

const mockListUsers = userService.listUsers as ReturnType<typeof vi.fn>;
const mockGetMonthPaysheets = paysheetService.getMonthPaysheets as ReturnType<typeof vi.fn>;
const mockApiPost = api.post as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockListUsers.mockResolvedValue({ users: [] });
  mockGetMonthPaysheets.mockResolvedValue({ paysheets: [] });
});

function renderPage() {
  return render(<MemoryRouter><DotMatrixPrinting /></MemoryRouter>);
}

describe('DotMatrixPrinting page', () => {
  it('renders EmployeeSelector', () => {
    renderPage();
    expect(screen.getByTestId('employee-selector')).toBeInTheDocument();
  });

  it('renders selector with correct title', () => {
    renderPage();
    expect(screen.getByTestId('selector-title').textContent).toMatch(/select employees/i);
  });

  it('renders month input via EmployeeSelector', () => {
    renderPage();
    expect(screen.getByTestId('month-input')).toBeInTheDocument();
  });

  it('renders Load Pay Sheets button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /load pay sheets/i })).toBeInTheDocument();
  });

  it('renders Dot Matrix Preview section', () => {
    renderPage();
    expect(screen.getByText(/dot matrix preview/i)).toBeInTheDocument();
  });

  it('renders Dot Matrix Settings section', () => {
    renderPage();
    expect(screen.getByText('Dot Matrix Settings')).toBeInTheDocument();
  });

  it('renders Generate button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('shows empty state when no paysheets loaded', () => {
    renderPage();
    expect(screen.getByText(/select employees and click/i)).toBeInTheDocument();
  });

  it('Generate button is disabled when no paysheets are loaded', () => {
    renderPage();
    const generateBtn = screen.getByRole('button', { name: /generate/i });
    expect(generateBtn).toBeDisabled();
  });

  it('shows error toast when loading paysheets fails', async () => {
    mockGetMonthPaysheets.mockRejectedValue(new Error('Server error'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /load pay sheets/i }));
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Server error', 'error');
    });
  });

  it('renders How It Works section', () => {
    renderPage();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });
});
