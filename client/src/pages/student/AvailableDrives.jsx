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
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'recommended'
  const [recsError, setRecsError] = useState(null);
  const [recsLoaded, setRecsLoaded] = useState(false);

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

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setRecsError(null);
      const res = await api.drives.getRecommendations();
      if (res.success) {
        setRecommendations(res.data || []);
        setRecsLoaded(true);
      } else {
        setRecsError(res.message || 'Failed to fetch recommendations');
      }
    } catch (err) {
      setRecsError(err.message || 'Failed to fetch AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'recommended') {
      fetchRecommendations();
    } else {
      fetchDrives();
    }
  }, [viewMode, selectedBranch, eligibleOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (viewMode === 'recommended') {
      fetchRecommendations();
    } else {
      fetchDrives();
    }
  };

  const handleApply = async (drive) => {
    try {
      setApplyingId(drive._id);
      const res = await api.applications.apply(drive._id);
      if (res.success) {
        showSuccess(res.message || 'Application submitted successfully!');
        if (viewMode === 'recommended') {
          fetchRecommendations();
        } else {
          fetchDrives();
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to apply for placement drive');
    } finally {
      setApplyingId(null);
    }
  };

  const displayedRecommendations = recommendations.filter((drive) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchCompany = drive.company?.name?.toLowerCase().includes(q);
      const matchTitle = drive.title?.toLowerCase().includes(q);
      const matchLocation = drive.location?.toLowerCase().includes(q);
      if (!matchCompany && !matchTitle && !matchLocation) return false;
    }
    if (selectedBranch !== 'ALL') {
      const allowed = drive.eligibility?.allowedBranches;
      if (allowed && allowed.length > 0 && !allowed.includes(selectedBranch)) return false;
    }
    if (eligibleOnly) {
      const eligible =
        drive.academicEligibility !== undefined
          ? drive.academicEligibility.isEligible
          : drive.isEligible !== false;
      if (!eligible) return false;
    }
    return true;
  });

  const displayedDrives = viewMode === 'recommended' ? displayedRecommendations : drives;

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

      {/* Mode Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode('all')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            background: viewMode === 'all' ? '#2563eb' : '#f1f5f9',
            color: viewMode === 'all' ? '#ffffff' : '#475569',
            boxShadow: viewMode === 'all' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Layers size={16} />
          All Campus Drives
          <span
            style={{
              background: viewMode === 'all' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
              color: viewMode === 'all' ? '#ffffff' : '#334155',
              padding: '0.1rem 0.45rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
            }}
          >
            {drives.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('recommended')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            background:
              viewMode === 'recommended'
                ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                : '#f1f5f9',
            color: viewMode === 'recommended' ? '#ffffff' : '#475569',
            boxShadow:
              viewMode === 'recommended'
                ? '0 4px 12px rgba(99, 102, 241, 0.28)'
                : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Sparkles size={16} />
          Smart Recommendations
          {recsLoaded && (
            <span
              style={{
                background:
                  viewMode === 'recommended' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: viewMode === 'recommended' ? '#ffffff' : '#334155',
                padding: '0.1rem 0.45rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
              }}
            >
              {recommendations.length}
            </span>
          )}
        </button>
      </div>

      {/* Smart Recommendations Advisory Banner */}
      {viewMode === 'recommended' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)',
            border: '1px solid #c7d2fe',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <Sparkles size={20} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.825rem', color: '#334155', lineHeight: 1.5 }}>
            <strong style={{ color: '#1e1b4b', display: 'block', marginBottom: '0.2rem' }}>
              Deterministic Skill Matching & Eligibility Engine
            </strong>
            Placement recommendations rank drives based on skill keyword alignment between your profile and drive requirements, evaluated alongside your academic eligibility.
            <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', marginTop: '0.3rem' }}>
              Notice: Skill match score reflects technical keyword presence and does not guarantee academic eligibility, interview shortlisting, or job offers. Drives with no required skills specified display a 100% baseline score with an explicit disclaimer.
            </span>
          </div>
        </div>
      )}

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

      {/* Drives Grid / Loading / Error States */}
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
          <p>
            {viewMode === 'recommended'
              ? 'Analyzing skills and computing drive recommendations...'
              : 'Loading placement drives...'}
          </p>
        </div>
      ) : viewMode === 'recommended' && recsError ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: '12px' }}>
          <Briefcase size={40} color="#ef4444" style={{ margin: '0 auto 0.75rem' }} />
          <h4 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>Unable to Load Recommendations</h4>
          <p style={{ color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {recsError}
          </p>
          <button
            type="button"
            onClick={fetchRecommendations}
            className="btn btn-secondary btn-sm"
          >
            Retry Loading Recommendations
          </button>
        </div>
      ) : displayedDrives.length === 0 ? (
        <div className="card empty-state">
          <Briefcase size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">
            {viewMode === 'recommended' ? 'No Recommendations Found' : 'No Placement Drives Found'}
          </h3>
          <p className="empty-subtitle">
            {viewMode === 'recommended'
              ? 'No active placement drives match your current filters. Add more skills to your profile or view all campus drives.'
              : eligibleOnly
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
          {displayedDrives.map((drive) => (
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
