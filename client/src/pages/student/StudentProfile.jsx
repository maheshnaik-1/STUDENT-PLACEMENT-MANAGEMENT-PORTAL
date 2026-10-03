import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  User,
  GraduationCap,
  FileText,
  Phone,
  Mail,
  Award,
  Save,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'];

const StudentProfile = () => {
  const { user, updateProfile } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    branch: 'CSE',
    cgpa: '0',
    activeBacklogs: '0',
    passingYear: '2026',
    phone: '',
    skills: '',
    resumeUrl: '',
    password: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        rollNo: user.rollNo || '',
        branch: user.branch || 'CSE',
        cgpa: user.cgpa?.toString() || '0',
        activeBacklogs: user.activeBacklogs?.toString() || '0',
        passingYear: user.passingYear?.toString() || '2026',
        phone: user.phone || '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
        resumeUrl: user.resumeUrl || '',
        password: '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        branch: formData.branch,
        cgpa: parseFloat(formData.cgpa),
        activeBacklogs: parseInt(formData.activeBacklogs, 10),
        passingYear: parseInt(formData.passingYear, 10),
        phone: formData.phone,
        skills: formData.skills,
        resumeUrl: formData.resumeUrl,
      };

      if (formData.password && formData.password.length >= 6) {
        payload.password = formData.password;
      }

      await updateProfile(payload);
      showSuccess('Your academic profile has been updated successfully!');
    } catch (err) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Profile & Academic Record</h1>
          <p className="page-subtitle">
            Ensure your academic details and CGPA are up to date for placement eligibility
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <GraduationCap size={20} color="#2563eb" />
            Profile Details
          </h3>
          <span className="badge badge-applied">Batch of {formData.passingYear}</span>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Read-only Identity / Roll No */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">College Email Address (Registered)</label>
                <input
                  type="email"
                  disabled
                  className="form-control"
                  style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                  value={formData.email}
                />
              </div>
            </div>

            {/* Academic Information */}
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
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Academic Credentials
              </h4>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    disabled
                    className="form-control"
                    style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                    value={formData.rollNo}
                  />
                  <div className="form-help">Roll number cannot be modified.</div>
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
                  <label className="form-label">Cumulative GPA (CGPA) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa"
                    required
                    className="form-control"
                    value={formData.cgpa}
                    onChange={handleChange}
                  />
                  <div className="form-help">Updated CGPA immediately recalculates eligibility.</div>
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
                  <label className="form-label">Graduation Year *</label>
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

            {/* Contact & Portfolio */}
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
                <label className="form-label">Resume Link / Portfolio URL</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    name="resumeUrl"
                    className="form-control"
                    placeholder="https://drive.google.com/... / resume"
                    value={formData.resumeUrl}
                    onChange={handleChange}
                  />
                  {formData.resumeUrl && (
                    <a
                      href={formData.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Preview Resume Link"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Technical Skills (Comma-separated)</label>
              <input
                type="text"
                name="skills"
                className="form-control"
                placeholder="React, Node.js, Python, MongoDB, AWS, Data Structures"
                value={formData.skills}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Change Password (Leave blank to keep unchanged)</label>
              <input
                type="password"
                name="password"
                minLength={6}
                className="form-control"
                placeholder="New password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-lg"
              >
                <Save size={18} />
                <span>{saving ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
