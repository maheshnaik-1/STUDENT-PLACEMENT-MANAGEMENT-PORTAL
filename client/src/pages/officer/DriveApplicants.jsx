import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import StatusUpdateModal from '../../components/officer/StatusUpdateModal';
import BulkStatusUpdateModal from '../../components/officer/BulkStatusUpdateModal';
import Modal from '../../components/common/Modal';
import CandidateComparisonModal from '../../components/officer/CandidateComparisonModal';
import HolisticApplicantSummaryCard from '../../components/officer/HolisticApplicantSummaryCard';
import {
  generateApplicantSummary,
  ADVISORY_DISCLAIMER,
  ADVISORY_NOTE,
} from '../../utils/applicantSummary';
import {
  evaluateEligibility,
  sortApplicants,
  SORT_OPTIONS,
  TERMINAL_STATUSES,
  isTerminalStatus,
  partitionByTerminalStatus,
} from '../../utils/applicantSorting';
import {
  toggleCandidateComparison,
  removeCandidateComparison,
  buildComparisonMatrix,
  MAX_COMPARE_LIMIT,
} from '../../utils/applicantComparison';
import {
  Users,
  ArrowLeft,
  ArrowUpDown,
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
  GitCompare,
  Scale,
  X,
  TrendingUp,
} from 'lucide-react';

import {
  calculateCompleteness,
  getCompletenessTier,
} from '../../utils/profileCompleteness';

export {
  evaluateEligibility,
  sortApplicants,
  SORT_OPTIONS,
  toggleCandidateComparison,
  removeCandidateComparison,
  buildComparisonMatrix,
  MAX_COMPARE_LIMIT,
  TERMINAL_STATUSES,
  isTerminalStatus,
  partitionByTerminalStatus,
  calculateCompleteness,
  getCompletenessTier,
  generateApplicantSummary,
  ADVISORY_DISCLAIMER,
  ADVISORY_NOTE,
};

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

