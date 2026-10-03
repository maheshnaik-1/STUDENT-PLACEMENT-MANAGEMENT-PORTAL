import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  GraduationCap,
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rollNo: '',
    branch: 'CSE',
    cgpa: '8.0',
    activeBacklogs: '0',
    passingYear: '2026',
    phone: '',
    skills: '',
    resumeUrl: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        rollNo: formData.rollNo,
        branch: formData.branch,
        cgpa: parseFloat(formData.cgpa),
        activeBacklogs: parseInt(formData.activeBacklogs, 10),
        passingYear: parseInt(formData.passingYear, 10),
        phone: formData.phone,
        skills: formData.skills,
        resumeUrl: formData.resumeUrl,
      };

      await register(payload);
      showSuccess('Registration successful! Welcome to your Placement Portal.');
      navigate('/student/dashboard');
    } catch (err) {
      const msg = err.message || 'Registration failed. Please check your details.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '680px',
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
            <UserPlus size={24} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Student Portal Registration
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Register your academic profile to apply for campus recruitment drives
          </p>
        </div>

        <div className="card-body" style={{ padding: '2rem' }}>
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="form-control"
                  placeholder="e.g. Rahul Verma"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">College Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="form-control"
                  placeholder="rahul.cse@college.edu"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Account Password *</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="form-control"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  className="form-control"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Academic Info */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                margin: '1rem 0 1.5rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Academic Credentials (Used for Eligibility Matching)
              </h4>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">College Roll Number *</label>
                  <input
                    type="text"
                    name="rollNo"
                    required
                    className="form-control"
                    placeholder="e.g. 22CS101"
                    value={formData.rollNo}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Engineering Branch *</label>
                  <select
                    name="branch"
                    className="form-control"
                    value={formData.branch}
                    onChange={handleChange}
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Current CGPA (0-10) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa"
                    required
                    className="form-control"
                    placeholder="8.50"
                    value={formData.cgpa}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Active Backlogs *</label>
                  <input
                    type="number"
                    min="0"
                    name="activeBacklogs"
                    required
                    className="form-control"
                    value={formData.activeBacklogs}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Passing Batch Year *</label>
                  <input
                    type="number"
                    name="passingYear"
                    required
                    className="form-control"
                    value={formData.passingYear}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Resume URL / Portfolio Link</label>
                <input
                  type="url"
                  name="resumeUrl"
                  className="form-control"
                  placeholder="https://drive.google.com/... / portfolio"
                  value={formData.resumeUrl}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Technical Skills (Comma-separated)</label>
              <input
                type="text"
                name="skills"
                className="form-control"
                placeholder="React, Node.js, Python, MongoDB, Data Structures"
                value={formData.skills}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {submitting ? 'Creating Profile...' : 'Complete Student Registration'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              fontSize: '0.875rem',
              color: '#64748b',
            }}
          >
            Already registered?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: '#2563eb' }}>
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
