import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OfficerDashboard from '../pages/officer/OfficerDashboard';
import StatusUpdateModal from '../components/officer/StatusUpdateModal';
import {
  sortApplicants,
  isTerminalStatus,
  partitionByTerminalStatus,
} from '../utils/applicantSorting';
import * as AuthModule from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    applications: {
      getStats: vi.fn(),
      getAnalytics: vi.fn(),
    },
    drives: {
      getAll: vi.fn(),
    },
  },
}));

const mockOfficerUser = {
  _id: 'off-1',
  name: 'Dr. Sharma',
  email: 'officer@college.edu',
  role: 'officer',
};

const mockStats = {
  totalCompanies: 12,
  activeDrives: 5,
  totalApplications: 64,
  totalSelected: 18,
  selectedCount: 18,
  placedStudents: 18,
  shortlistedCount: 22,
};

const mockDrives = [
  {
    _id: 'drv-1',
    title: 'Software Development Engineer I',
    packageCTC: '15 LPA',
    location: 'Bengaluru',
    driveDate: '2026-11-20T09:00:00.000Z',
    status: 'Upcoming',
    company: { name: 'Amazon India' },
  },
  {
    _id: 'drv-2',
    title: 'Data Analyst',
    packageCTC: '10 LPA',
    location: 'Pune',
    driveDate: '2026-11-15T09:00:00.000Z',
    status: 'Ongoing',
    company: { name: 'Deloitte USI' },
  },
];

const renderOfficerDashboard = () => {
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    user: mockOfficerUser,
    isOfficer: true,
  });

  return render(
    <MemoryRouter>
      <NotificationProvider>
        <OfficerDashboard />
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('Officer Workflow and Evaluation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders officer dashboard header and quick action links', async () => {
    api.applications.getStats.mockResolvedValueOnce({ success: true, data: mockStats });
    api.drives.getAll.mockResolvedValueOnce({ success: true, data: mockDrives });
    api.applications.getAnalytics.mockResolvedValueOnce({ success: true, data: { recentApplications: [] } });

    renderOfficerDashboard();

    expect(screen.getByText(/welcome, dr\. sharma!/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage companies/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create drive/i })).toBeInTheDocument();
  });

  it('displays accurate KPI metric counts from stats endpoint', async () => {
    api.applications.getStats.mockResolvedValueOnce({ success: true, data: mockStats });
    api.drives.getAll.mockResolvedValueOnce({ success: true, data: mockDrives });
    api.applications.getAnalytics.mockResolvedValueOnce({ success: true, data: { recentApplications: [] } });

    renderOfficerDashboard();

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // Recruiting Companies
      expect(screen.getByText('5')).toBeInTheDocument();  // Active Drives
      expect(screen.getByText('64')).toBeInTheDocument(); // Total Applications
      expect(screen.getByText('18')).toBeInTheDocument(); // Offers Extended
    });
  });

  it('renders active recruitment drives list on dashboard', async () => {
    api.applications.getStats.mockResolvedValueOnce({ success: true, data: mockStats });
    api.drives.getAll.mockResolvedValueOnce({ success: true, data: mockDrives });
    api.applications.getAnalytics.mockResolvedValueOnce({ success: true, data: { recentApplications: [] } });

    renderOfficerDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('Software Development Engineer I').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Amazon India').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Data Analyst').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Deloitte USI').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('StatusUpdateModal renders student profile data and submits status updates', () => {
    const mockApplication = {
      _id: 'app-999',
      status: 'Shortlisted',
      remarks: 'Cleared aptitude round',
      student: {
        name: 'Sneha Patel',
        rollNo: '2022-CSE-045',
        branch: 'CSE',
        cgpa: 8.92,
      },
      drive: {
        title: 'Full Stack Engineer',
      },
    };

    const handleSubmit = vi.fn();
    const handleClose = vi.fn();

    render(
      <StatusUpdateModal
        isOpen={true}
        onClose={handleClose}
        application={mockApplication}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('Sneha Patel')).toBeInTheDocument();
    expect(screen.getByText(/2022-CSE-045/)).toBeInTheDocument();
    expect(screen.getByText(/8.92/)).toBeInTheDocument();

    const selectStatus = screen.getByRole('combobox');
    fireEvent.change(selectStatus, { target: { value: 'Selected' } });

    const remarksInput = screen.getByPlaceholderText(/cleared technical interview/i);
    fireEvent.change(remarksInput, { target: { value: 'Excellent technical interview' } });

    const saveButton = screen.getByRole('button', { name: /save status/i });
    fireEvent.click(saveButton);

    expect(handleSubmit).toHaveBeenCalledWith({
      status: 'Selected',
      remarks: 'Excellent technical interview',
    });
  });

  it('correctly sorts candidate roster by CGPA high-to-low and partitions terminal status', () => {
    const rawCandidates = [
      { _id: '1', status: 'Applied', student: { cgpa: 7.5, name: 'Alice' } },
      { _id: '2', status: 'Shortlisted', student: { cgpa: 9.2, name: 'Bob' } },
      { _id: '3', status: 'Rejected', student: { cgpa: 9.8, name: 'Charlie' } },
      { _id: '4', status: 'Applied', student: { cgpa: 8.1, name: 'David' } },
    ];

    const sorted = sortApplicants(rawCandidates, 'cgpa_desc');

    expect(sorted[0]._id).toBe('3'); // 9.8 CGPA
    expect(sorted[1]._id).toBe('2'); // 9.2 CGPA
    expect(sorted[2]._id).toBe('4'); // 8.1 CGPA
    expect(sorted[3]._id).toBe('1'); // 7.5 CGPA

    const { updatable, terminal } = partitionByTerminalStatus(rawCandidates);
    expect(updatable.length).toBe(3);
    expect(terminal.length).toBe(1);
    expect(terminal[0]._id).toBe('3');
    expect(isTerminalStatus('Rejected')).toBe(true);
    expect(isTerminalStatus('Selected')).toBe(true);
    expect(isTerminalStatus('Interview')).toBe(false);
  });
});
