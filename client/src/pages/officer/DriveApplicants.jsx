import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import StatusUpdateModal from '../../components/officer/StatusUpdateModal';
import BulkStatusUpdateModal from '../../components/officer/BulkStatusUpdateModal';
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
  CheckCircle2,
  XCircle,
  GraduationCap,
  Award,
  FolderGit2,
  Globe,
  Github,
  Linkedin,
  Clock,
  Sparkles,
  User,
  RotateCcw,
  CheckSquare,
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

const BRANCH_OPTIONS = [
  'ALL',
  'CSE',
  'IT',
  'ECE',
  'EEE',
  'MECH',
  'CIVIL',
  'AI&DS',
];

const CGPA_OPTIONS = [
  { value: 'ALL', label: 'All CGPA' },
  { value: '6.0', label: '≥ 6.0 CGPA' },
  { value: '7.0', label: '≥ 7.0 CGPA' },
  { value: '7.5', label: '≥ 7.5 CGPA' },
  { value: '8.0', label: '≥ 8.0 CGPA' },
  { value: '8.5', label: '≥ 8.5 CGPA' },
  { value: '9.0', label: '≥ 9.0 CGPA' },
];

const ELIGIBILITY_OPTIONS = [
  { value: 'ALL', label: 'All Eligibility' },
  { value: 'ELIGIBLE', label: 'Eligible Only' },
  { value: 'INELIGIBLE', label: 'Ineligible Only' },
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

/**
 * Reusable eligibility evaluation for Drive vs Candidate
 */
const evaluateEligibility = (student, drive) => {
  if (!student || !drive) return { isEligible: true, details: [] };

  const elig = drive.eligibility || {};
  const details = [];
  let isEligible = true;

  // 1. CGPA
  const minCGPA = Number(elig.minCGPA) || 0;
  const studentCGPA = Number(student.cgpa) || 0;
  const cgpaOk = studentCGPA >= minCGPA;
  if (!cgpaOk) isEligible = false;
  details.push({
    criteria: 'Minimum CGPA',
    required: `≥ ${minCGPA.toFixed(2)}`,
    actual: studentCGPA.toFixed(2),
    passed: cgpaOk,
  });

  // 2. Backlogs
  const maxBacklogs = elig.maxBacklogs !== undefined ? Number(elig.maxBacklogs) : 0;
  const studentBacklogs = Number(student.activeBacklogs) || 0;
  const backlogsOk = studentBacklogs <= maxBacklogs;
  if (!backlogsOk) isEligible = false;
  details.push({
    criteria: 'Max Backlogs',
    required: `≤ ${maxBacklogs}`,
    actual: `${studentBacklogs}`,
    passed: backlogsOk,
  });

  // 3. Branches
  const eligibleBranches =
    Array.isArray(elig.eligibleBranches) && elig.eligibleBranches.length > 0
      ? elig.eligibleBranches
      : [];
  const branchOk = eligibleBranches.length === 0 || eligibleBranches.includes(student.branch);
  if (!branchOk) isEligible = false;
  details.push({
    criteria: 'Eligible Branch',
    required: eligibleBranches.length > 0 ? eligibleBranches.join(', ') : 'All Branches',
    actual: student.branch || 'N/A',
    passed: branchOk,
  });

  // 4. Passing Year
  const reqPassingYear = Number(elig.passingYear);
  const studentPassingYear = Number(student.passingYear);
  const yearOk = !reqPassingYear || studentPassingYear === reqPassingYear;
  if (!yearOk) isEligible = false;
  if (reqPassingYear) {
    details.push({
      criteria: 'Passing Batch',
      required: `${reqPassingYear}`,
      actual: `${studentPassingYear || 'N/A'}`,
      passed: yearOk,
    });
  }

  return { isEligible, details };
};

const DriveApplicants = () => {
  const { driveId } = useParams();
  const { showSuccess, showError } = useNotification();

  const [drive, setDrive] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Advanced Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [cgpaFilter, setCgpaFilter] = useState('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL');

  // Selection & Modal States
  const [selectedAppIds, setSelectedAppIds] = useState(new Set());
  const [selectedAppForStatus, setSelectedAppForStatus] = useState(null);
  const [selectedAppForEval, setSelectedAppForEval] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

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
      const res = await api.applications.getDriveApplicants(driveId);

      if (res.success) {
        setDrive(res.drive);
        setApplicants(res.data || []);

        // If an application was opened in the evaluation modal, refresh its reference
        if (selectedAppForEval) {
          const updatedApp = (res.data || []).find((a) => a._id === selectedAppForEval._id);
          if (updatedApp) {
            setSelectedAppForEval(updatedApp);
          }
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch applicants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
    setSelectedAppIds(new Set());
  }, [driveId]);

  // Compute Filtered Applicants
  const filteredApplicants = applicants.filter((app) => {
    const s = app.student || {};

    // 1. Status Filter
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;

    // 2. Branch Filter
    if (branchFilter !== 'ALL' && s.branch !== branchFilter) return false;

    // 3. Minimum CGPA Filter
    if (cgpaFilter !== 'ALL') {
      const minCgpa = parseFloat(cgpaFilter);
      const studentCgpa = parseFloat(s.cgpa) || 0;
      if (!isNaN(minCgpa) && studentCgpa < minCgpa) return false;
    }

    // 4. Eligibility Filter (uses canonical evaluateEligibility source of truth)
    if (eligibilityFilter !== 'ALL') {
      const evalResult = evaluateEligibility(s, drive);
      if (eligibilityFilter === 'ELIGIBLE' && !evalResult.isEligible) return false;
      if (eligibilityFilter === 'INELIGIBLE' && evalResult.isEligible) return false;
    }

    // 5. Multi-field Search (Name, Roll No, Email, Branch, Technical Skills)
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const rollMatch = (s.rollNo || '').toLowerCase().includes(q);
      const emailMatch = (s.email || '').toLowerCase().includes(q);
      const branchMatch = (s.branch || '').toLowerCase().includes(q);
      const skillsMatch = Array.isArray(s.skills)
        ? s.skills.some((sk) => sk.toLowerCase().includes(q))
        : typeof s.skills === 'string'
        ? s.skills.toLowerCase().includes(q)
        : false;

      if (!nameMatch && !rollMatch && !emailMatch && !branchMatch && !skillsMatch) {
        return false;
      }
    }

    return true;
  });

  const activeFilterCount =
    (statusFilter !== 'ALL' ? 1 : 0) +
    (branchFilter !== 'ALL' ? 1 : 0) +
    (cgpaFilter !== 'ALL' ? 1 : 0) +
    (eligibilityFilter !== 'ALL' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setBranchFilter('ALL');
    setCgpaFilter('ALL');
    setEligibilityFilter('ALL');
    setSearch('');
  };

  // Selection Management
  const isAllSelected =
    filteredApplicants.length > 0 &&
    filteredApplicants.every((a) => selectedAppIds.has(a._id));

  const isSomeSelected =
    filteredApplicants.some((a) => selectedAppIds.has(a._id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedAppIds);
    if (isAllSelected) {
      filteredApplicants.forEach((a) => next.delete(a._id));
    } else {
      filteredApplicants.forEach((a) => next.add(a._id));
    }
    setSelectedAppIds(next);
  };

  const handleToggleSelectRow = (appId) => {
    const next = new Set(selectedAppIds);
    if (next.has(appId)) {
      next.delete(appId);
    } else {
      next.add(appId);
    }
    setSelectedAppIds(next);
  };

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

  const handleBulkStatusSubmit = async ({ status, remarks }) => {
    if (selectedAppIds.size === 0) return;
    try {
      setIsBulkUpdating(true);
      const res = await api.applications.bulkUpdateStatus({
        driveId,
        applicationIds: Array.from(selectedAppIds),
        status,
        remarks,
      });

      if (res.success) {
        showSuccess(res.message || 'Bulk status update completed successfully!');
        setSelectedAppIds(new Set());
        setBulkModalOpen(false);
        fetchApplicants();
      }
    } catch (err) {
      showError(err.message || 'Failed to execute bulk status update');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Filtered CSV Export Handler
  const handleExportCSV = () => {
    if (filteredApplicants.length === 0) {
      showError('No applicants matching current filters to export.');
      return;
    }

    const headers = [
      'Roll Number',
      'Student Name',
      'Email',
      'Branch',
      'CGPA',
      'Active Backlogs',
      'Passing Batch',
      'Phone',
      'Drive Title',
      'Company Name',
      'Application Date',
      'Current Status',
      'Officer Feedback',
      'Eligibility Status',
    ];

    const escapeCSV = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = filteredApplicants.map((app) => {
      const s = app.student || {};
      const evalResult = evaluateEligibility(s, drive);
      return [
        escapeCSV(s.rollNo || 'N/A'),
        escapeCSV(s.name || ''),
        escapeCSV(s.email || ''),
        escapeCSV(s.branch || ''),
        s.cgpa || 0,
        s.activeBacklogs ?? 0,
        escapeCSV(s.passingYear || drive?.eligibility?.passingYear || '2026'),
        escapeCSV(s.phone || ''),
        escapeCSV(drive?.title || ''),
        escapeCSV(drive?.company?.name || ''),
        escapeCSV(new Date(app.appliedAt).toLocaleDateString()),
        escapeCSV(app.status || 'Applied'),
        escapeCSV(app.remarks || ''),
        escapeCSV(evalResult.isEligible ? 'ELIGIBLE' : 'INELIGIBLE'),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${(drive?.company?.name || 'Drive').replace(/\s+/g, '_')}_Filtered_Applicants_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(`Exported ${filteredApplicants.length} filtered applicant(s) to CSV!`);
  };

  // Open PDF Preview Modal
  const handleOpenPreview = async (student) => {
    if (!student?._id) return;
    setPreviewStudent(student);
    setPreviewModalOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);

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

  const evalStudent = selectedAppForEval?.student;
  const evalEligibility = evalStudent && drive ? evaluateEligibility(evalStudent, drive) : null;

  return (
    <div style={{ paddingBottom: '3rem' }}>
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
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem' }}>
              {drive?.title || 'Placement Drive Applicants'}
            </h1>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                fontSize: '0.85rem',
                color: '#64748b',
                flexWrap: 'wrap',
              }}
            >
              <span>
                Package: <strong style={{ color: '#059669' }}>{drive?.packageCTC}</strong>
              </span>
              <span>•</span>
              <span>
                Min CGPA: <strong>{drive?.eligibility?.minCGPA || 0}</strong>
              </span>
              <span>•</span>
              <span>
                Drive Date:{' '}
                <strong>
                  {drive?.driveDate ? new Date(drive.driveDate).toLocaleDateString() : 'N/A'}
                </strong>
              </span>
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

      {/* Advanced Applicant Filters Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Row 1: Search & Reset */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '260px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search applicants by name, roll no, email, branch, or technical skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
            >
              <RotateCcw size={14} />
              <span>Reset Filters ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Row 2: Select Filter Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} color="#64748b" style={{ flexShrink: 0 }} />
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: '0.825rem' }}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              className="form-control"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{ fontSize: '0.825rem' }}
            >
              {BRANCH_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  Branch: {b}
                </option>
              ))}
            </select>
          </div>

          {/* CGPA Filter */}
          <div>
            <select
              className="form-control"
              value={cgpaFilter}
              onChange={(e) => setCgpaFilter(e.target.value)}
              style={{ fontSize: '0.825rem' }}
            >
              {CGPA_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  CGPA: {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Eligibility Filter */}
          <div>
            <select
              className="form-control"
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value)}
              style={{ fontSize: '0.825rem' }}
            >
              {ELIGIBILITY_OPTIONS.map((el) => (
                <option key={el.value} value={el.value}>
                  {el.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Metrics Summary Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.825rem',
            color: '#64748b',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            Showing <strong style={{ color: '#0f172a' }}>{filteredApplicants.length}</strong> of{' '}
            <strong style={{ color: '#0f172a' }}>{applicants.length}</strong> total applicants
            {activeFilterCount > 0 && <span style={{ color: '#2563eb' }}> ({activeFilterCount} active filters)</span>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span>
              Offers Extended: <strong style={{ color: '#16a34a' }}>{selectedCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedAppIds.size > 0 && (
        <div
          style={{
            position: 'sticky',
            top: '75px',
            zIndex: 40,
            background: '#1e293b',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '0.75rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            flexWrap: 'wrap',
            gap: '0.75rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                background: '#2563eb',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              {selectedAppIds.size} Selected
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Batch applicant actions ready
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Edit3 size={14} />
              <span>Bulk Update Status ({selectedAppIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedAppIds(new Set())}
              className="btn btn-secondary btn-sm"
              style={{ background: '#334155', color: '#cbd5e1', borderColor: '#475569' }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Applicants Roster Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <p>Loading candidate applications...</p>
        </div>
      ) : applicants.length === 0 ? (
        <div className="card empty-state">
          <Users size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">No Applicants Registered</h3>
          <p className="empty-subtitle">
            No students have applied to this placement drive yet.
          </p>
        </div>
      ) : filteredApplicants.length === 0 ? (
        <div className="card empty-state">
          <Users size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">No Matching Applicants Found</h3>
          <p className="empty-subtitle">
            No applications match your active search keyword or filter combination.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '1rem' }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      title="Select all filtered applicants"
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
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
                {filteredApplicants.map((app) => {
                  const s = app.student || {};
                  const isSelected = app.status === 'Selected';
                  const isChecked = selectedAppIds.has(app._id);

                  return (
                    <tr
                      key={app._id}
                      style={{
                        background: isChecked ? '#eff6ff' : isSelected ? '#f0fdf4' : 'transparent',
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(app._id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>

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
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                flexWrap: 'wrap',
                              }}
                            >
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
                            onClick={() => setSelectedAppForEval(app)}
                            className="btn btn-secondary btn-sm"
                            title="Evaluate Applicant Career Profile"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Eye size={13} />
                            <span>Evaluate</span>
                          </button>
                          <button
                            onClick={() => setSelectedAppForStatus(app)}
                            className="btn btn-primary btn-sm"
                            title="Update Selection Status"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Edit3 size={13} />
                            <span>Status</span>
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

      {/* Single Status Update Modal */}
      <StatusUpdateModal
        isOpen={!!selectedAppForStatus}
        onClose={() => setSelectedAppForStatus(null)}
        application={selectedAppForStatus}
        onSubmit={handleStatusUpdate}
        isSubmitting={isUpdatingStatus}
      />

      {/* Bulk Status Update Modal */}
      <BulkStatusUpdateModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedCount={selectedAppIds.size}
        drive={drive}
        onSubmit={handleBulkStatusSubmit}
        isSubmitting={isBulkUpdating}
      />

      {/* Comprehensive Officer Applicant Evaluation Modal */}
      <Modal
        isOpen={!!selectedAppForEval}
        onClose={() => setSelectedAppForEval(null)}
        title={`Applicant Evaluation — ${evalStudent?.name || 'Student'} (${evalStudent?.rollNo || 'N/A'})`}
        maxWidth="840px"
      >
        {selectedAppForEval && evalStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* A. Candidate Header & Application Overview */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.35rem',
                  }}
                >
                  {evalStudent.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.2rem' }}>
                    {evalStudent.name}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>Roll: <strong style={{ color: '#1e293b' }}>{evalStudent.rollNo}</strong></span>
                    <span>•</span>
                    <span>Branch: <strong style={{ color: '#1e293b' }}>{evalStudent.branch}</strong></span>
                    <span>•</span>
                    <span>Email: <strong>{evalStudent.email}</strong></span>
                    {evalStudent.phone && (
                      <>
                        <span>•</span>
                        <span>Phone: <strong>{evalStudent.phone}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                <StatusBadge status={selectedAppForEval.status} />
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Applied {new Date(selectedAppForEval.appliedAt).toLocaleDateString()}
                  {selectedAppForEval.updatedAt && selectedAppForEval.updatedAt !== selectedAppForEval.appliedAt && (
                    <span> • Updated {new Date(selectedAppForEval.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Application Status & Officer Feedback Box */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Current Status & Feedback
                </div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  {selectedAppForEval.remarks || 'No remarks recorded yet.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAppForStatus(selectedAppForEval);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Edit3 size={14} />
                <span>Update Status / Feedback</span>
              </button>
            </div>

            {/* B. Drive Eligibility Snapshot */}
            {evalEligibility && (
              <div
                style={{
                  background: evalEligibility.isEligible ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${evalEligibility.isEligible ? '#bbf7d0' : '#fef3c7'}`,
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {evalEligibility.isEligible ? (
                      <CheckCircle2 size={18} color="#16a34a" />
                    ) : (
                      <AlertCircle size={18} color="#d97706" />
                    )}
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: evalEligibility.isEligible ? '#166534' : '#92400e',
                      }}
                    >
                      Drive Eligibility Snapshot —{' '}
                      {evalEligibility.isEligible
                        ? 'Candidate Meets All Criteria'
                        : 'Criteria Evaluation Alert'}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      background: evalEligibility.isEligible ? '#dcfce7' : '#fef3c7',
                      color: evalEligibility.isEligible ? '#15803d' : '#92400e',
                    }}
                  >
                    {evalEligibility.isEligible ? 'ELIGIBLE' : 'REVIEW CRITERIA'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {evalEligibility.details.map((d, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: `1px solid ${d.passed ? '#e2e8f0' : '#fca5a5'}`,
                        borderRadius: '6px',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{d.criteria}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{d.actual}</strong>{' '}
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>({d.required})</span>
                        </div>
                        {d.passed ? (
                          <CheckCircle2 size={14} color="#16a34a" />
                        ) : (
                          <XCircle size={14} color="#dc2626" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C. Academic Profile */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <GraduationCap size={16} color="#2563eb" />
                <span>Academic Record & Performance History</span>
              </h4>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>CGPA</div>
                  <strong style={{ color: '#2563eb', fontSize: '1.1rem' }}>{evalStudent.cgpa}</strong>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Active Backlogs</div>
                  <strong style={{ color: evalStudent.activeBacklogs > 0 ? '#dc2626' : '#16a34a', fontSize: '1.1rem' }}>
                    {evalStudent.activeBacklogs ?? 0}
                  </strong>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Graduation Batch</div>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{evalStudent.passingYear || 2026}</strong>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>10th Standard %</div>
                  <strong style={{ color: '#0f172a' }}>
                    {evalStudent.academicDetails?.tenthPercentage
                      ? `${evalStudent.academicDetails.tenthPercentage}%`
                      : 'Not recorded'}
                  </strong>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>12th Standard %</div>
                  <strong style={{ color: '#0f172a' }}>
                    {evalStudent.academicDetails?.twelfthPercentage
                      ? `${evalStudent.academicDetails.twelfthPercentage}%`
                      : 'Not recorded'}
                  </strong>
                </div>
                {evalStudent.academicDetails?.diplomaPercentage && (
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Diploma %</div>
                    <strong style={{ color: '#0f172a' }}>{evalStudent.academicDetails.diplomaPercentage}%</strong>
                  </div>
                )}
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Current Semester</div>
                  <strong style={{ color: '#0f172a' }}>
                    {evalStudent.academicDetails?.currentSemester ? `Semester ${evalStudent.academicDetails.currentSemester}` : 'N/A'}
                  </strong>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Gap Years</div>
                  <strong style={{ color: '#0f172a' }}>{evalStudent.academicDetails?.gapYears ?? 0}</strong>
                </div>
              </div>
            </div>

            {/* D. Skills */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Sparkles size={16} color="#2563eb" />
                <span>Technical Skills ({evalStudent.skills?.length || 0})</span>
              </h4>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {evalStudent.skills && evalStudent.skills.length > 0 ? (
                  evalStudent.skills.map((sk, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      {sk}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No technical skills specified by candidate.</span>
                )}
              </div>
            </div>

            {/* E. Projects Portfolio */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <FolderGit2 size={16} color="#2563eb" />
                <span>Projects Portfolio ({evalStudent.projects?.length || 0})</span>
              </h4>

              {evalStudent.projects && evalStudent.projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {evalStudent.projects.map((proj, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{proj.title}</strong>
                        {proj.link && (
                          <a
                            href={proj.link}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              color: '#2563eb',
                              fontWeight: 600,
                            }}
                          >
                            <span>Visit Project</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      {proj.description && (
                        <p style={{ fontSize: '0.825rem', color: '#475569', margin: '0.35rem 0' }}>
                          {proj.description}
                        </p>
                      )}
                      {proj.techStack && proj.techStack.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                          {(Array.isArray(proj.techStack) ? proj.techStack : proj.techStack.split(',')).map((tech, tIdx) => (
                            <span
                              key={tIdx}
                              style={{
                                fontSize: '0.725rem',
                                background: '#e2e8f0',
                                color: '#334155',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontWeight: 500,
                              }}
                            >
                              {tech.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No technical projects listed.
                </div>
              )}
            </div>

            {/* F. Certifications */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Award size={16} color="#2563eb" />
                <span>Certifications & Honors ({evalStudent.certifications?.length || 0})</span>
              </h4>

              {evalStudent.certifications && evalStudent.certifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {evalStudent.certifications.map((cert, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{cert.name}</strong>
                        <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {cert.issuer && <span>Issued by: {cert.issuer}</span>}
                          {cert.issueDate && <span> • {cert.issueDate}</span>}
                        </div>
                      </div>
                      {cert.certificateUrl && (
                        <a
                          href={cert.certificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                        >
                          <ExternalLink size={12} />
                          <span>Verify</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No certifications listed.
                </div>
              )}
            </div>

            {/* G. Professional Links */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Globe size={16} color="#2563eb" />
                <span>Professional Links</span>
              </h4>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {evalStudent.links?.github && (
                  <a
                    href={evalStudent.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Github size={15} />
                    <span>GitHub Profile</span>
                    <ExternalLink size={12} />
                  </a>
                )}

                {evalStudent.links?.linkedin && (
                  <a
                    href={evalStudent.links.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Linkedin size={15} />
                    <span>LinkedIn Profile</span>
                    <ExternalLink size={12} />
                  </a>
                )}

                {evalStudent.links?.portfolio && (
                  <a
                    href={evalStudent.links.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Globe size={15} />
                    <span>Portfolio Website</span>
                    <ExternalLink size={12} />
                  </a>
                )}

                {!evalStudent.links?.github &&
                  !evalStudent.links?.linkedin &&
                  !evalStudent.links?.portfolio && (
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No professional profiles linked.
                    </span>
                  )}
              </div>
            </div>

            {/* H. Resume Documents */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <FileText size={16} color="#2563eb" />
                <span>Resume Documents Vault</span>
              </h4>

              {/* Uploaded Resume */}
              {hasUploadedResume(evalStudent) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    marginBottom: evalStudent.resumeUrl ? '0.6rem' : '0',
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
                        background: isStudentPdf(evalStudent) ? '#eff6ff' : '#f0fdf4',
                        color: isStudentPdf(evalStudent) ? '#2563eb' : '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                        {evalStudent.resumeFile.originalName || 'Uploaded Resume Document'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          display: 'flex',
                          gap: '0.4rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{formatFileSize(evalStudent.resumeFile.size)}</span>
                        <span>•</span>
                        <span>
                          {evalStudent.resumeFile.uploadedAt
                            ? `Uploaded ${new Date(evalStudent.resumeFile.uploadedAt).toLocaleDateString()}`
                            : 'Uploaded File'}
                        </span>
                        {!isStudentPdf(evalStudent) && (
                          <span style={{ color: '#6366f1', fontWeight: 500 }}>
                            (DOC/DOCX • Download only)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {isStudentPdf(evalStudent) && (
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(evalStudent)}
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
                        <span>Preview PDF</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadResume(evalStudent)}
                      disabled={downloadingStudentId === evalStudent._id}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              )}

              {/* External Resume URL */}
              {evalStudent.resumeUrl && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
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
                        background: '#f1f5f9',
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
                        External Resume Link
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#2563eb',
                          maxWidth: '280px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={evalStudent.resumeUrl}
                      >
                        {evalStudent.resumeUrl}
                      </div>
                    </div>
                  </div>

                  <a
                    href={evalStudent.resumeUrl}
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

              {/* Neither */}
              {!hasUploadedResume(evalStudent) && !evalStudent.resumeUrl && (
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
                  No resume documents available for this candidate.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer"
              style={{
                margin: '0.5rem -1.5rem -1.5rem',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Officer Evaluation Mode • Read-only Career Record
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAppForEval(null)}
                  className="btn btn-secondary"
                >
                  Close Evaluation
                </button>
              </div>
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
        zIndex={250}
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
