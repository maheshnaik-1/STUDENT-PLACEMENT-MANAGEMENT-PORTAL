import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyApplications from '../pages/student/MyApplications';
import ApplicationTimeline from '../components/student/ApplicationTimeline';
import { NotificationProvider } from '../context/NotificationContext';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    applications: {
      getMyApplications: vi.fn(),
      withdraw: vi.fn(),
    },
  },
}));

const mockApplications = [
  {
    _id: 'app-001',
    status: 'Applied',
    remarks: 'Application submitted and awaiting screening',
    appliedAt: '2026-10-01T10:00:00.000Z',
    drive: {
      _id: 'drv-1',
      title: 'Full Stack Engineer 2026',
      packageCTC: '14 LPA',
      location: 'Bengaluru',
      company: {
        _id: 'comp-1',
        name: 'Google Cloud Innovations',
        industry: 'Cloud Computing',
      },
    },
    statusHistory: [
      { status: 'Applied', remarks: 'Submitted application', changedAt: '2026-10-01T10:00:00.000Z' },
    ],
  },
  {
    _id: 'app-002',
    status: 'Selected',
    remarks: 'Congratulations! Official offer rolled out.',
    appliedAt: '2026-09-15T09:00:00.000Z',
    drive: {
      _id: 'drv-2',
      title: 'Systems Software Engineer',
      packageCTC: '18 LPA',
      location: 'Hyderabad',
      company: {
        _id: 'comp-2',
        name: 'Microsoft India',
        industry: 'Enterprise Software',
      },
    },
    statusHistory: [
      { status: 'Applied', remarks: 'Submitted', changedAt: '2026-09-15T09:00:00.000Z' },
      { status: 'Technical Round', remarks: 'Cleared coding', changedAt: '2026-09-20T10:00:00.000Z' },
      { status: 'Selected', remarks: 'Congratulations! Official offer rolled out.', changedAt: '2026-09-28T16:00:00.000Z' },
    ],
  },
];

const renderMyApplications = () => {
  return render(
    <MemoryRouter>
      <NotificationProvider>
        <MyApplications />
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('Student Application Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially while fetching applications', () => {
    api.applications.getMyApplications.mockReturnValue(new Promise(() => {}));
    renderMyApplications();

    expect(screen.getByText(/loading application history/i)).toBeInTheDocument();
  });

  it('renders empty state when student has no applications', async () => {
    api.applications.getMyApplications.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    renderMyApplications();

    await waitFor(() => {
      expect(screen.getByText(/no applications submitted/i)).toBeInTheDocument();
      expect(screen.getByText(/you have not applied for any placement drives yet/i)).toBeInTheDocument();
    });
  });

  it('renders application roster cards and summary metrics correctly', async () => {
    api.applications.getMyApplications.mockResolvedValueOnce({
      success: true,
      data: mockApplications,
    });

    renderMyApplications();

    await waitFor(() => {
      expect(screen.getByText('Google Cloud Innovations')).toBeInTheDocument();
      expect(screen.getByText('Microsoft India')).toBeInTheDocument();
      expect(screen.getByText('Full Stack Engineer 2026')).toBeInTheDocument();
      expect(screen.getByText('Systems Software Engineer')).toBeInTheDocument();
    });

    // Check summary metric counters
    expect(screen.getByText('Total Submissions')).toBeInTheDocument();
    expect(screen.getByText('Offers Received')).toBeInTheDocument();
  });

  it('filters applications by status filter dropdown', async () => {
    api.applications.getMyApplications.mockResolvedValueOnce({
      success: true,
      data: mockApplications,
    });

    renderMyApplications();

    await waitFor(() => {
      expect(screen.getByText('Google Cloud Innovations')).toBeInTheDocument();
      expect(screen.getByText('Microsoft India')).toBeInTheDocument();
    });

    // Filter by 'Selected'
    const statusSelect = screen.getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'Selected' } });

    expect(screen.getByText('Microsoft India')).toBeInTheDocument();
    expect(screen.queryByText('Google Cloud Innovations')).not.toBeInTheDocument();
  });

  it('opens and closes Application Timeline modal on details inspection', async () => {
    api.applications.getMyApplications.mockResolvedValueOnce({
      success: true,
      data: mockApplications,
    });

    renderMyApplications();

    await waitFor(() => {
      expect(screen.getByText('Google Cloud Innovations')).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByRole('button', { name: /details/i });
    fireEvent.click(viewDetailsButtons[0]);

    // Modal timeline header and events should appear
    await waitFor(() => {
      expect(screen.getByText(/application lifecycle timeline/i)).toBeInTheDocument();
      expect(
        screen.getAllByText('Application submitted and awaiting screening').length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles withdrawal confirmation flow and removes withdrawn card', async () => {
    api.applications.getMyApplications.mockResolvedValueOnce({
      success: true,
      data: mockApplications,
    });
    api.applications.withdraw.mockResolvedValueOnce({
      success: true,
      message: 'Application withdrawn successfully',
    });

    renderMyApplications();

    await waitFor(() => {
      expect(screen.getByText('Google Cloud Innovations')).toBeInTheDocument();
    });

    // An 'Applied' application has the enabled Withdraw button
    const withdrawButtons = screen.getAllByRole('button', { name: /^withdraw$/i });
    const enabledWithdrawBtn = withdrawButtons.find((btn) => !btn.disabled);
    expect(enabledWithdrawBtn).toBeDefined();

    fireEvent.click(enabledWithdrawBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText(/confirm application withdrawal/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm withdrawal/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.applications.withdraw).toHaveBeenCalledWith('app-001');
      expect(screen.queryByText('Google Cloud Innovations')).not.toBeInTheDocument();
      expect(screen.getByText('Microsoft India')).toBeInTheDocument();
    });
  });

  it('ApplicationTimeline component displays correct sequential stages', () => {
    render(<ApplicationTimeline application={mockApplications[1]} />);

    expect(screen.getByText(/application lifecycle timeline/i)).toBeInTheDocument();
    expect(screen.getByText('Cleared coding')).toBeInTheDocument();
    expect(screen.getByText('Congratulations! Official offer rolled out.')).toBeInTheDocument();
  });
});
