import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
      getMe: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
    },
  },
}));

const renderLogin = (initialRoute = '/login') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/student/dashboard" element={<div>Student Dashboard View</div>} />
            <Route path="/officer/dashboard" element={<div>Officer Dashboard View</div>} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.auth.getMe.mockResolvedValue({ success: false });
  });

  it('renders login form elements and default student role', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /portal sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/student college email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in as student/i })).toBeInTheDocument();
  });

  it('switches between Student and Officer roles dynamically', async () => {
    renderLogin();

    const officerTab = screen.getByRole('button', { name: /^placement officer$/i });
    fireEvent.click(officerTab);

    expect(screen.getByLabelText(/officer email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in as officer/i })).toBeInTheDocument();

    const studentTab = screen.getByRole('button', { name: /^student$/i });
    fireEvent.click(studentTab);

    expect(screen.getByLabelText(/student college email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in as student/i })).toBeInTheDocument();
  });

  it('autofills demo credentials when quick sign-in button is clicked', async () => {
    renderLogin();

    const demoButton = screen.getByText(/officer@college\.edu/i).closest('button');
    fireEvent.click(demoButton);

    const emailInput = screen.getByLabelText(/officer email/i);
    const passwordInput = screen.getByLabelText(/account password/i);

    expect(emailInput.value).toBe('officer@college.edu');
    expect(passwordInput.value).toBe('Officer@123');
  });

  it('handles successful student login and navigates to student dashboard', async () => {
    const mockUser = {
      _id: 'std123',
      name: 'Rahul Sharma',
      email: 'rahul.cse@college.edu',
      role: 'student',
    };

    api.auth.login.mockResolvedValueOnce({
      success: true,
      token: 'mock-jwt-token-xyz',
      user: mockUser,
    });
    api.auth.getMe.mockResolvedValue({
      success: true,
      user: mockUser,
    });

    renderLogin();

    const emailInput = screen.getByLabelText(/student college email/i);
    const passwordInput = screen.getByLabelText(/account password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in as student/i });

    fireEvent.change(emailInput, { target: { value: 'RAHUL.CSE@college.edu ' } });
    fireEvent.change(passwordInput, { target: { value: 'Student@123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.auth.login).toHaveBeenCalledWith({
        email: 'rahul.cse@college.edu',
        password: 'Student@123',
        role: 'student',
      });
    });

    await waitFor(() => {
      expect(localStorage.getItem('placement_auth_token')).toBe('mock-jwt-token-xyz');
      expect(screen.getByText('Student Dashboard View')).toBeInTheDocument();
    });
  });

  it('displays error message banner on failed login', async () => {
    api.auth.login.mockRejectedValueOnce(new Error('Invalid email or password'));

    renderLogin();

    const emailInput = screen.getByLabelText(/student college email/i);
    const passwordInput = screen.getByLabelText(/account password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in as student/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@college.edu' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorMatches = screen.getAllByText(/invalid email or password/i);
      expect(errorMatches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows helpful role mismatch guidance when student logs into officer portal', async () => {
    api.auth.login.mockRejectedValueOnce(
      new Error('These credentials belong to the Placement Officer portal.')
    );

    renderLogin();

    const emailInput = screen.getByLabelText(/student college email/i);
    const passwordInput = screen.getByLabelText(/account password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in as student/i });

    fireEvent.change(emailInput, { target: { value: 'officer@college.edu' } });
    fireEvent.change(passwordInput, { target: { value: 'Officer@123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const guidanceMatches = screen.getAllByText(
        /these credentials belong to the placement officer portal\. please select placement officer\./i
      );
      expect(guidanceMatches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('clears token and user state on logout', async () => {
    localStorage.setItem('placement_auth_token', 'active-session-token');

    const TestLogoutComponent = () => {
      const { token, logout, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
          <span data-testid="token-status">{token || 'no-token'}</span>
          <button onClick={logout}>Log Out</button>
        </div>
      );
    };

    api.auth.getMe.mockResolvedValueOnce({
      success: true,
      user: { _id: 'u1', name: 'User 1', role: 'student' },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
    });

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(localStorage.getItem('placement_auth_token')).toBeNull();
    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
    expect(screen.getByTestId('token-status')).toHaveTextContent('no-token');
  });
});
