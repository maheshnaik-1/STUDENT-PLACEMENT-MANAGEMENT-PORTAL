import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentProfile from '../pages/student/StudentProfile';
import {
  calculateCompleteness,
  getCompletenessTier,
  COMPLETENESS_WEIGHTS,
} from '../utils/profileCompleteness';
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

const mockStudentUser = {
  _id: 'std-555',
  name: 'Ananya Roy',
  email: 'ananya.cse@college.edu',
  rollNo: '2022-CSE-012',
  branch: 'CSE',
  cgpa: 8.75,
  activeBacklogs: 0,
  passingYear: 2026,
  phone: '9876543210',
  skills: ['React', 'Node.js', 'MySQL'],
  resumeFile: {
    filename: 'resume-ananya.pdf',
    originalName: 'Ananya_Roy_CV.pdf',
    size: 245000,
    uploadedAt: '2026-10-10T12:00:00.000Z',
  },
  academicDetails: {
    tenthPercentage: 92.5,
    twelfthPercentage: 89.0,
    currentSemester: 7,
    gapYears: 0,
  },
  links: {
    github: 'https://github.com/ananya-roy',
    linkedin: 'https://linkedin.com/in/ananya-roy',
  },
  projects: [
    { title: 'Placement Portal', description: 'Full stack system', techStack: 'React, Spring Boot' },
  ],
  certifications: [
    { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services' },
  ],
};

const renderStudentProfile = (user = mockStudentUser) => {
  const mockUpdateProfile = vi.fn();
  const mockUpdateResumeState = vi.fn();

  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    user,
    updateProfile: mockUpdateProfile,
    updateResumeState: mockUpdateResumeState,
  });

  return {
    ...render(
      <MemoryRouter>
        <NotificationProvider>
          <StudentProfile />
        </NotificationProvider>
      </MemoryRouter>
    ),
    mockUpdateProfile,
    mockUpdateResumeState,
  };
};

describe('Student Profile and Career Readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student profile form populated with existing user data', () => {
    renderStudentProfile();

    expect(screen.getByDisplayValue('Ananya Roy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ananya.cse@college.edu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2022-CSE-012')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8.75')).toBeInTheDocument();
    expect(screen.getByDisplayValue('React, Node.js, MySQL')).toBeInTheDocument();
  });

  it('calculates 100% profile completeness score and Placement Ready tier for full profile', () => {
    const result = calculateCompleteness(mockStudentUser);

    expect(result.percentage).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.missing.length).toBe(0);

    const tier = getCompletenessTier(result.percentage);
    expect(tier.label).toBe('Placement Ready');
  });

  it('calculates partial score and missing items for incomplete profile', () => {
    const bareStudent = {
      name: 'Rohit Verma',
      email: 'rohit@college.edu',
      rollNo: '2022-MECH-099',
      branch: 'MECH',
      phone: '', // missing phone (< 7 chars)
      cgpa: 7.2,
      passingYear: 2026,
      activeBacklogs: 0,
      skills: [], // missing skills
    };

    const result = calculateCompleteness(bareStudent);

    // Basic (0) + Core Academic (15) + Extended (0) + Skills (0) + Resume (0) + Projects (0) + Links (0) = 15%
    expect(result.percentage).toBe(15);
    expect(result.isComplete).toBe(false);
    expect(result.missing).toContain('Add contact phone number');
    expect(result.missing).toContain('Add at least one technical skill (e.g., React, Java, Python)');

    const tier = getCompletenessTier(result.percentage);
    expect(tier.label).toBe('Profile In Progress');
  });

  it('deduplicates skills case-insensitively in completeness calculation', () => {
    const studentWithDuplicates = {
      ...mockStudentUser,
      skills: 'React, react, REACT, Java, java, JAVA, Python',
    };

    const result = calculateCompleteness(studentWithDuplicates);
    expect(result.breakdown['Technical Skills']).toBe(COMPLETENESS_WEIGHTS.SKILLS);

    // Verify completion message accurately counts distinct skills (React, Java, Python = 3)
    const skillsMessage = result.completed.find((msg) => msg.startsWith('Technical Skills'));
    expect(skillsMessage).toBe('Technical Skills (3 skills listed)');
  });

  it('evaluates completeness readiness tiers correctly across thresholds', () => {
    expect(getCompletenessTier(100).label).toBe('Placement Ready');
    expect(getCompletenessTier(85).label).toBe('Good Profile Readiness');
    expect(getCompletenessTier(70).label).toBe('Good Profile Readiness');
    expect(getCompletenessTier(69).label).toBe('Profile In Progress');
    expect(getCompletenessTier(0).label).toBe('Profile In Progress');
  });
});

