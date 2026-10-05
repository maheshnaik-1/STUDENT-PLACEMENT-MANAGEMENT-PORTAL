import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import {
  BarChart3,
  Download,
  Printer,
  Users,
  Award,
  Building2,
  Briefcase,
  Filter,
  Search,
  CheckCircle2,
  TrendingUp,
  Clock,
  UserCheck,
  XCircle,
  HelpCircle,
  ArrowUpDown,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const STATUS_COLOR_CONFIG = {
  Applied: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Applied' },
  Shortlisted: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Shortlisted' },
  'Technical Round': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Technical Round' },
  Interview: { color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: 'Interview' },
  Selected: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Selected / Offers' },
  Rejected: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Rejected' },
};

const PlacementReports = () => {
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedDrive, setSelectedDrive] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Sorting for Company/Drive Analytics
  const [driveSortBy, setDriveSortBy] = useState('applications'); // 'applications' | 'selected' | 'shortlisted' | 'rate' | 'name'

  // Tab State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'drives' | 'branches' | 'applications' | 'students'

  const { showError, showSuccess } = useNotification();

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, studentsRes] = await Promise.all([
        api.applications.getAnalytics({
          driveId: selectedDrive,
          branch: selectedBranch,
          status: selectedStatus,
          search: search.trim(),
        }),
        api.students.getAll({
          branch: selectedBranch !== 'ALL' ? selectedBranch : undefined,
          search: search.trim(),
        }),
      ]);

      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
      if (studentsRes.success) {
        setStudents(studentsRes.data || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to load placement analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedDrive, selectedBranch, selectedStatus, search]);

  const handleResetFilters = () => {
    setSelectedDrive('ALL');
    setSelectedBranch('ALL');
    setSelectedStatus('ALL');
    setSearch('');
  };

  const isFilterActive =
    selectedDrive !== 'ALL' ||
    selectedBranch !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    search.trim() !== '';

  const handlePrint = () => {
    window.print();
  };

  // Export Filtered Applications CSV
  const handleExportApplicationsCSV = () => {
    const roster = analytics?.applicationsRoster || [];
    if (roster.length === 0) {
      showError('No application records available to export with current filters.');
      return;
    }

    const headers = [
      'Roll Number',
      'Student Name',
      'Email',
      'Branch',
      'CGPA',
      'Backlogs',
      'Company',
      'Drive Title',
      'Package CTC',
      'Applied Date',
      'Status',
      'Officer Remarks',
    ];

    const rows = roster.map((app) => [
      `"${app.rollNo || 'N/A'}"`,
      `"${app.studentName || 'Student'}"`,
      `"${app.email || ''}"`,
      `"${app.branch || 'N/A'}"`,
      app.cgpa || 0,
      app.activeBacklogs ?? 0,
      `"${(app.companyName || '').replace(/"/g, '""')}"`,
      `"${(app.driveTitle || '').replace(/"/g, '""')}"`,
      `"${app.packageCTC || 'N/A'}"`,
      `"${new Date(app.appliedAt).toLocaleDateString()}"`,
      `"${app.status || 'Applied'}"`,
      `"${(app.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Placement_Applications_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Applications report exported to CSV successfully!');
  };

  // Export Master Student Roster CSV
  const handleExportMasterCSV = () => {
    const list =
      analytics?.studentRoster && analytics.studentRoster.length > 0
        ? analytics.studentRoster
        : students;

    if (list.length === 0) {
      showError('No student records available to export.');
      return;
    }

    const headers = [
      'Roll Number',
      'Student Name',
      'Email',
      'Branch',
      'CGPA',
      'Backlogs',
      'Passing Batch',
      'Applications Count',
      'Placement Status',
    ];

    const rows = list.map((st) => [
      `"${st.rollNo || ''}"`,
      `"${st.name || ''}"`,
      `"${st.email || ''}"`,
      `"${st.branch || ''}"`,
      st.cgpa || 0,
      st.activeBacklogs ?? 0,
      st.passingYear || 2026,
      st.totalApplications || 0,
      `"${(st.placementStatus || 'Not Applied').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Student_Placement_Roster_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Student placement roster exported to CSV successfully!');
  };

  // Sorted Drive Analytics
  const sortedDriveAnalytics = useMemo(() => {
    if (!analytics?.driveAnalytics) return [];
    const list = [...analytics.driveAnalytics];
    switch (driveSortBy) {
      case 'applications':
        return list.sort((a, b) => b.applicationsCount - a.applicationsCount);
      case 'selected':
        return list.sort((a, b) => b.selectedCount - a.selectedCount);
      case 'shortlisted':
        return list.sort((a, b) => b.shortlistedCount - a.shortlistedCount);
      case 'rate':
        return list.sort((a, b) => b.selectionRate - a.selectionRate);
      case 'name':
        return list.sort((a, b) => a.companyName.localeCompare(b.companyName));
      default:
        return list;
    }
  }, [analytics?.driveAnalytics, driveSortBy]);

  const summary = analytics?.summary || {
    totalDrives: 0,
    totalApplications: 0,
    uniqueApplicants: 0,
    totalStudents: 0,
    totalSelected: 0,
    totalShortlisted: 0,
    totalTechnicalRound: 0,
    totalInterview: 0,
    totalApplied: 0,
    totalRejected: 0,
    totalUnderReview: 0,
    selectionRate: 0,
    studentPlacementRate: 0,
  };

  const statusDistribution = analytics?.statusDistribution || [];
  const branchAnalytics = analytics?.branchAnalytics || [];
  const recentApplications = analytics?.recentApplications || [];
  const applicationsRoster = analytics?.applicationsRoster || [];
  const studentRoster =
    analytics?.studentRoster && analytics.studentRoster.length > 0
      ? analytics.studentRoster
      : students;
  const availableFilters = analytics?.availableFilters || {
    branches: [],
    drives: [],
    statuses: [],
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Placement Analytics & Reports</h1>
          <p className="page-subtitle">
            Hiring metrics, drive performance, department statistics, and candidate status reports
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} />
            <span>Print Report</span>
          </button>
          <button onClick={handleExportApplicationsCSV} className="btn btn-secondary" title="Export all matching applications to CSV">
            <FileSpreadsheet size={16} />
            <span>Export Applications CSV</span>
          </button>
          <button onClick={handleExportMasterCSV} className="btn btn-primary" title="Export student master roster to CSV">
            <Download size={16} />
            <span>Export Student Roster</span>
          </button>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          border: '1px solid #cbd5e1',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
            {/* Search */}
            <div className="search-input-wrapper" style={{ minWidth: '220px', flex: '1 1 200px' }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control search-input"
                placeholder="Search candidate, roll no, drive, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Drive Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Briefcase size={15} color="#64748b" />
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: '160px' }}
                value={selectedDrive}
                onChange={(e) => setSelectedDrive(e.target.value)}
              >
                <option value="ALL">All Placement Drives</option>
                {availableFilters.drives.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.companyName} - {d.title.substring(0, 24)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={15} color="#64748b" />
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: '130px' }}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="ALL">All Branches</option>
                {availableFilters.branches.map((b) => (
                  <option key={b} value={b}>
                    Branch: {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Filter size={15} color="#64748b" />
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: '130px' }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                {availableFilters.statuses.map((s) => (
                  <option key={s} value={s}>
                    Status: {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters & Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
              >
                <RefreshCw size={13} />
                <span>Reset Filters</span>
              </button>
            )}
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>
              {summary.totalApplications} matching applications
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        {/* 1. Placement Drives */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Placement Drives</div>
            <div className="stat-value">{summary.totalDrives || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              Active & scheduled drives
            </div>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Building2 size={24} />
          </div>
        </div>

        {/* 2. Total Applications */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Total Applications</div>
            <div className="stat-value">{summary.totalApplications || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              From {summary.uniqueApplicants || 0} unique students
            </div>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <BarChart3 size={24} />
          </div>
        </div>

        {/* 3. Shortlisted Candidates */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Shortlisted Candidates</div>
            <div className="stat-value" style={{ color: '#d97706' }}>
              {summary.totalShortlisted || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              Cleared initial screening
            </div>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* 4. Selected Offers */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Offers Extended</div>
            <div className="stat-value" style={{ color: '#059669' }}>
              {summary.totalSelected || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '0.2rem' }}>
              Selection Rate: {summary.selectionRate || 0}%
            </div>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <Award size={24} />
          </div>
        </div>

        {/* 5. Applications Under Review */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Under Review</div>
            <div className="stat-value" style={{ color: '#2563eb' }}>
              {summary.totalUnderReview || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              Applied, Tech & Interview
            </div>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Clock size={24} />
          </div>
        </div>

        {/* 6. Rejected Candidates */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Not Selected</div>
            <div className="stat-value" style={{ color: '#dc2626' }}>
              {summary.totalRejected || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              Applications rejected
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Analytical Sections */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.6rem 1.1rem',
            fontWeight: activeTab === 'overview' ? 700 : 500,
            color: activeTab === 'overview' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'overview' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem',
          }}
        >
          <TrendingUp size={16} />
          <span>Executive Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('drives')}
          style={{
            padding: '0.6rem 1.1rem',
            fontWeight: activeTab === 'drives' ? 700 : 500,
            color: activeTab === 'drives' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'drives' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem',
          }}
        >
          <Building2 size={16} />
          <span>Drive Performance ({sortedDriveAnalytics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          style={{
            padding: '0.6rem 1.1rem',
            fontWeight: activeTab === 'branches' ? 700 : 500,
            color: activeTab === 'branches' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'branches' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem',
          }}
        >
          <Users size={16} />
          <span>Department Statistics ({branchAnalytics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          style={{
            padding: '0.6rem 1.1rem',
            fontWeight: activeTab === 'applications' ? 700 : 500,
            color: activeTab === 'applications' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'applications' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem',
          }}
        >
          <FileSpreadsheet size={16} />
          <span>Applications Roster ({applicationsRoster.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          style={{
            padding: '0.6rem 1.1rem',
            fontWeight: activeTab === 'students' ? 700 : 500,
            color: activeTab === 'students' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'students' ? '3px solid #2563eb' : '3px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem',
          }}
        >
          <UserCheck size={16} />
          <span>Student Placement Roster ({studentRoster.length})</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <p>Computing real placement analytics & reports...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Status Distribution & Placement Ratio Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '1.75rem',
                }}
              >
                {/* 1. Application Status Distribution */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <BarChart3 size={18} color="#2563eb" />
                      Application Status Distribution
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      Total: {summary.totalApplications}
                    </span>
                  </div>

                  <div className="card-body">
                    {/* Stacked Progress Bar */}
                    <div
                      style={{
                        display: 'flex',
                        height: '14px',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        background: '#e2e8f0',
                        marginBottom: '1.5rem',
                      }}
                    >
                      {statusDistribution.map((st) => {
                        if (st.percentage === 0) return null;
                        const conf = STATUS_COLOR_CONFIG[st.status] || { color: '#64748b' };
                        return (
                          <div
                            key={st.status}
                            style={{
                              width: `${st.percentage}%`,
                              background: conf.color,
                              transition: 'width 0.4s ease',
                            }}
                            title={`${st.status}: ${st.count} (${st.percentage}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Status Meter List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {statusDistribution.map((st) => {
                        const conf = STATUS_COLOR_CONFIG[st.status] || {
                          color: '#64748b',
                          bg: '#f8fafc',
                          border: '#e2e8f0',
                        };

                        return (
                          <div key={st.status}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.875rem',
                                marginBottom: '0.25rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: conf.color,
                                    display: 'inline-block',
                                  }}
                                />
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {st.status}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ color: '#0f172a' }}>{st.count}</strong>
                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                  ({st.percentage}%)
                                </span>
                              </div>
                            </div>

                            {/* Individual Progress Bar */}
                            <div
                              style={{
                                height: '6px',
                                borderRadius: '9999px',
                                background: '#f1f5f9',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${st.percentage}%`,
                                  height: '100%',
                                  background: conf.color,
                                  borderRadius: '9999px',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Placement Summary & Key Performance Indicators */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <TrendingUp size={18} color="#2563eb" />
                      Placement Summary & Key Indicators
                    </h3>
                  </div>

                  <div className="card-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Metric 1: Selection Rate */}
                      <div
                        style={{
                          padding: '1rem',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                            Application Selection Rate
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>
                            {summary.selectionRate}%
                          </span>
                        </div>
                        <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                          {summary.totalSelected} selected out of {summary.totalApplications} submitted applications
                        </div>
                      </div>

                      {/* Metric 2: Student Placement Participation */}
                      <div
                        style={{
                          padding: '1rem',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                            Student Participation Ratio
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>
                            {summary.totalStudents > 0
                              ? Math.round((summary.uniqueApplicants / summary.totalStudents) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                          {summary.uniqueApplicants} out of {summary.totalStudents} registered students have active applications
                        </div>
                      </div>

                      {/* Metric 3: Candidate Evaluation Funnel */}
                      <div
                        style={{
                          padding: '1rem',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                          Hiring Pipeline Funnel
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                          <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Applied</div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#2563eb' }}>{summary.totalApplied}</div>
                          </div>
                          <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Shortlisted</div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#d97706' }}>{summary.totalShortlisted}</div>
                          </div>
                          <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Offers</div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#059669' }}>{summary.totalSelected}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid: Top Drives & Recent Activity */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '1.75rem',
                }}
              >
                {/* Drive Performance Highlights */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Building2 size={18} color="#2563eb" />
                      Top Placement Drives
                    </h3>
                    <button
                      onClick={() => setActiveTab('drives')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <span>View All ({sortedDriveAnalytics.length})</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="card-body" style={{ padding: 0 }}>
                    {sortedDriveAnalytics.length === 0 ? (
                      <div className="empty-state">
                        <p className="empty-title">No Drive Data</p>
                        <p className="empty-subtitle">No recruitment drives match criteria.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Company & Drive</th>
                              <th>Package</th>
                              <th>Applicants</th>
                              <th>Offers</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedDriveAnalytics.slice(0, 5).map((d) => (
                              <tr key={d.driveId}>
                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {d.companyName}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {d.driveTitle}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {d.packageCTC}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                    {d.applicationsCount}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      background: d.selectedCount > 0 ? '#ecfdf5' : '#f8fafc',
                                      color: d.selectedCount > 0 ? '#065f46' : '#64748b',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '6px',
                                      fontWeight: 700,
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    {d.selectedCount} Offers
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Application Activity */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Clock size={18} color="#2563eb" />
                      Recent Candidate Applications
                    </h3>
                    <button
                      onClick={() => setActiveTab('applications')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <span>Full Roster</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="card-body">
                    {recentApplications.length === 0 ? (
                      <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                        <p className="empty-title">No Recent Activity</p>
                        <p className="empty-subtitle">No application submissions found.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recentApplications.map((app) => (
                          <div
                            key={app._id}
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
                              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>
                                {app.studentName}{' '}
                                <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.8rem' }}>
                                  ({app.rollNo} • {app.branch})
                                </span>
                              </div>
                              <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                                {app.companyName} • {new Date(app.appliedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <StatusBadge status={app.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DRIVE / COMPANY PERFORMANCE ANALYTICS */}
          {activeTab === 'drives' && (
            <div className="card">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 className="card-title">
                    <Building2 size={18} color="#2563eb" />
                    Company & Placement Drive Performance
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Complete hiring breakdown per recruitment drive
                  </p>
                </div>

                {/* Sort Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ArrowUpDown size={15} color="#64748b" />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sort By:</span>
                  <select
                    className="form-control"
                    style={{ width: 'auto', fontSize: '0.825rem' }}
                    value={driveSortBy}
                    onChange={(e) => setDriveSortBy(e.target.value)}
                  >
                    <option value="applications">Most Applications</option>
                    <option value="selected">Most Offers Extended</option>
                    <option value="shortlisted">Most Shortlisted</option>
                    <option value="rate">Highest Selection Rate</option>
                    <option value="name">Company Name (A-Z)</option>
                  </select>
                </div>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                {sortedDriveAnalytics.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No Drives Found</p>
                    <p className="empty-subtitle">No placement drives match current filters.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Recruitment Drive</th>
                          <th>Package CTC</th>
                          <th>Status</th>
                          <th>Applications</th>
                          <th>Shortlisted</th>
                          <th>Offers Extended</th>
                          <th>Rejected</th>
                          <th>Selection Rate</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDriveAnalytics.map((drive) => (
                          <tr key={drive.driveId}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {drive.companyName}
                              </div>
                              <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                                {drive.driveTitle}
                              </div>
                            </td>

                            <td>
                              <span style={{ color: '#059669', fontWeight: 700 }}>
                                {drive.packageCTC}
                              </span>
                            </td>

                            <td>
                              <StatusBadge status={drive.driveStatus} type="drive" />
                            </td>

                            <td>
                              <span
                                style={{
                                  background: '#f1f5f9',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {drive.applicationsCount}
                              </span>
                            </td>

                            <td>
                              <span
                                style={{
                                  color: drive.shortlistedCount > 0 ? '#d97706' : '#64748b',
                                  fontWeight: 600,
                                }}
                              >
                                {drive.shortlistedCount}
                              </span>
                            </td>

                            <td>
                              <span
                                style={{
                                  background: drive.selectedCount > 0 ? '#ecfdf5' : 'transparent',
                                  color: drive.selectedCount > 0 ? '#065f46' : '#64748b',
                                  padding: drive.selectedCount > 0 ? '0.2rem 0.5rem' : '0',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                }}
                              >
                                {drive.selectedCount}
                              </span>
                            </td>

                            <td>
                              <span style={{ color: drive.rejectedCount > 0 ? '#dc2626' : '#64748b' }}>
                                {drive.rejectedCount}
                              </span>
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, color: '#059669', minWidth: '40px' }}>
                                  {drive.selectionRate}%
                                </span>
                                <div
                                  style={{
                                    width: '60px',
                                    height: '6px',
                                    borderRadius: '9999px',
                                    background: '#f1f5f9',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${drive.selectionRate}%`,
                                      height: '100%',
                                      background: '#059669',
                                    }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <Link
                                to={`/officer/drives/${drive.driveId}/applicants`}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.775rem', padding: '0.25rem 0.5rem' }}
                              >
                                <Users size={13} />
                                <span>Applicants</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BRANCH-WISE ANALYTICS */}
          {activeTab === 'branches' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Users size={18} color="#2563eb" />
                  Department / Branch-Wise Placement Statistics
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {branchAnalytics.length} Academic Departments
                </span>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                {branchAnalytics.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No Branch Data</p>
                    <p className="empty-subtitle">No academic branches match current filters.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Academic Department</th>
                          <th>Registered Students</th>
                          <th>Applications Submitted</th>
                          <th>Shortlisted</th>
                          <th>Offers Extended</th>
                          <th>Not Selected</th>
                          <th>Department Selection Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchAnalytics.map((b) => (
                          <tr key={b.branch}>
                            <td style={{ fontWeight: 700, color: '#1e293b' }}>
                              <span
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {b.branch}
                              </span>
                            </td>

                            <td>
                              <span style={{ fontWeight: 600, color: '#334155' }}>
                                {b.totalStudents} Students
                              </span>
                            </td>

                            <td>
                              <span
                                style={{
                                  background: '#f8fafc',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                }}
                              >
                                {b.applicationsCount}
                              </span>
                            </td>

                            <td>
                              <span style={{ color: b.shortlistedCount > 0 ? '#d97706' : '#64748b', fontWeight: 600 }}>
                                {b.shortlistedCount}
                              </span>
                            </td>

                            <td>
                              <span
                                style={{
                                  background: b.selectedCount > 0 ? '#ecfdf5' : 'transparent',
                                  color: b.selectedCount > 0 ? '#065f46' : '#64748b',
                                  padding: b.selectedCount > 0 ? '0.2rem 0.5rem' : '0',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                }}
                              >
                                {b.selectedCount} Placed
                              </span>
                            </td>

                            <td>
                              <span style={{ color: b.rejectedCount > 0 ? '#dc2626' : '#64748b' }}>
                                {b.rejectedCount}
                              </span>
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, color: '#059669', minWidth: '40px' }}>
                                  {b.selectionRate}%
                                </span>
                                <div
                                  style={{
                                    width: '80px',
                                    height: '6px',
                                    borderRadius: '9999px',
                                    background: '#f1f5f9',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${b.selectionRate}%`,
                                      height: '100%',
                                      background: '#059669',
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: APPLICATIONS ROSTER TABLE */}
          {activeTab === 'applications' && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    <FileSpreadsheet size={18} color="#2563eb" />
                    Complete Filtered Applications Roster
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Showing {applicationsRoster.length} candidate applications matching active filters
                  </p>
                </div>
                <button onClick={handleExportApplicationsCSV} className="btn btn-secondary btn-sm">
                  <Download size={14} />
                  <span>Download CSV</span>
                </button>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                {applicationsRoster.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No Applications Found</p>
                    <p className="empty-subtitle">
                      No candidate applications match the selected criteria.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Roll No</th>
                          <th>Student Name</th>
                          <th>Branch & CGPA</th>
                          <th>Company / Drive</th>
                          <th>Applied Date</th>
                          <th>Status</th>
                          <th>Remarks / Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applicationsRoster.map((app) => (
                          <tr key={app._id}>
                            <td style={{ fontWeight: 700, color: '#1e293b' }}>
                              {app.rollNo}
                            </td>

                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {app.studentName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {app.email}
                              </div>
                            </td>

                            <td>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                {app.branch} •{' '}
                                <span style={{ color: '#2563eb' }}>{app.cgpa} CGPA</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Backlogs: {app.activeBacklogs}
                              </div>
                            </td>

                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {app.companyName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                                {app.packageCTC} • {app.driveTitle}
                              </div>
                            </td>

                            <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {new Date(app.appliedAt).toLocaleDateString()}
                            </td>

                            <td>
                              <StatusBadge status={app.status} />
                            </td>

                            <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '240px' }}>
                              {app.remarks || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: STUDENT PLACEMENT MASTER ROSTER */}
          {activeTab === 'students' && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    <UserCheck size={18} color="#2563eb" />
                    Master Student Placement Status Roster
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Showing {studentRoster.length} students registered in placement database
                  </p>
                </div>
                <button onClick={handleExportMasterCSV} className="btn btn-primary btn-sm">
                  <Download size={14} />
                  <span>Download Master Roster CSV</span>
                </button>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                {studentRoster.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No Students Found</p>
                    <p className="empty-subtitle">
                      No student records match search or branch filters.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Roll No</th>
                          <th>Student Name</th>
                          <th>Branch</th>
                          <th>CGPA</th>
                          <th>Backlogs</th>
                          <th>Drives Applied</th>
                          <th>Placement Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRoster.map((st) => {
                          const isPlaced = st.placementStatus?.startsWith('Placed');
                          return (
                            <tr
                              key={st._id}
                              style={{
                                background: isPlaced ? '#f0fdf4' : 'transparent',
                              }}
                            >
                              <td style={{ fontWeight: 700, color: '#1e293b' }}>
                                {st.rollNo || 'N/A'}
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                  {st.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {st.email}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, color: '#334155' }}>
                                  {st.branch}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 700, color: '#2563eb' }}>
                                  {st.cgpa}
                                </span>
                              </td>
                              <td>{st.activeBacklogs ?? 0}</td>
                              <td>
                                <span
                                  style={{
                                    background: '#f1f5f9',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {st.totalApplications || 0} Drives
                                </span>
                              </td>
                              <td>
                                {isPlaced ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      background: '#ecfdf5',
                                      color: '#065f46',
                                      border: '1px solid #a7f3d0',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '9999px',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>{st.placementStatus}</span>
                                  </span>
                                ) : st.totalApplications > 0 ? (
                                  <span
                                    style={{
                                      background: '#eff6ff',
                                      color: '#1e40af',
                                      border: '1px solid #bfdbfe',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '9999px',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    In Progress
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      background: '#f8fafc',
                                      color: '#64748b',
                                      border: '1px solid #e2e8f0',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '9999px',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    Not Applied
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlacementReports;
