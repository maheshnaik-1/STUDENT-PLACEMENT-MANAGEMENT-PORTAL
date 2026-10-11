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
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const DriveDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [matchScoreData, setMatchScoreData] = useState(null);
  const [matchScoreLoading, setMatchScoreLoading] = useState(true);
  const [matchScoreError, setMatchScoreError] = useState(null);

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

  const fetchMatchScore = async (driveId) => {
    if (!driveId) return;
    try {
      setMatchScoreLoading(true);
      setMatchScoreError(null);
      setMatchScoreData(null);
      const res = await api.drives.getMatchScore(driveId);
      if (res.success) {
        setMatchScoreData(res.data);
      } else {
        setMatchScoreError(res.message || 'Unable to compute match score');
      }
    } catch (err) {
      setMatchScoreError(err.message || 'Unable to compute match score');
    } finally {
      setMatchScoreLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveDetails();
    fetchMatchScore(id);
  }, [id]);

  const handleApply = async () => {
    try {
      setApplying(true);
      const res = await api.applications.apply(id);
      if (res.success) {
        showSuccess(res.message || 'Application submitted successfully!');
        fetchDriveDetails();
        fetchMatchScore(id);
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
    <div style={{ width: '100%', margin: '0 auto' }}>
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
                  gap: '0.75rem',
                  background: '#eff6ff',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #bfdbfe',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e40af', fontWeight: 700, fontSize: '0.9rem' }}>
                  <FileCheck2 size={18} />
                  <span>Already Applied</span>
                </div>
                <StatusBadge status={drive.myApplication?.status || drive.myApplicationStatus || 'Applied'} />
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

      {/* Skill Match Breakdown Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <h3 className="card-title">
            <Sparkles size={18} color="#6366f1" />
            Skill Match & Candidate Alignment
          </h3>

          {matchScoreData && !matchScoreLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  background:
                    matchScoreData.skillMatch.totalRequired === 0
                      ? '#f1f5f9'
                      : matchScoreData.skillMatch.score >= 70
                      ? '#ecfdf5'
                      : matchScoreData.skillMatch.score >= 40
                      ? '#eff6ff'
                      : '#f1f5f9',
                  color:
                    matchScoreData.skillMatch.totalRequired === 0
                      ? '#475569'
                      : matchScoreData.skillMatch.score >= 70
                      ? '#065f46'
                      : matchScoreData.skillMatch.score >= 40
                      ? '#1e40af'
                      : '#475569',
                  border: '1px solid',
                  borderColor:
                    matchScoreData.skillMatch.totalRequired === 0
                      ? '#cbd5e1'
                      : matchScoreData.skillMatch.score >= 70
                      ? '#a7f3d0'
                      : matchScoreData.skillMatch.score >= 40
                      ? '#bfdbfe'
                      : '#cbd5e1',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                }}
              >
                {matchScoreData.skillMatch.totalRequired === 0
                  ? 'Baseline Score'
                  : `${matchScoreData.skillMatch.score}% Match Score`}
              </span>
            </div>
          )}
        </div>

        <div className="card-body">
          {matchScoreLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#6366f1',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 0.75rem',
                }}
              />
              <p style={{ fontSize: '0.875rem' }}>Computing skill match breakdown...</p>
            </div>
          ) : matchScoreError ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
                <AlertCircle size={16} />
                <span>{matchScoreError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchMatchScore(id)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <RefreshCw size={14} />
                Retry Analysis
              </button>
            </div>
          ) : matchScoreData ? (
            <div>
              {/* Score Progress Bar */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: '#475569' }}>Profile Skills Alignment</span>
                  <span
                    style={{
                      color:
                        matchScoreData.skillMatch.totalRequired === 0
                          ? '#64748b'
                          : matchScoreData.skillMatch.score >= 70
                          ? '#059669'
                          : matchScoreData.skillMatch.score >= 40
                          ? '#2563eb'
                          : '#64748b',
                      fontWeight: 700,
                    }}
                  >
                    {matchScoreData.skillMatch.totalRequired > 0
                      ? `${matchScoreData.skillMatch.totalMatched} of ${matchScoreData.skillMatch.totalRequired} required skills matched (${matchScoreData.skillMatch.score}%)`
                      : 'No required technical skills specified'}
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '9999px',
                    background: '#e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, matchScoreData.skillMatch.score))}%`,
                      background:
                        matchScoreData.skillMatch.totalRequired === 0
                          ? '#94a3b8'
                          : matchScoreData.skillMatch.score >= 70
                          ? 'linear-gradient(90deg, #10b981, #059669)'
                          : matchScoreData.skillMatch.score >= 40
                          ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                          : 'linear-gradient(90deg, #94a3b8, #64748b)',
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Match Explanation */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: '#334155',
                  marginBottom: '1.25rem',
                }}
              >
                {matchScoreData.skillMatch.explanation}
              </div>

              {/* Matched & Missing Skills Breakdown */}
              {matchScoreData.skillMatch.totalRequired > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {/* Matched Skills */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontWeight: 700,
                        color: '#166534',
                        fontSize: '0.85rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <CheckCircle2 size={16} color="#16a34a" />
                      <span>
                        Matched Skills ({matchScoreData.skillMatch.matchedSkills.length})
                      </span>
                    </div>
                    {matchScoreData.skillMatch.matchedSkills.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {matchScoreData.skillMatch.matchedSkills.map((skill) => (
                          <span
                            key={skill}
                            style={{
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #86efac',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#65a30d', fontSize: '0.8rem', margin: 0 }}>
                        None of your current profile skills match the required keywords.
                      </p>
                    )}
                  </div>

                  {/* Missing Skills */}
                  <div
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: '8px',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontWeight: 700,
                        color: '#9f1239',
                        fontSize: '0.85rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <XCircle size={16} color="#e11d48" />
                      <span>
                        Missing Skills ({matchScoreData.skillMatch.missingSkills.length})
                      </span>
                    </div>
                    {matchScoreData.skillMatch.missingSkills.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {matchScoreData.skillMatch.missingSkills.map((skill) => (
                          <span
                            key={skill}
                            style={{
                              background: '#ffe4e6',
                              color: '#9f1239',
                              border: '1px solid #fda4af',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                            }}
                          >
                            ✕ {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#059669', fontSize: '0.8rem', margin: 0 }}>
                        All required skills are present in your student profile!
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.825rem',
                    color: '#1e40af',
                  }}
                >
                  No specific mandatory skills are designated for this drive. All candidates receive a baseline 100% skill score.
                </div>
              )}

              {/* Additional Student Skills */}
              {matchScoreData.skillMatch.additionalSkills &&
                matchScoreData.skillMatch.additionalSkills.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Other skills in your profile:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {matchScoreData.skillMatch.additionalSkills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Explicit Legal/Advisory Disclaimer */}
              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  lineHeight: 1.5,
                }}
              >
                <strong>Evaluation Disclaimer:</strong> Skill match evaluates technical keyword overlap between your student profile and job requirements. Match score is independent of academic eligibility and does not represent a hiring probability or guarantee of placement.
              </div>
            </div>
          ) : null}
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
          {drive.requiredSkills && drive.requiredSkills.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.5rem',
                }}
              >
                Required Technical Skills:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {drive.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      background: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

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
