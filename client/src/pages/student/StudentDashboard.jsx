import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import DriveCard from '../../components/student/DriveCard';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Briefcase,
  CheckCircle2,
  FileCheck,
  Award,
  ArrowRight,
  TrendingUp,
  User,
  Sparkles,
  BookOpen,
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [drivesRes, appsRes] = await Promise.all([
        api.drives.getAll(),
        api.applications.getMyApplications(),
      ]);

      if (drivesRes.success) setDrives(drivesRes.data || []);
      if (appsRes.success) setApplications(appsRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApply = async (drive) => {
    try {
      setApplyingId(drive._id);
      const res = await api.applications.apply(drive._id);
      if (res.success) {
        showSuccess(res.message || 'Application submitted successfully!');
        fetchDashboardData();
      }
    } catch (err) {
      showError(err.message || 'Failed to submit application');
    } finally {
      setApplyingId(null);
    }
  };

  const eligibleDrivesCount = drives.filter((d) => d.isEligible !== false).length;
  const selectedApplications = applications.filter((a) => a.status === 'Selected');

  return (
    <div>
      {/* Student Welcome Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '2rem 2.25rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            <Sparkles size={14} />
            <span>Student Placement Portal</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', color: '#ffffff', fontWeight: 800 }}>
            Welcome back, {user?.name}!
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '0.5rem',
              fontSize: '0.9rem',
              color: '#dbeafe',
              flexWrap: 'wrap',
            }}
          >
            <span>Roll No: <strong>{user?.rollNo || 'N/A'}</strong></span>
            <span>•</span>
            <span>Branch: <strong>{user?.branch}</strong></span>
            <span>•</span>
            <span>CGPA: <strong>{user?.cgpa}</strong></span>
            <span>•</span>
            <span>Active Backlogs: <strong>{user?.activeBacklogs ?? 0}</strong></span>
          </div>
        </div>

        <div>
          <Link
            to="/student/profile"
            className="btn"
            style={{
              background: '#ffffff',
              color: '#1d4ed8',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <User size={16} />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Available Drives</div>
            <div className="stat-value">{drives.length}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Briefcase size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Eligible For You</div>
            <div className="stat-value">{eligibleDrivesCount}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Applications Submitted</div>
            <div className="stat-value">{applications.length}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <FileCheck size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Offers Received</div>
            <div className="stat-value">{selectedApplications.length}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Selection Offer Announcement Banner (If any) */}
      {selectedApplications.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem 2rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 800 }}>
                🎉 Congratulations! You have received a Placement Offer!
              </h3>
              <p style={{ color: '#d1fae5', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                {selectedApplications.map((app) => (
                  <span key={app._id}>
                    Offer from <strong>{app.drive?.company?.name || 'Company'}</strong> ({app.drive?.title})
                  </span>
                ))}
              </p>
            </div>
          </div>
          <Link
            to="/student/applications"
            className="btn"
            style={{
              background: '#ffffff',
              color: '#065f46',
              fontWeight: 700,
            }}
          >
            View Offer Letter / Details
          </Link>
        </div>
      )}

      {/* Main Grid: Recommended Drives & Recent Application Tracker */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Recommended Placement Drives */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
              Active Placement Drives
            </h3>
            <Link
              to="/student/drives"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>View All ({drives.length})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <p style={{ color: '#64748b' }}>Loading active drives...</p>
          ) : drives.length === 0 ? (
            <div className="card empty-state">
              <p className="empty-title">No Active Drives</p>
              <p className="empty-subtitle">
                New company placement drives will appear here once announced.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {drives.slice(0, 3).map((drive) => (
                <DriveCard
                  key={drive._id}
                  drive={drive}
                  onApply={handleApply}
                  isApplying={applyingId === drive._id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Application Status Tracker */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
              My Applications Track
            </h3>
            <Link
              to="/student/applications"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>All Applications ({applications.length})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="card">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Loading application status...
              </div>
            ) : applications.length === 0 ? (
              <div className="empty-state" style={{ padding: '2.5rem 1.5rem' }}>
                <FileCheck size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                <h4 className="empty-title">No Applications Yet</h4>
                <p className="empty-subtitle">
                  Browse available placement drives and apply to start your recruitment journey.
                </p>
                <Link
                  to="/student/drives"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '1rem' }}
                >
                  Explore Drives
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Company & Role</th>
                      <th>Status</th>
                      <th>Applied On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 5).map((app) => (
                      <tr key={app._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>
                            {app.drive?.company?.name || 'Company'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {app.drive?.title}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={app.status} />
                        </td>
                        <td style={{ fontSize: '0.825rem', color: '#64748b' }}>
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
