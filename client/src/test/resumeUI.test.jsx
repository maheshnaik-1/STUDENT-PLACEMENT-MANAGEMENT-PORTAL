import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentProfile from '../pages/student/StudentProfile';
import * as AuthModule from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    auth: {
      updateProfile: vi.fn(),
      uploadResume: vi.fn(),
      downloadResume: vi.fn(),
      deleteResume: vi.fn(),
    },
  },
}));

const mockStudentWithResume = {
  _id: 'std-101',
  name: 'Ananya Roy',
  email: 'ananya@college.edu',
  rollNo: '2022-CSE-012',
  branch: 'CSE',
  cgpa: 8.75,
  passingYear: 2026,
  activeBacklogs: 0,
  phone: '9876543210',
  skills: 'React, Java',
  resumeFile: {
    filename: 'resume-std-101-1791165313680.pdf',
    originalName: 'Ananya_Roy_CV.pdf',
    mimeType: 'application/pdf',
    size: 245000,
    uploadedAt: '2026-10-10T12:00:00.000Z',
  },
};

const mockStudentWithoutResume = {
  _id: 'std-102',
  name: 'Dev Student',
  email: 'dev@college.edu',
  rollNo: '2022-CSE-099',
  branch: 'CSE',
  cgpa: 7.5,
  passingYear: 2026,
  activeBacklogs: 0,
  phone: '9876543210',
  skills: 'Python',
  resumeFile: null,
};

const renderWithAuth = (user) => {
  const mockUpdateResumeState = vi.fn();
  const mockUpdateProfile = vi.fn();

  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    user,
    updateResumeState: mockUpdateResumeState,
    updateProfile: mockUpdateProfile,
  });

  return {
    ...render(
      <MemoryRouter>
        <NotificationProvider>
          <StudentProfile />
        </NotificationProvider>
      </MemoryRouter>
    ),
    mockUpdateResumeState,
    mockUpdateProfile,
  };
};

describe('Resume UI and File Boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn();
  });

  it('renders uploaded resume file metadata (original name, formatted size, upload date)', () => {
    renderWithAuth(mockStudentWithResume);

    expect(screen.getByText('Ananya_Roy_CV.pdf')).toBeInTheDocument();
    expect(screen.getByText('239.26 KB')).toBeInTheDocument();
    expect(screen.getByText(/Uploaded \d{1,2}\/\d{1,2}\/\d{4}/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('opens preview modal and requests resume blob on clicking Preview', async () => {
    const mockBlob = new Blob(['%PDF-mock'], { type: 'application/pdf' });
    api.auth.downloadResume.mockResolvedValueOnce(mockBlob);

    renderWithAuth(mockStudentWithResume);

    const previewButton = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(api.auth.downloadResume).toHaveBeenCalled();
      expect(
        screen.getByText(/resume preview — ananya_roy_cv\.pdf/i)
      ).toBeInTheDocument();
    });
  });

  it('triggers resume download through api service on clicking Download', async () => {
    const mockBlob = new Blob(['%PDF-mock'], { type: 'application/pdf' });
    api.auth.downloadResume.mockResolvedValueOnce(mockBlob);

    renderWithAuth(mockStudentWithResume);

    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(api.auth.downloadResume).toHaveBeenCalled();
    });
  });

  it('aborts delete when confirmation is cancelled', async () => {
    window.confirm.mockReturnValue(false);

    const { mockUpdateResumeState } = renderWithAuth(mockStudentWithResume);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/are you sure you want to delete your uploaded resume/i)
    );
    expect(api.auth.deleteResume).not.toHaveBeenCalled();
    expect(mockUpdateResumeState).not.toHaveBeenCalled();
  });

  it('executes delete and updates auth context when confirmation is accepted', async () => {
    window.confirm.mockReturnValue(true);
    api.auth.deleteResume.mockResolvedValueOnce({
      success: true,
      message: 'Resume deleted successfully',
    });

    const { mockUpdateResumeState } = renderWithAuth(mockStudentWithResume);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.auth.deleteResume).toHaveBeenCalled();
      expect(mockUpdateResumeState).toHaveBeenCalledWith(null);
    });
  });

  it('shows empty resume state and file upload controls when no resume is uploaded', () => {
    renderWithAuth(mockStudentWithoutResume);

    expect(
      screen.getByText(/no uploaded resume document on file\. upload a document below\./i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
  });
});

