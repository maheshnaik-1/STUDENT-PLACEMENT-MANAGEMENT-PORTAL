import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import * as AuthModule from '../context/AuthContext';

describe('Protected Navigation and RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (initialRoute, authContextValue) => {
    vi.spyOn(AuthModule, 'useAuth').mockReturnValue(authContextValue);

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRole="student">
                <div data-testid="student-dashboard">Student Dashboard Content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/dashboard"
            element={
              <ProtectedRoute allowedRole="officer">
                <div data-testid="officer-dashboard">Officer Dashboard Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('shows loading indicator while verifying session credentials', () => {
    renderWithRouter('/student/dashboard', {
      user: null,
      isAuthenticated: false,
      loading: true,
    });

    expect(screen.getByText(/verifying session credentials/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    renderWithRouter('/student/dashboard', {
      user: null,
      isAuthenticated: false,
      loading: false,
    });

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('student-dashboard')).not.toBeInTheDocument();
  });

  it('allows access to student dashboard when user has student role', () => {
    renderWithRouter('/student/dashboard', {
      user: { _id: 's1', role: 'student', name: 'Student 1' },
      isAuthenticated: true,
      loading: false,
    });

    expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
  });

  it('allows access to officer dashboard when user has officer role', () => {
    renderWithRouter('/officer/dashboard', {
      user: { _id: 'o1', role: 'officer', name: 'Officer 1' },
      isAuthenticated: true,
      loading: false,
    });

    expect(screen.getByTestId('officer-dashboard')).toBeInTheDocument();
  });

  it('redirects student attempting to access officer routes back to student dashboard', () => {
    renderWithRouter('/officer/dashboard', {
      user: { _id: 's1', role: 'student', name: 'Student 1' },
      isAuthenticated: true,
      loading: false,
    });

    expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('officer-dashboard')).not.toBeInTheDocument();
  });

  it('redirects officer attempting to access student routes to officer dashboard', () => {
    renderWithRouter('/student/dashboard', {
      user: { _id: 'o1', role: 'officer', name: 'Officer 1' },
      isAuthenticated: true,
      loading: false,
    });

    expect(screen.getByTestId('officer-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('student-dashboard')).not.toBeInTheDocument();
  });
});

