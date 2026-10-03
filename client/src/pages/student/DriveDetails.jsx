import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Building2,
  MapPin,
  Calendar,
  IndianRupee,
  Globe,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Briefcase,
  FileCheck2,
  Layers,
  Sparkles,
} from 'lucide-react';

const DriveDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const fetchDriveDetails = async () => {
    try {
      setLoading(true);
      const res = await api.drives.getById(id);
      if (res.success) {
        setDrive(res.data);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch drive details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveDetails();
  }, [id]);

  const handleApply = async () => {
    try {
      setApplying(true);
      const res = await api.applications.apply(id);
      if (res.success) {
        showSuccess(res.message || 'Application submitted successfully!');
        fetchDriveDetails();
      }
    } catch (err) {
      showError(err.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
        <p>Loading placement drive details...</p>
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="card empty-state">
        <p className="empty-title">Placement Drive Not Found</p>
        <Link to="/student/drives" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
          Back to Available Drives
        </Link>
      </div>
    );
  }

  const company = drive.company || {};
  const eligibility = drive.eligibility || {};
  const isEligible = drive.isEligible !== false;
  const reasons = drive.eligibilityReasons || [];
  const hasApplied = drive.hasApplied;

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/student/drives"
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
          <span>Back to All Placement Drives</span>
        </Link>
      </div>

      {/* Drive Overview Hero Card */}
      <div
        className="card"
        style={{
          padding: '2rem',
          border: '1px solid #cbd5e1',
          marginBottom: '1.5rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '14px',
                  objectFit: 'cover',
                  border: '1px solid #e2e8f0',
                }}
              />
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                }}
              >
                {company.name ? company.name.substring(0, 2).toUpperCase() : 'CO'}
              </div>
            )}

            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                {drive.title}
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#475569',
                  fontSize: '0.95rem',
                  marginTop: '0.25rem',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                  {company.name}
                </span>
                <span>•</span>
                <span>{company.industry || 'IT'}</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={15} color="#64748b" />
                  {drive.location}
                </span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#065f46',
                background: '#ecfdf5',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                border: '1px solid #a7f3d0',
                display: 'inline-block',
              }}
            >
              {drive.packageCTC}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
              Package Offered (CTC)
            </div>
          </div>
        </div>

        {/* Action / Application Callout */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
              <Clock size={16} color="#ef4444" />
              <span>
                Deadline: <strong>{new Date(drive.deadline).toLocaleDateString()}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
              <Calendar size={16} color="#2563eb" />
              <span>
                Drive Date: <strong>{new Date(drive.driveDate).toLocaleDateString()}</strong>
              </span>
            </div>
          </div>

          <div>
            {hasApplied ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#eff6ff',
                  color: '#1e40af',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  border: '1px solid #bfdbfe',
                }}
              >
                <FileCheck2 size={18} />
                <span>Already Applied (Status: {drive.myApplication?.status || 'Applied'})</span>
              </div>
            ) : isEligible ? (
              <button
                onClick={handleApply}
                disabled={applying}
                className="btn btn-primary btn-lg"
              >
                {applying ? 'Submitting Application...' : 'Submit Application Now'}
              </button>
            ) : (
              <button disabled className="btn btn-secondary btn-lg">
                Not Eligible to Apply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Eligibility Verification & Selection Process */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Eligibility Verification Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Sparkles size={18} color="#2563eb" />
              Eligibility Verification
            </h3>
            {isEligible ? (
              <span className="badge badge-selected">✓ Eligible</span>
            ) : (
              <span className="badge badge-rejected">✕ Ineligible</span>
            )}
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* CGPA Check */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Minimum CGPA</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Required: {eligibility.minCGPA || 0} • Your CGPA: {user?.cgpa}
                  </div>
                </div>
                {(user?.cgpa || 0) >= (eligibility.minCGPA || 0) ? (
                  <CheckCircle2 size={20} color="#10b981" />
                ) : (
                  <XCircle size={20} color="#ef4444" />
                )}
              </div>

              {/* Branch Check */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Eligible Engineering Branches</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Allowed: {eligibility.allowedBranches?.join(', ')} • Your Branch: {user?.branch}
                  </div>
                </div>
                {eligibility.allowedBranches?.includes(user?.branch) ? (
                  <CheckCircle2 size={20} color="#10b981" />
                ) : (
                  <XCircle size={20} color="#ef4444" />
                )}
              </div>

              {/* Backlogs Check */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Active Backlogs Limit</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Max Allowed: {eligibility.maxBacklogs ?? 0} • Your Backlogs: {user?.activeBacklogs ?? 0}
                  </div>
                </div>
                {(user?.activeBacklogs ?? 0) <= (eligibility.maxBacklogs ?? 0) ? (
                  <CheckCircle2 size={20} color="#10b981" />
                ) : (
                  <XCircle size={20} color="#ef4444" />
                )}
              </div>
            </div>

            {!isEligible && reasons.length > 0 && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginTop: '1.25rem',
                  fontSize: '0.85rem',
                  color: '#991b1b',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                  Ineligibility Reasons:
                </div>
                <ul style={{ paddingLeft: '1.25rem' }}>
                  {reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Selection Rounds */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Layers size={18} color="#2563eb" />
              Recruitment Process Rounds
            </h3>
          </div>
          <div className="card-body">
            {drive.rounds && drive.rounds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {drive.rounds.map((round, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: '#f8fafc',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                      {round}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Rounds will be communicated by the Placement Cell prior to drive commencement.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Job Description Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Briefcase size={18} color="#2563eb" />
            Job Role & Responsibilities
          </h3>
        </div>
        <div className="card-body">
          <div
            style={{
              color: '#334155',
              lineHeight: 1.7,
              fontSize: '0.95rem',
              whiteSpace: 'pre-line',
            }}
          >
            {drive.jobDescription}
          </div>
        </div>
      </div>

      {/* Company Profile Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Building2 size={18} color="#2563eb" />
            About {company.name}
          </h3>
        </div>
        <div className="card-body">
          <p style={{ color: '#334155', lineHeight: 1.6, fontSize: '0.95rem' }}>
            {company.description}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
              flexWrap: 'wrap',
              fontSize: '0.875rem',
            }}
          >
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Globe size={16} />
                <span>Visit Company Website</span>
              </a>
            )}
            {company.contactEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
                <Mail size={16} />
                <span>HR: {company.contactEmail}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveDetails;
