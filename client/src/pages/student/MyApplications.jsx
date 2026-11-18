import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import CompanyLogo from '../../components/common/CompanyLogo';
import Modal from '../../components/common/Modal';
import ApplicationTimeline from '../../components/student/ApplicationTimeline';
import {
  FileCheck2,
  Building2,
  Calendar,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Award,
  Search,
  Filter,
  Eye,
  MapPin,
  Layers,
  Clock,
  CheckCircle2,
  Briefcase,
  RotateCcw,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const STATUS_FILTERS = [
  'ALL',
  'Applied',
  'Shortlisted',
  'Technical Round',
  'Interview',
  'Selected',
  'Rejected',
];

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState(null);
  const [appToWithdraw, setAppToWithdraw] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const { showSuccess, showError } = useNotification();

  const handleConfirmWithdraw = async () => {
    if (!appToWithdraw) return;
    try {
      setWithdrawing(true);
      const res = await api.applications.withdraw(appToWithdraw._id);
      if (res.success) {
        showSuccess(res.message || 'Application withdrawn successfully');
        setApplications((prev) => prev.filter((a) => a._id !== appToWithdraw._id));
        if (selectedApp && selectedApp._id === appToWithdraw._id) {
          setSelectedApp(null);
        }
        setAppToWithdraw(null);
      }
    } catch (err) {
      showError(err.message || 'Failed to withdraw application');
    } finally {
      setWithdrawing(false);
    }
  };

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

  // Filter applications by status and search keyword
  const filteredApplications = applications.filter((app) => {
    const drive = app.drive || {};
    const company = drive.company || {};

    const matchesStatus =
      statusFilter === 'ALL' || app.status === statusFilter;

    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      (company.name && company.name.toLowerCase().includes(searchLower)) ||
      (drive.title && drive.title.toLowerCase().includes(searchLower)) ||
      (drive.location && drive.location.toLowerCase().includes(searchLower)) ||
      (app.remarks && app.remarks.toLowerCase().includes(searchLower));

    return matchesStatus && matchesSearch;
  });

  const selectedCount = applications.filter((a) => a.status === 'Selected').length;
  const shortlistedCount = applications.filter((a) => a.status === 'Shortlisted').length;
  const inProgressCount = applications.filter((a) =>
    ['Applied', 'Technical Round', 'Interview'].includes(a.status)
  ).length;

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

      {/* Metrics Summary Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            margin: 0,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Total Submissions
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {applications.length}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            margin: 0,
            background: '#ffffff',
            border: '1px solid #bfdbfe',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
            Shortlisted
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>
            {shortlistedCount}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            margin: 0,
            background: '#ffffff',
            border: '1px solid #a7f3d0',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
            Offers Received
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
            {selectedCount}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            margin: 0,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Under Review
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#475569', marginTop: '0.2rem' }}>
            {inProgressCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search by company, role, location, or feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#64748b" />
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
          Showing: {filteredApplications.length} of {applications.length}
        </div>
      </div>

      {/* Applications Roster / Table */}
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
      ) : filteredApplications.length === 0 ? (
        <div className="card empty-state">
          <Search size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">No Matching Applications</h3>
          <p className="empty-subtitle">
            No applications match your search query or status filter. Try clearing filters to see all submissions.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '1rem' }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Recruiting Company</th>
                  <th>Drive Role & Package</th>
                  <th>Applied On</th>
                  <th>Current Status</th>
                  <th>Placement Officer Feedback</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
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
                          <CompanyLogo
                            src={company.logoUrl}
                            name={company.name}
                            size={38}
                            borderRadius={8}
                            fontSize="0.9rem"
                          />
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

                      <td style={{ fontSize: '0.825rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        <div>{new Date(app.appliedAt).toLocaleDateString()}</div>
                        {app.updatedAt && app.updatedAt !== app.appliedAt && (
                          <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                            Updated {new Date(app.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td>
                        <StatusBadge status={app.status} />
                      </td>

                      <td style={{ maxWidth: '300px' }}>
                        {app.remarks && app.remarks.trim() ? (
                          <div
                            style={{
                              fontSize: '0.825rem',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.4rem',
                              background: '#f8fafc',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <MessageSquare
                              size={14}
                              color="#2563eb"
                              style={{ flexShrink: 0, marginTop: '2px' }}
                            />
                            <span style={{ fontWeight: 500 }}>{app.remarks}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.825rem' }}>
                            No feedback provided yet.
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedApp(app)}
                            className="btn btn-secondary btn-sm"
                            title="View Full Application Details"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                          <Link
                            to={`/student/drives/${drive._id}`}
                            className="btn btn-secondary btn-sm"
                            title="View Placement Drive Page"
                          >
                            <ExternalLink size={13} />
                          </Link>
                          {app.status === 'Applied' ? (
                            <button
                              type="button"
                              onClick={() => setAppToWithdraw(app)}
                              className="btn btn-secondary btn-sm"
                              title="Withdraw Application"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#dc2626',
                                borderColor: '#fca5a5',
                                background: '#fff',
                              }}
                            >
                              <RotateCcw size={12} />
                              <span>Withdraw</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="btn btn-secondary btn-sm"
                              title="Cannot withdraw: Application is under active review or finalized"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                opacity: 0.5,
                                cursor: 'not-allowed',
                                color: '#94a3b8',
                              }}
                            >
                              <RotateCcw size={12} />
                              <span>Withdraw</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application Quick Details Modal */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title="Application & Drive Details"
        maxWidth="620px"
      >
        {selectedApp && (
          <div>
            {/* Header: Company & Drive Role */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '1.25rem',
              }}
            >
              <CompanyLogo
                src={selectedApp.drive?.company?.logoUrl}
                name={selectedApp.drive?.company?.name}
                size={52}
                borderRadius={12}
                fontSize="1.3rem"
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                  {selectedApp.drive?.company?.name || 'Recruiting Partner'}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0.1rem 0' }}>
                  {selectedApp.drive?.title || 'Placement Drive'}
                </h3>
                <div style={{ fontSize: '0.825rem', color: '#059669', fontWeight: 700 }}>
                  Package CTC: {selectedApp.drive?.packageCTC || 'Competitive'}
                </div>
              </div>
            </div>

            {/* Application Status & Timestamps Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Current Application Status
                </span>
                <StatusBadge status={selectedApp.status} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '0.75rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Submitted On:</span>{' '}
                  <strong style={{ color: '#1e293b' }}>
                    {new Date(selectedApp.appliedAt).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Last Updated:</span>{' '}
                  <strong style={{ color: '#1e293b' }}>
                    {selectedApp.updatedAt
                      ? new Date(selectedApp.updatedAt).toLocaleString()
                      : new Date(selectedApp.appliedAt).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Officer Feedback Card */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#1e40af',
                  textTransform: 'uppercase',
                  marginBottom: '0.4rem',
                }}
              >
                <MessageSquare size={15} />
                <span>Placement Officer Feedback & Notes</span>
              </div>
              <p
                style={{
                  color: '#1e293b',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {selectedApp.remarks && selectedApp.remarks.trim()
                  ? selectedApp.remarks
                  : 'No feedback provided yet. Your application is currently under review by the Training & Placement Cell.'}
              </p>
            </div>

            {/* Application Lifecycle Timeline */}
            <ApplicationTimeline application={selectedApp} />

            {/* Recruitment Rounds & Drive Info */}
            {selectedApp.drive?.rounds && selectedApp.drive.rounds.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                    letterSpacing: '0.5px',
                  }}
                >
                  Recruitment Process Rounds
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedApp.drive.rounds.map((round, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: '#f8fafc',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.85rem',
                        color: '#334155',
                      }}
                    >
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span>{round}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div
              className="modal-footer"
              style={{
                margin: '1.25rem -1.5rem -1.5rem',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                {selectedApp.status === 'Applied' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppToWithdraw(selectedApp);
                    }}
                    className="btn btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      background: '#fef2f2',
                      fontWeight: 600,
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Withdraw Application</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                {selectedApp.drive?._id && (
                  <Link
                    to={`/student/drives/${selectedApp.drive._id}`}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span>Open Drive Posting</span>
                    <ExternalLink size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Application Withdrawal Confirmation Modal */}
      <Modal
        isOpen={!!appToWithdraw}
        onClose={() => !withdrawing && setAppToWithdraw(null)}
        title="Confirm Application Withdrawal"
        maxWidth="500px"
      >
        {appToWithdraw && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                color: '#991b1b',
              }}
            >
              <AlertTriangle size={24} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
                <strong>Are you sure you want to withdraw your application?</strong>
                <div>This will cancel your candidacy for this placement drive.</div>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                Drive Information
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                {appToWithdraw.drive?.company?.name || 'Company'} — {appToWithdraw.drive?.title || 'Placement Drive'}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.35rem' }}>
                Applied on: {new Date(appToWithdraw.appliedAt).toLocaleDateString()}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Notice: The Placement Office will be notified that your application was withdrawn. If the drive deadline has not passed and your profile meets eligibility criteria, you may re-apply before submissions close.
            </p>

            <div
              className="modal-footer"
              style={{ margin: '1.25rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}
            >
              <button
                type="button"
                onClick={() => setAppToWithdraw(null)}
                className="btn btn-secondary"
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                className="btn"
                disabled={withdrawing}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {withdrawing ? (
                  <>
                    <Loader2 size={15} className="spinner" />
                    <span>Withdrawing...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={15} />
                    <span>Confirm Withdrawal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyApplications;
