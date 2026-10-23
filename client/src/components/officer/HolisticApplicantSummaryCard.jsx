import React, { useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Info,
  Check,
  FileText,
  Award,
  FolderGit2,
} from 'lucide-react';
import {
  generateApplicantSummary,
  ADVISORY_DISCLAIMER,
  ADVISORY_NOTE,
} from '../../utils/applicantSummary';

/**
 * HolisticApplicantSummaryCard
 *
 * Consolidated executive assessment card for Placement Officers.
 * Integrates:
 * A. Academic Gateway (Prerequisite criteria)
 * B. Technical Alignment (Deterministic skill match & gaps)
 * C. Profile Readiness (Informational documentation thoroughness)
 * D. Standout Strengths & Attention Points (Objective observations)
 * E. Advisory Disclaimer (Strictly non-automating)
 */
const HolisticApplicantSummaryCard = ({
  student,
  drive,
  eligibility,
  matchScore,
  completeness,
  completenessTier,
  summary: precomputedSummary,
}) => {
  const summary = useMemo(() => {
    if (precomputedSummary) return precomputedSummary;
    return generateApplicantSummary({
      student,
      drive,
      eligibility,
      matchScore,
      completeness,
      completenessTier,
    });
  }, [
    precomputedSummary,
    student,
    drive,
    eligibility,
    matchScore,
    completeness,
    completenessTier,
  ]);

  const {
    academicGateway,
    technicalAlignment,
    profileReadiness,
    standoutStrengths = [],
    attentionPoints = [],
    disclaimer = ADVISORY_DISCLAIMER,
    advisoryNote = ADVISORY_NOTE,
  } = summary || {};

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles size={18} color="#60a5fa" />
          <h4
            style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 800,
              letterSpacing: '0.3px',
              color: '#f8fafc',
            }}
          >
            Holistic Applicant Assessment
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            Advisory Summary
          </span>
        </div>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* 2. Three Pillars Assessment Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {/* Pillar A: Academic Gateway */}
          <div
            style={{
              background: academicGateway?.badgeBg || '#f8fafc',
              border: `1px solid ${academicGateway?.badgeBorder || '#e2e8f0'}`,
              borderRadius: '10px',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.4rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#475569',
                  }}
                >
                  Academic Gateway
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: '#ffffff',
                    color: academicGateway?.badgeColor || '#0f172a',
                    border: `1px solid ${academicGateway?.badgeBorder || '#cbd5e1'}`,
                  }}
                >
                  {academicGateway?.isEligible ? (
                    <ShieldCheck size={13} color="#15803d" />
                  ) : (
                    <ShieldAlert size={13} color="#b91c1c" />
                  )}
                  <span>{academicGateway?.statusLabel || 'EVALUATED'}</span>
                </span>
              </div>

              <p
                style={{
                  fontSize: '0.8rem',
                  lineHeight: '1.35',
                  color: '#1e293b',
                  margin: '0.35rem 0 0',
                  fontWeight: 500,
                }}
              >
                {academicGateway?.summary}
              </p>
            </div>

            <div
              style={{
                fontSize: '0.7rem',
                color: '#64748b',
                fontStyle: 'italic',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                paddingTop: '0.4rem',
              }}
            >
              {academicGateway?.separationNote}
            </div>
          </div>

          {/* Pillar B: Technical Alignment */}
          <div
            style={{
              background: technicalAlignment?.tierBg || '#f8fafc',
              border: `1px solid ${technicalAlignment?.tierBorder || '#e2e8f0'}`,
              borderRadius: '10px',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.4rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#475569',
                  }}
                >
                  Technical Alignment
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: '#ffffff',
                    color: technicalAlignment?.tierColor || '#0f172a',
                    border: `1px solid ${technicalAlignment?.tierBorder || '#cbd5e1'}`,
                  }}
                >
                  <Sparkles size={13} />
                  <span>
                    {technicalAlignment?.isBaseline
                      ? 'Baseline Drive'
                      : technicalAlignment?.scoreDisplay || 'Unavailable'}
                  </span>
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: technicalAlignment?.tierColor || '#1e293b',
                  marginBottom: '0.2rem',
                }}
              >
                {technicalAlignment?.alignmentTier}
              </div>

              <p
                style={{
                  fontSize: '0.8rem',
                  lineHeight: '1.35',
                  color: '#334155',
                  margin: 0,
                }}
              >
                {technicalAlignment?.summaryText}
              </p>
            </div>

            <div
              style={{
                fontSize: '0.7rem',
                color: '#64748b',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                paddingTop: '0.4rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                Matched: <strong>{technicalAlignment?.matchedCount || 0}</strong>
              </span>
              <span>
                Missing: <strong>{technicalAlignment?.missingCount || 0}</strong>
              </span>
              <span>
                Required: <strong>{technicalAlignment?.totalRequired || 0}</strong>
              </span>
            </div>
          </div>

          {/* Pillar C: Profile Readiness */}
          <div
            style={{
              background: profileReadiness?.tierBg || '#f8fafc',
              border: `1px solid #cbd5e1`,
              borderRadius: '10px',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.4rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#475569',
                  }}
                >
                  Profile Readiness
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: '#ffffff',
                    color: profileReadiness?.tierColor || '#0f172a',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <TrendingUp size={13} />
                  <span>{profileReadiness?.percentage || 0}%</span>
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: profileReadiness?.tierColor || '#1e293b',
                  marginBottom: '0.2rem',
                }}
              >
                {profileReadiness?.tierLabel}
              </div>

              <p
                style={{
                  fontSize: '0.8rem',
                  lineHeight: '1.35',
                  color: '#334155',
                  margin: 0,
                }}
              >
                {profileReadiness?.summaryText}
              </p>
            </div>

            <div
              style={{
                fontSize: '0.7rem',
                color: '#64748b',
                fontStyle: 'italic',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                paddingTop: '0.4rem',
              }}
            >
              {profileReadiness?.readinessDisclaimer}
            </div>
          </div>
        </div>

        {/* 3. Standout Strengths & Attention Points */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {/* Standout Strengths */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#15803d',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <CheckCircle2 size={14} color="#16a34a" />
              <span>Standout Strengths & Credentials</span>
            </div>

            <ul
              style={{
                margin: 0,
                paddingLeft: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                fontSize: '0.785rem',
                color: '#334155',
              }}
            >
              {standoutStrengths.map((str, i) => (
                <li key={i} style={{ lineHeight: '1.35' }}>
                  {str}
                </li>
              ))}
            </ul>
          </div>

          {/* Attention Points */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#b45309',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <AlertCircle size={14} color="#d97706" />
              <span>Attention Points & Verification Gaps</span>
            </div>

            <ul
              style={{
                margin: 0,
                paddingLeft: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                fontSize: '0.785rem',
                color: '#334155',
              }}
            >
              {attentionPoints.map((pt, i) => (
                <li key={i} style={{ lineHeight: '1.35' }}>
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 4. Advisory Disclaimer Footer */}
        <div
          style={{
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <Info size={16} color="#475569" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.4' }}>
            <strong style={{ color: '#0f172a' }}>{disclaimer}</strong> {advisoryNote}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolisticApplicantSummaryCard;
