import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import VisualRecruitmentFunnel from '../../components/officer/VisualRecruitmentFunnel';
import {
  Building2,
  Briefcase,
  Users,
  Award,
  Plus,
  ArrowRight,
  UserCheck,
  TrendingUp,
  FileCheck2,
  Calendar,
} from 'lucide-react';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const { showError } = useNotification();

  const [stats, setStats] = useState(null);
  const [drives, setDrives] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, drivesRes, analyticsRes] = await Promise.all([
        api.applications.getStats(),
        api.drives.getAll(),
        api.applications.getAnalytics().catch((err) => {
          console.warn('Failed to load officer analytics for recent applications:', err);
          return { success: false, data: null };
        }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (drivesRes.success) setDrives(drivesRes.data || []);
      if (analyticsRes.success && analyticsRes.data?.recentApplications) {
        setRecentApplications(analyticsRes.data.recentApplications);
      }
    } catch (err) {
      showError(err.message || 'Failed to load officer dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      {/* Officer Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '2rem 2.25rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#38bdf8',
              marginBottom: '0.75rem',
            }}
          >
            <span>Training & Placement Cell Admin</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', color: '#ffffff', fontWeight: 800 }}>
            Welcome, {user?.name}!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Campus recruitment drive management and candidate evaluation console
          </p>
        </div>

        {/* Quick Action CTAs */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/officer/companies" className="btn btn-secondary">
            <Building2 size={16} />
            <span>Manage Companies</span>
          </Link>
          <Link to="/officer/drives" className="btn btn-primary">
            <Plus size={16} />
            <span>Create Drive</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Recruiting Companies</div>
            <div className="stat-value">{stats?.totalCompanies || 0}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Building2 size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Active Drives</div>
            <div className="stat-value">{stats?.activeDrives || 0}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <Briefcase size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Total Applications</div>
            <div className="stat-value">{stats?.totalApplications || 0}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <FileCheck2 size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Offers Extended</div>
            <div className="stat-value">{stats?.totalSelected || 0}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Recruitment Pipeline Funnel Velocity Widget */}
      {stats?.recruitmentFunnel && (
        <div style={{ marginBottom: '1.75rem' }}>
          <VisualRecruitmentFunnel compact={true} funnelData={stats.recruitmentFunnel} />
        </div>
      )}

      {/* Active Drives Management Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Briefcase size={18} color="#2563eb" />
            Current Placement Drives
          </h3>
          <Link to="/officer/drives" className="btn btn-secondary btn-sm">
            View All Drives ({drives.length})
          </Link>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Loading drives...
            </div>
          ) : drives.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No Placement Drives Created</p>
              <p className="empty-subtitle">
                Click "Create Drive" to post a new campus recruitment drive.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table View */}
              <div className="table-responsive drives-table-desktop">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Company & Role</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Package CTC</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Eligibility Criteria</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Applicants</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drives.slice(0, 5).map((drive) => (
                      <tr key={drive._id || drive.id}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {drive.company?.name || 'Company'}
                          </div>
                          <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
                            {drive.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {drive.location}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {drive.packageCTC}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#475569', maxWidth: '240px' }}>
                          <div style={{ fontWeight: 600 }}>
                            CGPA &ge; {drive.eligibility?.minCGPA || 0}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.35, wordBreak: 'break-word' }}>
                            {drive.eligibility?.allowedBranches?.join(', ') || 'All Branches'}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {drive.totalApplicants || 0} Students
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <StatusBadge status={drive.status} type="drive" />
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <Link
                            to={`/officer/drives/${drive._id || drive.id}/applicants`}
                            className="btn btn-primary btn-sm"
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <Users size={14} />
                            <span>Review Applicants</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (< 768px) */}
              <div className="drives-cards-mobile">
                {drives.slice(0, 5).map((drive) => (
                  <div
                    key={drive._id || drive.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                          {drive.company?.name || 'Company'}
                        </div>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                          {drive.title}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                          {drive.location}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                        <StatusBadge status={drive.status} type="drive" />
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#065f46',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {drive.packageCTC}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: '8px',
                        padding: '0.65rem 0.75rem',
                        fontSize: '0.8rem',
                        color: '#475569',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <span><strong>Eligibility:</strong> CGPA &ge; {drive.eligibility?.minCGPA || 0}</span>
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {drive.totalApplicants || 0} Students Applied
                        </span>
                      </div>
                      {drive.eligibility?.allowedBranches && drive.eligibility.allowedBranches.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.3, wordBreak: 'break-word' }}>
                          Branches: {drive.eligibility.allowedBranches.join(', ')}
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/officer/drives/${drive._id || drive.id}/applicants`}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Users size={14} />
                      <span>Review Applicants</span>
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}
      >
        {/* Top Recruiting Companies */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Award size={18} color="#2563eb" />
              Selections by Top Companies
            </h3>
            <Link to="/officer/reports" style={{ fontSize: '0.825rem', color: '#2563eb', fontWeight: 600 }}>
              Full Analytics
            </Link>
          </div>
          <div className="card-body">
            {stats?.companyHires && stats.companyHires.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.companyHires.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        {item._id}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: '#059669', fontWeight: 600 }}>
                        Package: {item.package || 'N/A'}
                      </div>
                    </div>
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        fontWeight: 700,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                      }}
                    >
                      {item.hires} Hired
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Offers will appear once candidate statuses are updated to 'Selected'.
              </p>
            )}
          </div>
        </div>

        {/* Recent Applications Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FileCheck2 size={18} color="#2563eb" />
              Recent Applications
            </h3>
          </div>
          <div className="card-body">
            {recentApplications && recentApplications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentApplications.map((app) => (
                  <div
                    key={app._id || app.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                        {app.student?.name || 'Student'} ({app.student?.rollNo || app.student?.branch})
                      </div>
                      <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                        Applied to: {app.drive?.company?.name || 'Company'}
                      </div>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                No recent application activity.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
