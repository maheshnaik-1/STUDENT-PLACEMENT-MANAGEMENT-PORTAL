import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Zap,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';

const Login = () => {
  const [role, setRole] = useState('student'); // 'student' or 'officer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    location.state?.from?.pathname ||
    (role === 'officer' ? '/officer/dashboard' : '/student/dashboard');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    // Normalize email (trim whitespace & lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    // Password is sent EXACTLY as entered (no trim, no lowercase)
    try {
      await login(normalizedEmail, password, role);
      showSuccess(`Welcome back! Successfully logged in as ${role === 'officer' ? 'Placement Officer' : 'Student'}.`);
      navigate(role === 'officer' ? '/officer/dashboard' : '/student/dashboard', {
        replace: true,
      });
    } catch (err) {
      let msg = err.message || 'Invalid email or password';

      // Clear role mismatch guidance
      if (
        msg.toLowerCase().includes('placement officer portal') ||
        (role === 'student' && msg.includes('Placement Officer'))
      ) {
        msg = 'These credentials belong to the Placement Officer portal. Please select Placement Officer.';
      } else if (
        msg.toLowerCase().includes('student portal') ||
        (role === 'officer' && msg.includes('Student'))
      ) {
        msg = 'These credentials belong to the Student portal. Please select Student.';
      }

      setErrorMsg(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = (targetRole, demoEmail, demoPass) => {
    setRole(targetRole);
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '2rem auto 4rem',
        width: '100%',
      }}
    >
      <div
        className="card"
        style={{
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
        }}
      >
        <div
          style={{
            padding: '2rem 2rem 1.5rem',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div
            className="brand-icon"
            style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}
          >
            <GraduationCap size={26} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Portal Sign In
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Access your campus placement dashboard
          </p>

          {/* Role Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '0.25rem',
              borderRadius: '10px',
              marginTop: '1.25rem',
              gap: '0.25rem',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setRole('student');
                setErrorMsg('');
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                background: role === 'student' ? '#ffffff' : 'transparent',
                color: role === 'student' ? '#2563eb' : '#64748b',
                boxShadow:
                  role === 'student' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <User size={16} />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('officer');
                setErrorMsg('');
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                background: role === 'officer' ? '#ffffff' : 'transparent',
                color: role === 'officer' ? '#2563eb' : '#64748b',
                boxShadow:
                  role === 'officer' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <ShieldCheck size={16} />
              <span>Placement Officer</span>
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: '1.75rem 2rem' }}>
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                lineHeight: '1.4',
              }}
            >
              <Info size={18} style={{ minWidth: '18px', marginTop: '2px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                {role === 'officer' ? 'Officer Email' : 'Student College Email'}
              </label>
              <input
                id="login-email"
                type="email"
                required
                className="form-control"
                placeholder={
                  role === 'officer'
                    ? 'officer@college.edu'
                    : 'rahul.cse@college.edu'
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Account Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '2.75rem' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.25rem',
                    borderRadius: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              {submitting ? 'Authenticating...' : `Sign In as ${role === 'officer' ? 'Officer' : 'Student'}`}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Sign-In Accounts Autofill */}
          <div
            style={{
              marginTop: '1.75rem',
              padding: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.65rem',
              }}
            >
              <Zap size={14} color="#f59e0b" />
              <span>Quick Sign-In Accounts:</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() =>
                  handleFillDemo(
                    'officer',
                    'officer@college.edu',
                    'Officer@123'
                  )
                }
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>🔑 Placement Officer (Dr. Sharma)</div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    officer@college.edu &bull; Password: <strong>Officer@123</strong>
                  </div>
                </div>
                <span style={{ color: '#2563eb', fontSize: '0.75rem', fontWeight: 600 }}>Autofill</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleFillDemo(
                    'student',
                    'rahul.cse@college.edu',
                    'Student@123'
                  )
                }
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>🎓 Student: Rahul (CSE, 8.85 CGPA)</div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    rahul.cse@college.edu &bull; Password: <strong>Student@123</strong>
                  </div>
                </div>
                <span style={{ color: '#2563eb', fontSize: '0.75rem', fontWeight: 600 }}>Autofill</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleFillDemo(
                    'student',
                    'arjun.ece@college.edu',
                    'Student@123'
                  )
                }
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>🎓 Student: Arjun (ECE, 6.40 CGPA)</div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    arjun.ece@college.edu &bull; Password: <strong>Student@123</strong>
                  </div>
                </div>
                <span style={{ color: '#2563eb', fontSize: '0.75rem', fontWeight: 600 }}>Autofill</span>
              </button>
            </div>

            <div
              style={{
                marginTop: '0.65rem',
                fontSize: '0.725rem',
                color: '#64748b',
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              Note: Passwords are case-sensitive.
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              fontSize: '0.875rem',
              color: '#64748b',
            }}
          >
            Are you a new student?{' '}
            <Link to="/register" style={{ fontWeight: 700, color: '#2563eb' }}>
              Create Student Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
