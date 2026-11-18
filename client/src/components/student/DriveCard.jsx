import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import CompanyLogo from '../common/CompanyLogo';
import {
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  CheckCircle2,
  XCircle,
  FileCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const DriveCard = ({ drive, onApply, isApplying }) => {
  const company = drive.company || {};
  const eligibility = drive.eligibility || {};

  const isEligible =
    drive.academicEligibility !== undefined
      ? drive.academicEligibility.isEligible
      : drive.isEligible !== false;
  const reasons =
    drive.academicEligibility?.reasons || drive.eligibilityReasons || [];
  const hasApplied = drive.hasApplied;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        border: hasApplied
          ? '1.5px solid #93c5fd'
          : isEligible
          ? '1px solid #cbd5e1'
          : '1px solid #e2e8f0',
        background: '#ffffff',
      }}
    >
      <div className="card-body" style={{ padding: '1.25rem' }}>
        {/* Company Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <CompanyLogo
              src={company.logoUrl}
              name={company.name}
              size={46}
              borderRadius={10}
              fontSize="1.1rem"
            />
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {drive.title}
              </h4>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                  color: '#64748b',
                  marginTop: '0.15rem',
                }}
              >
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {company.name}
                </span>
                <span>•</span>
                <span>{company.industry || 'IT'}</span>
              </div>
            </div>
          </div>

          {/* Package Badge */}
          <div
            style={{
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}
          >
            {drive.packageCTC}
          </div>
        </div>

        {/* Drive Info Points */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            padding: '0.75rem',
            background: '#f8fafc',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.825rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
            <MapPin size={14} color="#64748b" />
            <span>{drive.location || 'Pan India'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
            <Calendar size={14} color="#64748b" />
            <span>
              Drive: {new Date(drive.driveDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Eligibility Snapshot */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.4rem',
            }}
          >
            Eligibility Criteria
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span
              style={{
                background: '#f1f5f9',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                color: '#334155',
                fontWeight: 500,
              }}
            >
              Min CGPA: <strong>{eligibility.minCGPA || 'None'}</strong>
            </span>
            <span
              style={{
                background: '#f1f5f9',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                color: '#334155',
                fontWeight: 500,
              }}
            >
              Max Backlogs: <strong>{eligibility.maxBacklogs ?? '0'}</strong>
            </span>
            <span
              style={{
                background: '#f1f5f9',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                color: '#334155',
                fontWeight: 500,
              }}
            >
              Branches: <strong>{eligibility.allowedBranches?.join(', ') || 'All'}</strong>
            </span>
          </div>
        </div>

        {/* Eligibility Status Evaluation */}
        <div style={{ marginBottom: '1rem' }}>
          {hasApplied ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.825rem',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                <FileCheck size={16} color="#2563eb" />
                <span>Application Submitted</span>
              </div>
              <StatusBadge status={drive.myApplicationStatus || 'Applied'} />
            </div>
          ) : isEligible ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} color="#10b981" />
              <span>You meet all eligibility criteria!</span>
            </div>
          ) : (
            <div
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                <XCircle size={15} color="#ef4444" />
                <span>Not Eligible to Apply</span>
              </div>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                {reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* V3.0 AI Skill Match Section (when present) */}
        {drive.skillMatch && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.8rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
                flexWrap: 'wrap',
                gap: '0.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              >
                <Sparkles size={14} color="#2563eb" />
                <span>AI Skill Match:</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {drive.recommendationTier && (
                  <span
                    style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      background:
                        drive.recommendationTier === 'High Match'
                          ? '#ecfdf5'
                          : drive.recommendationTier === 'Moderate Match'
                          ? '#eff6ff'
                          : drive.recommendationTier === 'Ineligible'
                          ? '#fef2f2'
                          : '#f1f5f9',
                      color:
                        drive.recommendationTier === 'High Match'
                          ? '#065f46'
                          : drive.recommendationTier === 'Moderate Match'
                          ? '#1e40af'
                          : drive.recommendationTier === 'Ineligible'
                          ? '#991b1b'
                          : '#475569',
                      border: '1px solid',
                      borderColor:
                        drive.recommendationTier === 'High Match'
                          ? '#a7f3d0'
                          : drive.recommendationTier === 'Moderate Match'
                          ? '#bfdbfe'
                          : drive.recommendationTier === 'Ineligible'
                          ? '#fecaca'
                          : '#cbd5e1',
                    }}
                  >
                    {drive.recommendationTier}
                  </span>
                )}

                {drive.skillMatch.totalRequired > 0 ? (
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color:
                        drive.skillMatch.score >= 70
                          ? '#059669'
                          : drive.skillMatch.score >= 40
                          ? '#2563eb'
                          : '#64748b',
                    }}
                  >
                    {drive.skillMatch.score}%
                  </span>
                ) : (
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: '#64748b',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                    }}
                  >
                    Baseline
                  </span>
                )}
              </div>
            </div>

            {/* Matched & Missing Skills list if required skills exist */}
            {drive.skillMatch.totalRequired > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  marginTop: '0.3rem',
                }}
              >
                {drive.skillMatch.matchedSkills.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{ color: '#059669', fontWeight: 600, fontSize: '0.75rem' }}
                    >
                      Matched:
                    </span>
                    {drive.skillMatch.matchedSkills.map((s) => (
                      <span
                        key={s}
                        style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          fontSize: '0.725rem',
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {drive.skillMatch.missingSkills.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.75rem' }}
                    >
                      Missing:
                    </span>
                    {drive.skillMatch.missingSkills.map((s) => (
                      <span
                        key={s}
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          fontSize: '0.725rem',
                          fontWeight: 500,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  marginTop: '0.2rem',
                }}
              >
                {drive.skillMatch.explanation}
              </div>
            )}

            <div
              style={{
                fontSize: '0.7rem',
                color: '#94a3b8',
                marginTop: '0.4rem',
                borderTop: '1px dashed #e2e8f0',
                paddingTop: '0.3rem',
              }}
            >
              *Skill match evaluates technical keywords only. Does not establish selection or academic eligibility.
            </div>
          </div>
        )}
      </div>

      {/* Card Actions Footer */}
      <div
        style={{
          padding: '0.875rem 1.25rem',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          to={`/student/drives/${drive._id}`}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
        >
          View Details
        </Link>

        {!hasApplied && isEligible && (
          <button
            onClick={() => onApply && onApply(drive)}
            disabled={isApplying}
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
          >
            {isApplying ? 'Applying...' : 'Apply Now'}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DriveCard;