const DriveApplicants = () => {
  const { driveId } = useParams();
  const { showSuccess, showError, showWarning } = useNotification();

  const [drive, setDrive] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Advanced Filters & Sort State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [cgpaFilter, setCgpaFilter] = useState('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('applied_desc');

  // Selection & Modal States
  const [selectedAppIds, setSelectedAppIds] = useState(new Set());
  const [comparedAppIds, setComparedAppIds] = useState(new Set());
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedAppForStatus, setSelectedAppForStatus] = useState(null);
  const [selectedAppForEval, setSelectedAppForEval] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // AI Skill Match Scores State
  const [matchScoresMap, setMatchScoresMap] = useState({});
  const [matchScoresLoading, setMatchScoresLoading] = useState(true);
  const [matchScoresError, setMatchScoresError] = useState(null);

  // In-flight and Abort Controller Refs for Strict Mode & Fast Route Switch Defense
  const abortScoresRef = useRef(null);
  const fetchingScoresDriveIdRef = useRef(null);
  const abortApplicantsRef = useRef(null);
  const fetchingApplicantsDriveIdRef = useRef(null);

  // Resume Preview State for Officer
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [downloadingStudentId, setDownloadingStudentId] = useState(null);

  const fetchApplicants = async (targetDriveId = driveId, { force = false } = {}) => {
    if (!targetDriveId) return;

    // Prevent duplicate in-flight requests for the exact same drive unless force refresh is requested
    if (!force && fetchingApplicantsDriveIdRef.current === targetDriveId) {
      return;
    }

    if (abortApplicantsRef.current) {
      abortApplicantsRef.current.abort();
    }
    const controller = new AbortController();
    abortApplicantsRef.current = controller;
    fetchingApplicantsDriveIdRef.current = targetDriveId;

    try {
      setLoading(true);
      const res = await api.applications.getDriveApplicants(targetDriveId, {}, {
        signal: controller.signal,
      });

      // Ignore if aborted or drive changed
      if (controller.signal.aborted || targetDriveId !== driveId) return;

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
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      if (targetDriveId === driveId) {
        showError(err.message || 'Failed to fetch applicants');
      }
    } finally {
      if (!controller.signal.aborted && targetDriveId === driveId) {
        setLoading(false);
      }
      if (fetchingApplicantsDriveIdRef.current === targetDriveId) {
        fetchingApplicantsDriveIdRef.current = null;
      }
    }
  };

  const fetchMatchScores = async (targetDriveId = driveId, { force = false } = {}) => {
    if (!targetDriveId) return;

    // Prevent duplicate in-flight requests for the exact same drive unless force refresh is requested
    if (!force && fetchingScoresDriveIdRef.current === targetDriveId) {
      return;
    }

    if (abortScoresRef.current) {
      abortScoresRef.current.abort();
    }
    const controller = new AbortController();
    abortScoresRef.current = controller;
    fetchingScoresDriveIdRef.current = targetDriveId;

    try {
      setMatchScoresLoading(true);
      setMatchScoresError(null);
      const res = await api.applications.getMatchScores(targetDriveId, {
        signal: controller.signal,
      });

      // Ignore if aborted or drive changed
      if (controller.signal.aborted || targetDriveId !== driveId) return;

      if (res.success) {
        const scoresList = res.data?.applicants || [];
        const scoreMap = {};
        scoresList.forEach((item) => {
          if (item.applicationId) {
            scoreMap[item.applicationId] = item.skillMatch;
          }
        });
        setMatchScoresMap(scoreMap);
      } else {
        setMatchScoresError(res.message || 'Failed to calculate skill match scores');
        setMatchScoresMap({});
      }
    } catch (err) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      if (targetDriveId === driveId) {
        setMatchScoresError(err.message || 'Failed to load skill match scores');
        setMatchScoresMap({});
      }
    } finally {
      if (!controller.signal.aborted && targetDriveId === driveId) {
        setMatchScoresLoading(false);
      }
      if (fetchingScoresDriveIdRef.current === targetDriveId) {
        fetchingScoresDriveIdRef.current = null;
      }
    }
  };

  useEffect(() => {
    // When switching drives, clear previous scores and selections so they do not linger
    setMatchScoresMap({});
    setSelectedAppIds(new Set());
    setComparedAppIds(new Set());
    setCompareModalOpen(false);

    fetchApplicants(driveId, { force: true });
    fetchMatchScores(driveId, { force: true });

    return () => {
      if (abortApplicantsRef.current) {
        abortApplicantsRef.current.abort();
        fetchingApplicantsDriveIdRef.current = null;
      }
      if (abortScoresRef.current) {
        abortScoresRef.current.abort();
        fetchingScoresDriveIdRef.current = null;
      }
    };
  }, [driveId]);

  // Merge AI Skill Match Scores onto Applicants Dataset
  const enrichedApplicants = useMemo(() => {
    return applicants.map((app) => {
      const match = matchScoresMap[app._id];
      if (match) {
        return {
          ...app,
          matchScore: match.score,
          skillMatch: match,
        };
      }
      return app;
    });
  }, [applicants, matchScoresMap]);

  // Compute Filtered Applicants from Enriched Dataset
  const filteredApplicants = useMemo(() => {
    return enrichedApplicants.filter((app) => {
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
  }, [enrichedApplicants, statusFilter, branchFilter, cgpaFilter, eligibilityFilter, search, drive]);

  // Compute Sorted Applicants from Filtered Dataset
  const sortedApplicants = useMemo(() => {
    return sortApplicants(filteredApplicants, sortBy);
  }, [filteredApplicants, sortBy]);

  const activeFilterCount =
    (statusFilter !== 'ALL' ? 1 : 0) +
    (branchFilter !== 'ALL' ? 1 : 0) +
    (cgpaFilter !== 'ALL' ? 1 : 0) +
    (eligibilityFilter !== 'ALL' ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (sortBy !== 'applied_desc' ? 1 : 0);

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setBranchFilter('ALL');
    setCgpaFilter('ALL');
    setEligibilityFilter('ALL');
    setSearch('');
    setSortBy('applied_desc');
  };

  // Selection Management
  const isAllSelected =
    sortedApplicants.length > 0 &&
    sortedApplicants.every((a) => selectedAppIds.has(a._id));

  const isSomeSelected =
    sortedApplicants.some((a) => selectedAppIds.has(a._id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedAppIds);
    if (isAllSelected) {
      sortedApplicants.forEach((a) => next.delete(a._id));
    } else {
      sortedApplicants.forEach((a) => next.add(a._id));
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

  // Candidate Comparison Handlers (V4.0 Phase 2 Step 3)
  const handleToggleCompare = (appId) => {
    const result = toggleCandidateComparison(comparedAppIds, appId, MAX_COMPARE_LIMIT);
    if (result.limitReached) {
      showError(result.message || 'Comparison limit reached (max 4 candidates).');
      return;
    }
    setComparedAppIds(result.nextSelected);
  };

  const handleRemoveCompare = (appId) => {
    const next = removeCandidateComparison(comparedAppIds, appId);
    setComparedAppIds(next);
    if (next.size === 0) {
      setCompareModalOpen(false);
    }
  };

  const handleClearCompare = () => {
    setComparedAppIds(new Set());
    setCompareModalOpen(false);
  };

  // Side-by-Side Comparison Matrix Computation
  const comparisonMatrix = useMemo(() => {
    return buildComparisonMatrix(comparedAppIds, applicants, drive, matchScoresMap);
  }, [comparedAppIds, applicants, drive, matchScoresMap]);

  // Selected Applications Partitioning for Terminal-State Protection (V4.0 Phase 2 Step 4)
  const selectedApplications = useMemo(() => {
    return applicants.filter((a) => selectedAppIds.has(a._id));
  }, [applicants, selectedAppIds]);

  const { updatable: updatableSelectedApps, terminal: terminalSelectedApps } = useMemo(() => {
    return partitionByTerminalStatus(selectedApplications);
  }, [selectedApplications]);

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
        fetchApplicants(driveId, { force: true });
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
        const terminalSkipped = (res.data?.skipped || []).filter(
          (s) => s.isTerminalProtected || ['Selected', 'Rejected'].includes(s.currentStatus)
        );

        if (res.updatedCount === 0 && terminalSkipped.length > 0) {
          showWarning(
            `No applications were updated. All ${terminalSkipped.length} selected candidate(s) are in terminal status ('Selected' or 'Rejected') and were protected from bulk overwrite.`
          );
        } else if (terminalSkipped.length > 0) {
          showSuccess(
            `Bulk update complete: ${res.updatedCount} candidate(s) updated to '${status}'. ${terminalSkipped.length} candidate(s) in terminal status ('Selected' or 'Rejected') were protected and skipped.`
          );
        } else {
          showSuccess(res.message || 'Bulk status update completed successfully!');
        }

        setSelectedAppIds(new Set());
        setBulkModalOpen(false);
        fetchApplicants(driveId, { force: true });
      }
    } catch (err) {
      showError(err.message || 'Failed to execute bulk status update');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Filtered & Sorted CSV Export Handler
  const handleExportCSV = () => {
    if (sortedApplicants.length === 0) {
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

    const rows = sortedApplicants.map((app) => {
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
    showSuccess(`Exported ${sortedApplicants.length} filtered applicant(s) to CSV!`);
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
  const evalMatch =
    selectedAppForEval?.skillMatch ||
    (selectedAppForEval ? matchScoresMap[selectedAppForEval._id] : null);
  const evalCompleteness = evalStudent ? calculateCompleteness(evalStudent) : null;
  const evalCompletenessTier = evalCompleteness
    ? getCompletenessTier(evalCompleteness.percentage)
    : null;

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

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              className="btn btn-secondary"
              disabled={comparedAppIds.size === 0}
              title={
                comparedAppIds.size === 0
                  ? 'Select candidates to compare side-by-side (up to 4)'
                  : `Compare ${comparedAppIds.size} selected candidate${comparedAppIds.size > 1 ? 's' : ''}`
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: comparedAppIds.size > 0 ? '#eff6ff' : undefined,
                color: comparedAppIds.size > 0 ? '#1d4ed8' : undefined,
                borderColor: comparedAppIds.size > 0 ? '#bfdbfe' : undefined,
              }}
            >
              <GitCompare size={16} />
              <span>Compare Candidates ({comparedAppIds.size}/4)</span>
            </button>

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

          {/* Sort By Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowUpDown size={15} color="#64748b" style={{ flexShrink: 0 }} />
            <select
              id="applicant-sort-by"
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: '0.825rem' }}
              aria-label="Sort applicant roster"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
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
            Showing <strong style={{ color: '#0f172a' }}>{sortedApplicants.length}</strong> of{' '}
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

      {/* Floating Candidate Comparison Dock */}
      {comparedAppIds.size > 0 && (
        <div
          style={{
            position: 'sticky',
            top: selectedAppIds.size > 0 ? '145px' : '75px',
            zIndex: 35,
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '0.75rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.35)',
            flexWrap: 'wrap',
            gap: '0.75rem',
            border: '1px solid #334155',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <GitCompare size={17} color="#60a5fa" />
              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Compare Candidates:</span>
              <span
                style={{
                  background: comparedAppIds.size >= MAX_COMPARE_LIMIT ? '#b45309' : '#2563eb',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {comparedAppIds.size} / {MAX_COMPARE_LIMIT}
              </span>
              {comparedAppIds.size >= MAX_COMPARE_LIMIT && (
                <span style={{ fontSize: '0.75rem', color: '#fef08a', fontWeight: 600 }}>
                  (Capacity Limit Reached)
                </span>
              )}
            </div>

            {/* Selected Candidate Chips with Remove Buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {Array.from(comparedAppIds).map((id) => {
                const app = applicants.find((a) => a._id === id);
                const name = app?.student?.name || 'Candidate';
                return (
                  <span
                    key={id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.75rem',
                      color: '#e2e8f0',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCompare(id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={`Remove ${name} from comparison`}
                      aria-label={`Remove ${name} from comparison`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#2563eb' }}
            >
              <Scale size={14} />
              <span>Compare Side-by-Side ({comparedAppIds.size})</span>
            </button>
            <button
              type="button"
              onClick={handleClearCompare}
              className="btn btn-secondary btn-sm"
              style={{ background: '#1e293b', color: '#cbd5e1', borderColor: '#475569' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
            {terminalSelectedApps.length > 0 && (
              <span
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {terminalSelectedApps.length} Terminal Protected
              </span>
            )}
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {terminalSelectedApps.length > 0
                ? `${updatableSelectedApps.length} active applicant${updatableSelectedApps.length > 1 ? 's' : ''} ready for update`
                : 'Batch applicant actions ready'}
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
      ) : sortedApplicants.length === 0 ? (
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
                  <th
                    onClick={() => setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Candidate Name (A-Z / Z-A)"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>Student Candidate</span>
                      <ArrowUpDown
                        size={12}
                        color={sortBy.startsWith('name') ? '#2563eb' : '#94a3b8'}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => setSortBy(sortBy === 'cgpa_desc' ? 'cgpa_asc' : 'cgpa_desc')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by CGPA (Highest / Lowest)"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>Branch & CGPA</span>
                      <ArrowUpDown
                        size={12}
                        color={sortBy.startsWith('cgpa') ? '#2563eb' : '#94a3b8'}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => setSortBy(sortBy === 'match_desc' ? 'applied_desc' : 'match_desc')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Skill Match Score (Highest First)"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>Resume / Skills</span>
                      <ArrowUpDown
                        size={12}
                        color={sortBy === 'match_desc' ? '#2563eb' : '#94a3b8'}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => setSortBy(sortBy === 'applied_desc' ? 'applied_asc' : 'applied_desc')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Applied Date (Newest / Oldest)"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>Applied On</span>
                      <ArrowUpDown
                        size={12}
                        color={sortBy.startsWith('applied') ? '#2563eb' : '#94a3b8'}
                      />
                    </div>
                  </th>
                  <th>Current Status</th>
                  <th>Feedback / Remarks</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedApplicants.map((app) => {
                  const s = app.student || {};
                  const isSelected = app.status === 'Selected';
                  const isChecked = selectedAppIds.has(app._id);
                  const isCompared = comparedAppIds.has(app._id);

                  return (
                    <tr
                      key={app._id}
                      style={{
                        background: isChecked ? '#eff6ff' : isSelected ? '#f0fdf4' : 'transparent',
                        borderLeft: isCompared ? '4px solid #2563eb' : undefined,
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
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            {s.name || 'Student Name'}
                          </span>
                          {isCompared && (
                            <span
                              style={{
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                background: '#dbeafe',
                                color: '#1e40af',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                marginLeft: '0.4rem',
                              }}
                            >
                              Comparing
                            </span>
                          )}
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
                          {/* AI Skill Match Badge */}
                          {matchScoresLoading ? (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                background: '#f8fafc',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                width: 'fit-content',
                              }}
                            >
                              <Loader2 size={11} className="spin" color="#64748b" />
                              <span>Matching skills...</span>
                            </div>
                          ) : matchScoresError ? (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                background: '#fff1f2',
                                color: '#be123c',
                                border: '1px solid #fecdd3',
                                width: 'fit-content',
                              }}
                              title={matchScoresError}
                            >
                              <AlertCircle size={11} color="#e11d48" />
                              <span>Score unavailable</span>
                              <button
                                type="button"
                                onClick={() => fetchMatchScores(driveId, { force: true })}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#be123c',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                  padding: 0,
                                  marginLeft: '0.2rem',
                                }}
                                title="Retry loading skill match scores"
                              >
                                Retry
                              </button>
                            </div>
                          ) : app.skillMatch ? (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                background:
                                  app.skillMatch.score >= 80
                                    ? '#f0fdf4'
                                    : app.skillMatch.score >= 60
                                    ? '#eff6ff'
                                    : app.skillMatch.score >= 40
                                    ? '#fefce8'
                                    : app.skillMatch.score > 0
                                    ? '#fff7ed'
                                    : '#f8fafc',
                                color:
                                  app.skillMatch.score >= 80
                                    ? '#15803d'
                                    : app.skillMatch.score >= 60
                                    ? '#1d4ed8'
                                    : app.skillMatch.score >= 40
                                    ? '#a16207'
                                    : app.skillMatch.score > 0
                                    ? '#c2410c'
                                    : '#64748b',
                                border: `1px solid ${
                                  app.skillMatch.score >= 80
                                    ? '#bbf7d0'
                                    : app.skillMatch.score >= 60
                                    ? '#bfdbfe'
                                    : app.skillMatch.score >= 40
                                    ? '#fef08a'
                                    : app.skillMatch.score > 0
                                    ? '#fed7aa'
                                    : '#e2e8f0'
                                }`,
                                width: 'fit-content',
                                cursor: 'help',
                              }}
                              title={
                                app.skillMatch.explanation ||
                                `Match Score: ${app.skillMatch.score}%\nMatched: ${(app.skillMatch.matchedSkills || []).join(', ') || 'None'}\nMissing: ${(app.skillMatch.missingSkills || []).join(', ') || 'None'}`
                              }
                            >
                              <Sparkles
                                size={11}
                                color={
                                  app.skillMatch.score >= 80
                                    ? '#16a34a'
                                    : app.skillMatch.score >= 60
                                    ? '#2563eb'
                                    : app.skillMatch.score >= 40
                                    ? '#d97706'
                                    : '#94a3b8'
                                }
                              />
                              <span>{app.skillMatch.score}% Match</span>
                              {app.skillMatch.totalRequired === 0 && (
                                <span style={{ fontSize: '0.675rem', fontWeight: 500, opacity: 0.85 }}>
                                  (Baseline)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.725rem',
                                color: '#94a3b8',
                                background: '#f8fafc',
                                border: '1px dashed #e2e8f0',
                                width: 'fit-content',
                              }}
                            >
                              <span>Match N/A</span>
                            </div>
                          )}

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
                            type="button"
                            onClick={() => handleToggleCompare(app._id)}
                            className={`btn btn-sm ${isCompared ? 'btn-primary' : 'btn-secondary'}`}
                            title={
                              isCompared
                                ? 'Remove candidate from side-by-side comparison'
                                : comparedAppIds.size >= MAX_COMPARE_LIMIT
                                ? 'Comparison capacity limit reached (maximum 4 candidates)'
                                : 'Add candidate to side-by-side comparison'
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              background: isCompared ? '#2563eb' : '#ffffff',
                              color: isCompared ? '#ffffff' : '#334155',
                              borderColor: isCompared ? '#2563eb' : '#cbd5e1',
                            }}
                          >
                            <GitCompare size={13} />
                            <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                          </button>
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
        selectedApplications={selectedApplications}
        drive={drive}
        onSubmit={handleBulkStatusSubmit}
        isSubmitting={isBulkUpdating}
      />

      {/* Candidate Comparison Modal (V4.0 Phase 2 Step 3) */}
      <CandidateComparisonModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        matrix={comparisonMatrix}
        onRemoveCandidate={handleRemoveCompare}
        onClearAll={handleClearCompare}
        onSelectForEval={(app) => {
          setSelectedAppForEval(app);
        }}
        onSelectForStatus={(app) => {
          setSelectedAppForStatus(app);
        }}
        onPreviewResume={(student) => {
          handleOpenPreview(student);
        }}
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
                  {evalCompleteness && (
                    <div
                      style={{
                        marginTop: '0.6rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.785rem',
                          fontWeight: 600,
                          color: '#1e293b',
                        }}
                      >
                        <TrendingUp size={14} color="#2563eb" />
                        <span>Profile Completeness:</span>
                        <strong
                          style={{
                            color:
                              evalCompleteness.percentage >= 80
                                ? '#15803d'
                                : evalCompleteness.percentage >= 50
                                ? '#1d4ed8'
                                : '#b45309',
                            fontSize: '0.85rem',
                          }}
                        >
                          {evalCompleteness.percentage}%
                        </strong>
                      </div>

                      {evalCompletenessTier && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            background:
                              evalCompleteness.percentage >= 80
                                ? '#dcfce7'
                                : evalCompleteness.percentage >= 50
                                ? '#eff6ff'
                                : '#fef3c7',
                            color:
                              evalCompleteness.percentage >= 80
                                ? '#15803d'
                                : evalCompleteness.percentage >= 50
                                ? '#1d4ed8'
                                : '#92400e',
                            border: `1px solid ${
                              evalCompleteness.percentage >= 80
                                ? '#bbf7d0'
                                : evalCompleteness.percentage >= 50
                                ? '#bfdbfe'
                                : '#fde68a'
                            }`,
                          }}
                        >
                          {evalCompletenessTier.label}
                        </span>
                      )}

                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        (Informational • 7 dimensions evaluated)
                      </span>
                    </div>
                  )}
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
                <button
                  type="button"
                  onClick={() => handleToggleCompare(selectedAppForEval._id)}
                  className={`btn btn-sm ${comparedAppIds.has(selectedAppForEval._id) ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                  }}
                  title={
                    comparedAppIds.has(selectedAppForEval._id)
                      ? 'Remove candidate from comparison'
                      : comparedAppIds.size >= MAX_COMPARE_LIMIT
                      ? 'Comparison limit reached (max 4 candidates)'
                      : 'Add candidate to comparison'
                  }
                >
                  <GitCompare size={12} />
                  <span>
                    {comparedAppIds.has(selectedAppForEval._id)
                      ? 'In Comparison'
                      : 'Compare Candidate'}
                  </span>
                </button>
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

            {/* Holistic Applicant Executive Assessment Card */}
            <HolisticApplicantSummaryCard
              student={evalStudent}
              drive={drive}
              eligibility={evalEligibility}
              matchScore={evalMatch}
              completeness={evalCompleteness}
              completenessTier={evalCompletenessTier}
            />

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

            {/* D. Skills & AI Skill Match Analysis */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1.25rem',
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
                <h4
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Sparkles size={16} color="#2563eb" />
                  <span>Technical Skills & AI Match ({evalStudent.skills?.length || 0})</span>
                </h4>

                {evalMatch && (
                  <span
                    style={{
                      fontSize: '0.775rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '999px',
                      background:
                        evalMatch.score >= 80
                          ? '#dcfce7'
                          : evalMatch.score >= 60
                          ? '#eff6ff'
                          : evalMatch.score >= 40
                          ? '#fefce8'
                          : '#f1f5f9',
                      color:
                        evalMatch.score >= 80
                          ? '#15803d'
                          : evalMatch.score >= 60
                          ? '#1d4ed8'
                          : evalMatch.score >= 40
                          ? '#a16207'
                          : '#475569',
                      border: `1px solid ${
                        evalMatch.score >= 80
                          ? '#86efac'
                          : evalMatch.score >= 60
                          ? '#bfdbfe'
                          : '#e2e8f0'
                      }`,
                    }}
                  >
                    AI Match Score: {evalMatch.score}%
                    {evalMatch.totalRequired === 0 ? ' (Baseline)' : ''}
                  </span>
                )}
              </div>

              {evalMatch && evalMatch.explanation && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.8rem',
                    color: '#334155',
                    marginBottom: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Sparkles size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span>{evalMatch.explanation}</span>
                </div>
              )}

              {/* Matched vs Missing Breakdown if drive has required skills */}
              {evalMatch && evalMatch.totalRequired > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#166534',
                        marginBottom: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>Matched Requirements ({evalMatch.matchedSkills?.length || 0})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(evalMatch.matchedSkills || []).length > 0 ? (
                        evalMatch.matchedSkills.map((sk, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#ffffff',
                              color: '#15803d',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              border: '1px solid #86efac',
                            }}
                          >
                            {sk}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                          None matched
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#991b1b',
                        marginBottom: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <AlertCircle size={13} color="#dc2626" />
                      <span>Missing Requirements ({evalMatch.missingSkills?.length || 0})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(evalMatch.missingSkills || []).length > 0 ? (
                        evalMatch.missingSkills.map((sk, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#ffffff',
                              color: '#b91c1c',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              border: '1px solid #fca5a5',
                            }}
                          >
                            {sk}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                          All required skills satisfied!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* All Student Skills */}
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem', fontWeight: 600 }}>
                Candidate's Stated Skills:
              </div>
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
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    No technical skills specified by candidate.
                  </span>
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
