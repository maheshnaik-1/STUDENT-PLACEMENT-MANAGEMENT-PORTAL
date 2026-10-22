import React from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import {
  Users,
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Edit3,
  FileText,
  Info,
  Scale,
  GraduationCap,
} from 'lucide-react';

/**
 * CandidateComparisonModal (V4.0 Phase 2 Step 3)
 *
 * Side-by-side comparison modal for up to 4 candidates.
 * Displays candidate credentials, eligibility, status, AI skill match scores,
 * and matched/missing skills with safe fallbacks and highlighting.
 */
const CandidateComparisonModal = ({
  isOpen,
  onClose,
  matrix,
  onRemoveCandidate,
  onClearAll,
  onSelectForEval,
  onSelectForStatus,
  onPreviewResume,
}) => {
  if (!isOpen) return null;

  const {
    candidates = [],
    count = 0,
    maxLimit = 4,
    isAtLimit = false,
    topCgpaAppId = null,
    topMatchScoreAppId = null,
    driveSummary = {},
  } = matrix || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Candidate Comparison (${count} of ${maxLimit} Selected)`}
      maxWidth="1180px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* 1. Drive Overview & Comparison Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <Scale size={18} color="#2563eb" />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {driveSummary.companyName || 'Company'} — {driveSummary.title || 'Placement Drive'}
              </h4>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Drive Criteria: Min CGPA{' '}
              <strong style={{ color: '#1e293b' }}>{driveSummary.minCgpa || 0}</strong> • Max Backlogs{' '}
              <strong style={{ color: '#1e293b' }}>{driveSummary.maxBacklogs ?? 0}</strong> • Branches:{' '}
              <strong style={{ color: '#1e293b' }}>
                {driveSummary.allowedBranches && driveSummary.allowedBranches.length > 0
                  ? driveSummary.allowedBranches.join(', ')
                  : 'All Branches Eligible'}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClearAll}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.775rem' }}
            >
              Clear All Comparison
            </button>
          </div>
        </div>

        {/* 2. Capacity Limit / Guidance Banners */}
        {isAtLimit && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.825rem',
              color: '#92400e',
            }}
          >
            <Info size={16} color="#d97706" style={{ flexShrink: 0 }} />
            <span>
              <strong>Maximum comparison capacity reached (4 candidates).</strong> To compare a
              different applicant, remove one from below.
            </span>
          </div>
        )}

        {count === 1 && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.825rem',
              color: '#1e40af',
            }}
          >
            <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <span>
              <strong>1 candidate selected.</strong> Add up to 3 more applicants from the roster to
              perform a side-by-side comparative analysis.
            </span>
          </div>
        )}

        {/* 3. Empty State if no candidates selected */}
        {count === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <Users size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ margin: '0 0 0.4rem', color: '#1e293b' }}>No Candidates Selected</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Click the "Compare" button on any applicant row to add up to 4 candidates to this
              view.
            </p>
          </div>
        ) : (
          /* 4. Side-by-Side Comparison Table Matrix */
          <div
            style={{
              overflowX: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              background: '#ffffff',
            }}
          >
            <table
              className="table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.825rem',
                margin: 0,
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th
                    style={{
                      width: '200px',
                      minWidth: '180px',
                      padding: '1rem',
                      fontWeight: 700,
                      color: '#475569',
                      textAlign: 'left',
                      verticalAlign: 'bottom',
                      borderRight: '1px solid #e2e8f0',
                    }}
                  >
                    Attribute / Criteria
                  </th>

                  {candidates.map((cand) => (
                    <th
                      key={cand.applicationId}
                      style={{
                        minWidth: '220px',
                        padding: '1rem',
                        textAlign: 'left',
                        verticalAlign: 'top',
                        borderRight: '1px solid #e2e8f0',
                        background:
                          cand.applicationId === topMatchScoreAppId ||
                          cand.applicationId === topCgpaAppId
                            ? '#fbfdff'
                            : '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              flexShrink: 0,
                            }}
                          >
                            {cand.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                              {cand.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Roll: {cand.rollNo}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveCandidate(cand.applicationId)}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title={`Remove ${cand.name} from comparison`}
                          aria-label={`Remove ${cand.name} from comparison`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Row 1: Application Status */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                    Application Status
                  </td>
                  {candidates.map((cand) => (
                    <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <StatusBadge status={cand.status} />
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Applied {cand.appliedAt ? new Date(cand.appliedAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 2: Branch & Academic CGPA */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                    Academic Standing
                  </td>
                  {candidates.map((cand) => (
                    <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{cand.branch}</span>
                        <span>•</span>
                        <span
                          style={{
                            fontWeight: 800,
                            color: '#2563eb',
                            fontSize: '0.875rem',
                          }}
                        >
                          {cand.cgpaDisplay} CGPA
                        </span>
                        {cand.applicationId === topCgpaAppId && candidates.length > 1 && (
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              border: '1px solid #fde68a',
                            }}
                          >
                            ⭐ Top CGPA
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: cand.backlogs > 0 ? '#dc2626' : '#16a34a', marginTop: '0.2rem', fontWeight: 600 }}>
                        {cand.backlogs === 0 ? '✓ 0 Active Backlogs' : `⚠ ${cand.backlogs} Active Backlog(s)`}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 3: Academic Eligibility */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                    Drive Eligibility
                  </td>
                  {candidates.map((cand) => {
                    const elig = cand.academicEligibility || {};
                    return (
                      <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                        {elig.isEligible ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              border: '1px solid #86efac',
                            }}
                          >
                            <CheckCircle2 size={13} color="#16a34a" />
                            <span>Eligible</span>
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '999px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                border: '1px solid #fca5a5',
                              }}
                            >
                              <AlertCircle size={13} color="#dc2626" />
                              <span>Ineligible</span>
                            </div>
                            {elig.violations && elig.violations.length > 0 && (
                              <div
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#dc2626',
                                  marginTop: '0.3rem',
                                  lineHeight: 1.3,
                                }}
                              >
                                {elig.violations.join(' • ')}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 4: AI Skill-Match Score */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                    AI Skill-Match Score
                  </td>
                  {candidates.map((cand) => {
                    const match = cand.matchInfo;
                    return (
                      <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                        {match.hasScore ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '999px',
                                  background:
                                    match.score >= 80
                                      ? '#dcfce7'
                                      : match.score >= 60
                                      ? '#eff6ff'
                                      : match.score >= 40
                                      ? '#fefce8'
                                      : '#f1f5f9',
                                  color:
                                    match.score >= 80
                                      ? '#15803d'
                                      : match.score >= 60
                                      ? '#1d4ed8'
                                      : match.score >= 40
                                      ? '#a16207'
                                      : '#475569',
                                  border: `1px solid ${
                                    match.score >= 80
                                      ? '#86efac'
                                      : match.score >= 60
                                      ? '#bfdbfe'
                                      : '#e2e8f0'
                                  }`,
                                }}
                              >
                                <Sparkles size={13} />
                                <span>{match.score}% Match</span>
                              </span>

                              {match.isBaseline && (
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                                  (Baseline Drive)
                                </span>
                              )}

                              {cand.applicationId === topMatchScoreAppId && candidates.length > 1 && (
                                <span
                                  style={{
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    fontSize: '0.675rem',
                                    fontWeight: 700,
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    border: '1px solid #a7f3d0',
                                  }}
                                >
                                  🏆 Best Match
                                </span>
                              )}
                            </div>

                            {match.explanation && (
                              <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.35rem' }}>
                                {match.explanation}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                            Score unavailable / Not evaluated
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 5: Matched Required Skills */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                    Matched Required Skills
                  </td>
                  {candidates.map((cand) => {
                    const match = cand.matchInfo;
                    if (match.isBaseline) {
                      return (
                        <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem' }}>
                          No required skills filter (Baseline)
                        </td>
                      );
                    }
                    return (
                      <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {match.matchedSkills && match.matchedSkills.length > 0 ? (
                            match.matchedSkills.map((sk, i) => (
                              <span
                                key={i}
                                style={{
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  fontSize: '0.725rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  border: '1px solid #86efac',
                                }}
                              >
                                ✓ {sk}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              None matched
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Row 6: Missing Required Skills */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                    Missing Required Skills
                  </td>
                  {candidates.map((cand) => {
                    const match = cand.matchInfo;
                    if (match.isBaseline) {
                      return (
                        <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0', color: '#16a34a', fontSize: '0.75rem', fontWeight: 600 }}>
                          ✓ None missing
                        </td>
                      );
                    }
                    return (
                      <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {match.missingSkills && match.missingSkills.length > 0 ? (
                            match.missingSkills.map((sk, i) => (
                              <span
                                key={i}
                                style={{
                                  background: '#fef2f2',
                                  color: '#b91c1c',
                                  fontSize: '0.725rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  border: '1px solid #fecaca',
                                }}
                              >
                                ✕ {sk}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                              ✓ All requirements satisfied!
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Row 7: All Stated Skills */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                    Candidate's Stated Skills
                  </td>
                  {candidates.map((cand) => (
                    <td key={cand.applicationId} style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {cand.skills && cand.skills.length > 0 ? (
                          cand.skills.map((sk, i) => (
                            <span
                              key={i}
                              style={{
                                background: '#f8fafc',
                                color: '#475569',
                                fontSize: '0.725rem',
                                fontWeight: 500,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No technical skills specified
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 8: Resume & Quick Actions */}
                <tr style={{ background: '#f8fafc' }}>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                    Quick Actions
                  </td>
                  {candidates.map((cand) => (
                    <td key={cand.applicationId} style={{ padding: '1rem', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => onSelectForEval(cand.rawApp)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            width: '100%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          <Eye size={12} />
                          <span>Full Evaluation</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectForStatus(cand.rawApp)}
                          className="btn btn-primary btn-sm"
                          style={{
                            width: '100%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          <Edit3 size={12} />
                          <span>Update Status</span>
                        </button>

                        {cand.hasUploadedResume && cand.isPdf && onPreviewResume && (
                          <button
                            type="button"
                            onClick={() => onPreviewResume(cand.rawStudent)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              width: '100%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              fontSize: '0.75rem',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              borderColor: '#bfdbfe',
                            }}
                          >
                            <FileText size={12} />
                            <span>Preview Resume</span>
                          </button>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {count < maxLimit ? (
              <span>
                You can select up to <strong>{maxLimit - count}</strong> more candidate
                {maxLimit - count > 1 ? 's' : ''} from the roster to compare side-by-side.
              </span>
            ) : (
              <span>Maximum capacity of 4 candidates reached.</span>
            )}
          </div>

          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close Comparison
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CandidateComparisonModal;
