import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import DriveCard from '../../components/student/DriveCard';
import {
  Search,
  Filter,
  CheckCircle2,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';

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

const AvailableDrives = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [applyingId, setApplyingId] = useState(null);

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await api.drives.getAll({
        search,
        branch: selectedBranch,
        eligibleOnly: eligibleOnly ? 'true' : 'false',
      });
      if (res.success) {
        setDrives(res.data || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch placement drives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [selectedBranch, eligibleOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDrives();
  };

  const handleApply = async (drive) => {
    try {
      setApplyingId(drive._id);
      const res = await api.applications.apply(drive._id);
      if (res.success) {
        showSuccess(res.message || 'Application submitted successfully!');
        fetchDrives();
      }
    } catch (err) {
      showError(err.message || 'Failed to apply for placement drive');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Placement Drives</h1>
          <p className="page-subtitle">
            Browse upcoming and ongoing recruitment drives from top companies
          </p>
        </div>

        {/* Student Mini Academic Profile Reference */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ fontWeight: 600, color: '#475569' }}>Your Profile:</div>
          <span style={{ background: '#eff6ff', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
            {user?.branch}
          </span>
          <span style={{ background: '#eff6ff', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
            CGPA: {user?.cgpa}
          </span>
          <span style={{ background: '#eff6ff', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
            Backlogs: {user?.activeBacklogs ?? 0}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search by company, role headline, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#64748b" />
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {BRANCH_OPTIONS.map((b) => (
              <option key={b} value={b}>
                Branch: {b}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Eligible Only */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: eligibleOnly ? '#059669' : '#475569',
            cursor: 'pointer',
            background: eligibleOnly ? '#ecfdf5' : '#f8fafc',
            border: eligibleOnly ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
            padding: '0.5rem 0.85rem',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
            style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
          />
          <span>Show Eligible Drives Only</span>
        </label>
      </div>

      {/* Drives Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p>Loading placement drives...</p>
        </div>
      ) : drives.length === 0 ? (
        <div className="card empty-state">
          <Briefcase size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">No Placement Drives Found</h3>
          <p className="empty-subtitle">
            {eligibleOnly
              ? 'No drives match your current eligibility criteria or filters. Try disabling the "Show Eligible Only" filter.'
              : 'Try changing your search query or branch filter.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {drives.map((drive) => (
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
  );
};

export default AvailableDrives;
