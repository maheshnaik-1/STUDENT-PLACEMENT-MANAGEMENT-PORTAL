import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  BarChart3,
  Download,
  Printer,
  Users,
  Award,
  Building2,
  Filter,
  Search,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

const BRANCH_LIST = ['ALL', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'];

const PlacementReports = () => {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { showError, showSuccess } = useNotification();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [statsRes, studentsRes] = await Promise.all([
        api.applications.getStats(),
        api.students.getAll({ branch: branchFilter, search }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (studentsRes.success) setStudents(studentsRes.data || []);
    } catch (err) {
      showError(err.message || 'Failed to load placement reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [branchFilter, search]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportMasterCSV = () => {
    if (students.length === 0) {
      showError('No student records to export');
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

    const rows = students.map((st) => [
      `"${st.rollNo || ''}"`,
      `"${st.name || ''}"`,
      `"${st.email || ''}"`,
      `"${st.branch || ''}"`,
      st.cgpa || 0,
      st.activeBacklogs ?? 0,
      st.passingYear || 2026,
      st.totalApplications || 0,
      `"${st.placementStatus || 'Not Applied'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `College_Placement_Master_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Placement master roster exported to CSV successfully!');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Placement Analytics & Reports</h1>
          <p className="page-subtitle">
            Executive hiring summary, department statistics, and student placement records
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} />
            <span>Print Report</span>
          </button>
          <button onClick={handleExportMasterCSV} className="btn btn-primary">
            <Download size={16} />
            <span>Export Master CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Placement Rate</div>
            <div className="stat-value">{stats?.placementRate || 0}%</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Offers Released</div>
            <div className="stat-value">{stats?.totalSelected || 0}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <Award size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Total Applications</div>
            <div className="stat-value">{stats?.totalApplications || 0}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <BarChart3 size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Registered Students</div>
            <div className="stat-value">{stats?.totalStudents || 0}</div>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Grid: Department Breakdown & Company Selections */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Department Placement Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Users size={18} color="#2563eb" />
              Department-Wise Students & Placements
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Students</th>
                    <th>Average CGPA</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.branchStats?.map((b) => (
                    <tr key={b._id}>
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>
                        {b._id}
                      </td>
                      <td>{b.totalStudents} Registered</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#2563eb' }}>
                          {b.avgCGPA ? b.avgCGPA.toFixed(2) : '0.00'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Company-Wise Hiring Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Building2 size={18} color="#2563eb" />
              Company-Wise Recruitment Offers
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Package CTC</th>
                    <th>Offers Made</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.companyHires?.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>
                        {c._id}
                      </td>
                      <td>
                        <span style={{ color: '#059669', fontWeight: 700 }}>
                          {c.package || 'Competitive'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#065f46',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          {c.hires} Offers
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Master Student Placement Roster */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Award size={18} color="#2563eb" />
            Master Student Placement Status Roster
          </h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing {students.length} students
          </span>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control search-input"
                placeholder="Search students by name, roll no, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="#64748b" />
              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                {BRANCH_LIST.map((b) => (
                  <option key={b} value={b}>
                    Branch: {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Loading student records...
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No Students Found</p>
              <p className="empty-subtitle">
                Try clearing your search or selecting another branch.
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
                  {students.map((st) => {
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
    </div>
  );
};

export default PlacementReports;
