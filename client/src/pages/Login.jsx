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
} from 'lucide-react';

const Login = () => {
  const [role, setRole] = useState('student'); // 'student' or 'officer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    try {
      await login(email, password, role);
      showSuccess(`Welcome back! Successfully logged in as ${role}.`);
      navigate(role === 'officer' ? '/officer/dashboard' : '/student/dashboard', {
        replace: true,
      });
    } catch (err) {
      const msg = err.message || 'Invalid email or password';
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
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                {role === 'officer' ? 'Officer Email' : 'Student College Email'}
              </label>
              <input
                type="email"
                required
                className="form-control"
                placeholder={
                  role === 'officer'
                    ? 'officer@college.edu'
                    : 'your.name@college.edu'
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Password</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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

          {/* Quick Demo Credentials Autofill */}
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
              <span>One-Click Demo Fillers (Viva Ready):</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
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
                  borderRadius: '6px',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>🔑 Placement Officer (Dr. Sharma)</span>
                <span style={{ color: '#2563eb', fontSize: '0.75rem' }}>Autofill</span>
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
                  borderRadius: '6px',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>🎓 Student: Rahul (CSE, 8.85 CGPA)</span>
                <span style={{ color: '#2563eb', fontSize: '0.75rem' }}>Autofill</span>
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
                  borderRadius: '6px',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>🎓 Student: Arjun (ECE, 6.40 CGPA, 1 Backlog)</span>
                <span style={{ color: '#2563eb', fontSize: '0.75rem' }}>Autofill</span>
              </button>
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
