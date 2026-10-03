import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import {
  FileCheck2,
  Building2,
  Calendar,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Award,
} from 'lucide-react';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useNotification();

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.applications.getMyApplications();
      if (res.success) {
        setApplications(res.data || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch your applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Placement Applications</h1>
          <p className="page-subtitle">
            Track real-time selection rounds, application progress, and officer feedback
          </p>
        </div>

        <Link to="/student/drives" className="btn btn-primary">
          Explore More Drives
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <p>Loading application history...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="card empty-state">
          <FileCheck2 size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">No Applications Submitted</h3>
          <p className="empty-subtitle">
            You have not applied for any placement drives yet. Visit the Placement Drives section to view eligible drives and submit applications.
          </p>
          <Link
            to="/student/drives"
            className="btn btn-primary"
            style={{ marginTop: '1.25rem' }}
          >
            Browse Available Drives
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Recruiting Company</th>
                  <th>Drive Role & Package</th>
                  <th>Applied Date</th>
                  <th>Current Status</th>
                  <th>Placement Officer Feedback</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const drive = app.drive || {};
                  const company = drive.company || {};
                  const isSelected = app.status === 'Selected';

                  return (
                    <tr
                      key={app._id}
                      style={{
                        background: isSelected ? '#f0fdf4' : 'transparent',
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.name}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                border: '1px solid #e2e8f0',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                background: '#2563eb',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                              }}
                            >
                              {company.name ? company.name.substring(0, 2).toUpperCase() : 'CO'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>
                              {company.name || 'Company'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {company.location || 'India'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {drive.title || 'Placement Drive'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                          CTC: {drive.packageCTC || 'Competitive'}
                        </div>
                      </td>

                      <td style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </td>

                      <td>
                        <StatusBadge status={app.status} />
                      </td>

                      <td style={{ maxWidth: '280px' }}>
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.35rem',
                          }}
                        >
                          <MessageSquare
                            size={14}
                            color="#94a3b8"
                            style={{ flexShrink: 0, marginTop: '3px' }}
                          />
                          <span>{app.remarks || 'Application under review.'}</span>
                        </div>
                      </td>

                      <td>
                        <Link
                          to={`/student/drives/${drive._id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <span>Drive Details</span>
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyApplications;
