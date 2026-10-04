import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import StatusUpdateModal from '../../components/officer/StatusUpdateModal';
import Modal from '../../components/common/Modal';
import {
  Users,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Edit3,
  ExternalLink,
  Mail,
  Phone,
  FileCheck2,
  Building2,
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  Loader2,
  AlertCircle,
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

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const isStudentPdf = (student) => {
  const rf = student?.resumeFile;
  if (!rf || !rf.filename) return false;
  return Boolean(
    rf.mimeType === 'application/pdf' ||
      (rf.filename || '').toLowerCase().endsWith('.pdf') ||
      (rf.originalName || '').toLowerCase().endsWith('.pdf')
  );
};

const hasUploadedResume = (student) => {
  return Boolean(student?.resumeFile && student.resumeFile.filename);
};

const DriveApplicants = () => {
  const { driveId } = useParams();
  const { showSuccess, showError } = useNotification();

  const [drive, setDrive] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedAppForStatus, setSelectedAppForStatus] = useState(null);
  const [selectedStudentForView, setSelectedStudentForView] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Resume Preview State for Officer
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [downloadingStudentId, setDownloadingStudentId] = useState(null);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const res = await api.applications.getDriveApplicants(driveId, {
        status: statusFilter,
        search,
      });

      if (res.success) {
        setDrive(res.drive);
        setApplicants(res.data || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch applicants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [driveId, statusFilter, search]);

  const handleStatusUpdate = async ({ status, remarks }) => {
    if (!selectedAppForStatus) return;
    try {
      setIsUpdatingStatus(true);
      const res = await api.applications.updateStatus(selectedAppForStatus._id, {
        status,
        remarks,
      });

      if (res.success) {
        showSuccess(res.message || 'Status updated successfully!');
        setSelectedAppForStatus(null);
        fetchApplicants();
      }
    } catch (err) {
      showError(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Export Applicants to CSV
  const handleExportCSV = () => {
    if (applicants.length === 0) {
      showError('No applicants to export.');
      return;
    }

    const headers = [
      'Roll Number',
      'Student Name',
      'Email',
      'Branch',
      'CGPA',
      'Backlogs',
      'Phone',
      'Status',
      'Officer Remarks',
      'Applied Date',
    ];

    const rows = applicants.map((app) => {
      const s = app.student || {};
      return [
        `"${s.rollNo || ''}"`,
        `"${s.name || ''}"`,
        `"${s.email || ''}"`,
        `"${s.branch || ''}"`,
        s.cgpa || 0,
        s.activeBacklogs ?? 0,
        `"${s.phone || ''}"`,
        `"${app.status || ''}"`,
        `"${(app.remarks || '').replace(/"/g, '""')}"`,
        `"${new Date(app.appliedAt).toLocaleDateString()}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${(drive?.company?.name || 'Drive')}_Applicants_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Applicant roster exported to CSV successfully!');
  };

  // Open PDF Preview Modal
  const handleOpenPreview = async (student) => {
    if (!student?._id) return;
    setPreviewStudent(student);
    setPreviewModalOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);

    // Revoke previous blob if any
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const blob = await api.auth.downloadResume(student._id);
      const url = window.URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
    } catch (err) {
      console.error('Failed to load candidate PDF preview:', err);
      setPreviewError(err.message || 'Unable to load PDF document for preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Close PDF Preview Modal
  const handleClosePreview = () => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewModalOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewStudent(null);
  };

  // Download Resume
  const handleDownloadResume = async (student) => {
    if (!student?._id) return;
    try {
      setDownloadingStudentId(student._id);
      const blob = await api.auth.downloadResume(student._id);
      const filename =
        student.resumeFile?.originalName ||
        `${student.name ? student.name.replace(/\s+/g, '_') : 'Student'}_Resume.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showSuccess(`Downloaded resume for ${student.name || 'candidate'}.`);
    } catch (err) {
      showError(err.message || 'Failed to download resume file.');
    } finally {
      setDownloadingStudentId(null);
    }
  };

  // Cleanup Blob URL on component unmount
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const selectedCount = applicants.filter((a) => a.status === 'Selected').length;

  return (
    <div>
      {/* Back Link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/officer/drives"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#64748b',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Placement Drives</span>
        </Link>
      </div>

      {/* Drive Overview Summary Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem 2rem',
          border: '1px solid #cbd5e1',
          marginBottom: '1.5rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#2563eb',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.25rem',
              }}
            >
              <Building2 size={14} />
              <span>{drive?.company?.name || 'Company Recruitment Drive'}</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              {drive?.title || 'Placement Drive Applicants'}
            </h1>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                fontSize: '0.85rem',
                color: '#64748b',
                marginTop: '0.35rem',
                flexWrap: 'wrap',
              }}
            >
              <span>Package: <strong style={{ color: '#059669' }}>{drive?.packageCTC}</strong></span>
              <span>•</span>
              <span>Min CGPA: <strong>{drive?.eligibility?.minCGPA || 0}</strong></span>
              <span>•</span>
              <span>Drive Date: <strong>{drive?.driveDate ? new Date(drive.driveDate).toLocaleDateString() : 'N/A'}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={handleExportCSV} className="btn btn-secondary">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Applicant Metrics / Filters Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search applicants by name, roll no, email, or branch..."
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
                Filter: {s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
          Total: {applicants.length} | Selected: <span style={{ color: '#059669' }}>{selectedCount}</span>
        </div>
      </div>

      {/* Applicants Roster Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <p>Loading candidate applications...</p>
        </div>
      ) : applicants.length === 0 ? (
        <div className="card empty-state">
          <Users size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">No Applicants Found</h3>
          <p className="empty-subtitle">
            No student applications match the current filter or search criteria.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Candidate</th>
                  <th>Branch & CGPA</th>
                  <th>Resume / Skills</th>
                  <th>Applied On</th>
                  <th>Current Status</th>
                  <th>Feedback / Remarks</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((app) => {
                  const s = app.student || {};
                  const isSelected = app.status === 'Selected';

                  return (
                    <tr
                      key={app._id}
                      style={{
                        background: isSelected ? '#f0fdf4' : 'transparent',
                      }}
                    >
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>
                        {s.rollNo || 'N/A'}
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {s.name || 'Student Name'}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                          {s.email}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {s.branch} • <span style={{ color: '#2563eb' }}>{s.cgpa} CGPA</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Backlogs: {s.activeBacklogs ?? 0}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {/* Uploaded Resume Actions */}
                          {hasUploadedResume(s) && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {isStudentPdf(s) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(s)}
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.75rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    borderColor: '#bfdbfe',
                                  }}
                                  title="Preview uploaded PDF resume"
                                >
                                  <Eye size={12} />
                                  <span>Preview</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDownloadResume(s)}
                                disabled={downloadingStudentId === s._id}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                                title={`Download ${s.resumeFile?.originalName || 'resume'}`}
                              >
                                <Download size={12} />
                                <span>{isStudentPdf(s) ? 'Download' : 'Download DOC'}</span>
                              </button>
                            </div>
                          )}

                          {/* External Resume URL */}
                          {s.resumeUrl && (
                            <div>
                              <a
                                href={s.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.775rem',
                                  color: '#2563eb',
                                  fontWeight: 600,
                                }}
                                title={s.resumeUrl}
                              >
                                <span>External Link</span>
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          )}

                          {/* Neither exists */}
                          {!hasUploadedResume(s) && !s.resumeUrl && (
                            <span style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                              No resume available
                            </span>
                          )}

                          {/* Skills List */}
                          {s.skills && s.skills.length > 0 && (
                            <div
                              style={{
                                fontSize: '0.725rem',
                                color: '#64748b',
                                marginTop: '0.1rem',
                                maxWidth: '180px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={s.skills.join(', ')}
                            >
                              {s.skills.slice(0, 3).join(', ')}
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </td>

                      <td>
                        <StatusBadge status={app.status} />
                      </td>

                      <td style={{ maxWidth: '200px', fontSize: '0.8rem', color: '#475569' }}>
                        {app.remarks || '-'}
                      </td>

                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => setSelectedStudentForView(s)}
                            className="btn btn-secondary btn-sm"
                            title="View Full Student Academic Details"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => setSelectedAppForStatus(app)}
                            className="btn btn-primary btn-sm"
                          >
                            <Edit3 size={13} />
                            <span>Update Status</span>
                          </button>
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

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={!!selectedAppForStatus}
        onClose={() => setSelectedAppForStatus(null)}
        application={selectedAppForStatus}
        onSubmit={handleStatusUpdate}
        isSubmitting={isUpdatingStatus}
      />

      {/* Student Academic Details View Modal */}
      <Modal
        isOpen={!!selectedStudentForView}
        onClose={() => setSelectedStudentForView(null)}
        title="Student Candidate Profile"
        maxWidth="580px"
      >
        {selectedStudentForView && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  margin: '0 auto 0.5rem',
                }}
              >
                {selectedStudentForView.name?.substring(0, 2).toUpperCase()}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {selectedStudentForView.name}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Roll No: <strong>{selectedStudentForView.rollNo}</strong> • Branch: <strong>{selectedStudentForView.branch}</strong>
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>CGPA:</span>{' '}
                <strong style={{ color: '#2563eb' }}>{selectedStudentForView.cgpa}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Backlogs:</span>{' '}
                <strong>{selectedStudentForView.activeBacklogs ?? 0}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Passing Year:</span>{' '}
                <strong>{selectedStudentForView.passingYear || 2026}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Phone:</span>{' '}
                <strong>{selectedStudentForView.phone || 'N/A'}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                Technical Skills
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {selectedStudentForView.skills && selectedStudentForView.skills.length > 0 ? (
                  selectedStudentForView.skills.map((sk, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {sk}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No skills listed</span>
                )}
              </div>
            </div>

            {/* Resume & Portfolio Documents Section */}
            <div style={{ marginBottom: '1.25rem' }}>
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
                Resume & Portfolio Documents
              </div>

              {/* Case A & C: Uploaded Resume */}
              {hasUploadedResume(selectedStudentForView) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    marginBottom: selectedStudentForView.resumeUrl ? '0.6rem' : '0',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: isStudentPdf(selectedStudentForView) ? '#eff6ff' : '#f0fdf4',
                        color: isStudentPdf(selectedStudentForView) ? '#2563eb' : '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                        {selectedStudentForView.resumeFile.originalName || 'Uploaded Resume Document'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span>{formatFileSize(selectedStudentForView.resumeFile.size)}</span>
                        <span>•</span>
                        <span>
                          {selectedStudentForView.resumeFile.uploadedAt
                            ? `Uploaded ${new Date(selectedStudentForView.resumeFile.uploadedAt).toLocaleDateString()}`
                            : 'Uploaded File'}
                        </span>
                        {!isStudentPdf(selectedStudentForView) && (
                          <span style={{ color: '#6366f1', fontWeight: 500 }}>
                            (DOC/DOCX • Download only)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {isStudentPdf(selectedStudentForView) && (
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(selectedStudentForView)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          borderColor: '#bfdbfe',
                        }}
                      >
                        <Eye size={14} />
                        <span>Preview</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadResume(selectedStudentForView)}
                      disabled={downloadingStudentId === selectedStudentForView._id}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Case B & C: External Resume Link */}
              {selectedStudentForView.resumeUrl && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ExternalLink size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                        External Resume / Portfolio Link
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#2563eb',
                          maxWidth: '260px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={selectedStudentForView.resumeUrl}
                      >
                        {selectedStudentForView.resumeUrl}
                      </div>
                    </div>
                  </div>

                  <a
                    href={selectedStudentForView.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <ExternalLink size={14} />
                    <span>Visit Resume</span>
                  </a>
                </div>
              )}

              {/* Case D: Neither */}
              {!hasUploadedResume(selectedStudentForView) && !selectedStudentForView.resumeUrl && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                  }}
                >
                  No resume available for this candidate
                </div>
              )}
            </div>

            <div
              className="modal-footer"
              style={{ margin: '1rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}
            >
              <button
                type="button"
                onClick={() => setSelectedStudentForView(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* PDF Resume Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        title={`Resume Preview — ${previewStudent?.name || 'Student Candidate'} (${previewStudent?.resumeFile?.originalName || 'Resume.pdf'})`}
        maxWidth="880px"
      >
        <div>
          {previewLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                color: '#2563eb',
                gap: '1rem',
              }}
            >
              <Loader2 size={36} className="spin" />
              <div style={{ fontWeight: 600, color: '#475569' }}>
                Fetching authenticated PDF preview for {previewStudent?.name || 'candidate'}...
              </div>
            </div>
          )}

          {previewError && !previewLoading && (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                background: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                color: '#991b1b',
              }}
            >
              <AlertCircle size={36} style={{ margin: '0 auto 1rem', color: '#dc2626' }} />
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Preview Not Available
              </h4>
              <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem', color: '#7f1d1d' }}>
                {previewError}
              </p>
              {previewStudent && (
                <button
                  type="button"
                  onClick={() => handleDownloadResume(previewStudent)}
                  className="btn btn-primary btn-sm"
                  style={{ margin: '0 auto' }}
                >
                  <Download size={16} />
                  <span>Download Resume File Instead</span>
                </button>
              )}
            </div>
          )}

          {previewBlobUrl && !previewLoading && !previewError && (
            <div>
              <iframe
                src={previewBlobUrl}
                title={`PDF Resume Preview - ${previewStudent?.name || 'Student'}`}
                style={{
                  width: '100%',
                  height: '70vh',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#f8fafc',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Viewing authenticated PDF resume stream for <strong>{previewStudent?.name}</strong> ({previewStudent?.rollNo}).
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleDownloadResume(previewStudent)}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Download size={15} />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="btn btn-secondary btn-sm"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DriveApplicants;
