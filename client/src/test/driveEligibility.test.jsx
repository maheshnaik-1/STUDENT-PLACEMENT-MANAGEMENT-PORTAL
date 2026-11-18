import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DriveCard from '../components/student/DriveCard';

const mockEligibleDrive = {
  _id: 'drive-001',
  title: 'Cloud Software Engineer 2026',
  packageCTC: '16 LPA',
  location: 'Hyderabad',
  driveDate: '2026-11-25T10:00:00.000Z',
  company: {
    _id: 'comp-10',
    name: 'Amazon Web Services',
    industry: 'Cloud Infrastructure',
  },
  eligibility: {
    minCGPA: 7.5,
    maxBacklogs: 0,
    allowedBranches: ['CSE', 'IT', 'ECE'],
  },
  academicEligibility: {
    isEligible: true,
    reasons: [],
  },
  hasApplied: false,
};

const mockIneligibleDrive = {
  _id: 'drive-002',
  title: 'Hardware Systems Architect',
  packageCTC: '20 LPA',
  location: 'Bengaluru',
  driveDate: '2026-11-30T10:00:00.000Z',
  company: {
    _id: 'comp-11',
    name: 'NVIDIA Corporation',
    industry: 'Semiconductors',
  },
  eligibility: {
    minCGPA: 8.5,
    maxBacklogs: 0,
    allowedBranches: ['ECE', 'EEE'],
  },
  academicEligibility: {
    isEligible: false,
    reasons: [
      'Your CGPA (7.20) is below the minimum required 8.50',
      'Your branch (CSE) is not eligible. Allowed: ECE, EEE',
    ],
  },
  hasApplied: false,
};

const mockAppliedDrive = {
  _id: 'drive-003',
  title: 'Frontend Developer',
  packageCTC: '12 LPA',
  location: 'Remote',
  driveDate: '2026-12-05T10:00:00.000Z',
  company: {
    _id: 'comp-12',
    name: 'Atlassian',
    industry: 'Product Software',
  },
  eligibility: {
    minCGPA: 7.0,
    maxBacklogs: 1,
    allowedBranches: ['CSE', 'IT'],
  },
  academicEligibility: {
    isEligible: true,
    reasons: [],
  },
  hasApplied: true,
  myApplicationStatus: 'Technical Round',
};

const renderDriveCard = (props) => {
  return render(
    <MemoryRouter>
      <DriveCard {...props} />
    </MemoryRouter>
  );
};

describe('Company and Placement Drive UI (DriveCard)', () => {
  it('renders company and drive information correctly', () => {
    renderDriveCard({ drive: mockEligibleDrive });

    expect(screen.getByText('Cloud Software Engineer 2026')).toBeInTheDocument();
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
    expect(screen.getByText('16 LPA')).toBeInTheDocument();
    expect(screen.getByText('Hyderabad')).toBeInTheDocument();
    expect(screen.getByText(/Min CGPA:/)).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
  });

  it('displays eligible banner and active Apply Now button for eligible student', () => {
    const handleApply = vi.fn();
    renderDriveCard({ drive: mockEligibleDrive, onApply: handleApply });

    expect(screen.getByText(/you meet all eligibility criteria!/i)).toBeInTheDocument();
    const applyBtn = screen.getByRole('button', { name: /apply now/i });
    expect(applyBtn).toBeInTheDocument();
    expect(applyBtn).not.toBeDisabled();

    fireEvent.click(applyBtn);
    expect(handleApply).toHaveBeenCalledWith(mockEligibleDrive);
  });

  it('displays ineligible warning with specific reasons and hides Apply button', () => {
    renderDriveCard({ drive: mockIneligibleDrive });

    expect(screen.getByText(/not eligible to apply/i)).toBeInTheDocument();
    expect(
      screen.getByText(/your cgpa \(7\.20\) is below the minimum required 8\.50/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your branch \(cse\) is not eligible\. allowed: ece, eee/i)
    ).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /apply now/i })).not.toBeInTheDocument();
  });

  it('displays Application Submitted badge when student has already applied', () => {
    renderDriveCard({ drive: mockAppliedDrive });

    expect(screen.getByText(/application submitted/i)).toBeInTheDocument();
    expect(screen.getByText('Tech Round')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply now/i })).not.toBeInTheDocument();
  });

  it('displays applying loading state when application is in progress', () => {
    renderDriveCard({ drive: mockEligibleDrive, isApplying: true });

    const applyingBtn = screen.getByRole('button', { name: /applying\.\.\./i });
    expect(applyingBtn).toBeInTheDocument();
    expect(applyingBtn).toBeDisabled();
  });
});

