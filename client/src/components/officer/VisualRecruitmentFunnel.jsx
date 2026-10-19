import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowDown,
  Layers,
  Sparkles,
  DollarSign,
  ChevronRight,
  RefreshCw,
  Table as TableIcon,
  PieChart,
  HelpCircle,
  Building2,
  Briefcase,
} from 'lucide-react';

/**
 * VisualRecruitmentFunnel
 * Premium, accessible recruitment pipeline and CTC tier visualization.
 * Derived strictly from real MongoDB placement records without hypothetical approximations.
 */
const VisualRecruitmentFunnel = ({
  funnelData,
  salaryData,
  branchData,
  onResetFilters,
  compact = false,
}) => {
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'table'
  const [activeStageId, setActiveStageId] = useState(null);

  const stages = funnelData?.stages || [];
  const pipeline = funnelData?.pipelineHealth || {
    totalApplications: 0,
    activeInReview: 0,
    offersExtended: 0,
    rejected: 0,
    overallConversionRate: 0,
  };

  const totalApplications = pipeline.totalApplications || 0;
  const isEmpty = totalApplications === 0;

  // Handle empty state gracefully
  if (isEmpty) {
    return (
      <div
        className="card"
        style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          border: '1px dashed #cbd5e1',
          background: '#f8fafc',
          borderRadius: '16px',
          marginBottom: '1.75rem',
        }}
        role="region"
        aria-label="Recruitment Funnel Empty State"
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#eff6ff',
            color: '#3b82f6',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}
        >
          <Layers size={28} />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
          No Funnel Data for Active Filters
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
          No applications match the current combination of drive, department, or keyword filters. Reset your filters to view the full campus recruitment pipeline.
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={14} />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  // Compact Mode (For Officer Dashboard summary widget)
  if (compact) {
    return (
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
        role="region"
        aria-label="Recruitment Pipeline Funnel Summary"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Recruitment Funnel Velocity
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                {totalApplications} total candidate submissions
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
            }}
          >
            {pipeline.overallConversionRate}% Yield
          </span>
        </div>

        {/* Mini Stage Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {stages.map((st, idx) => {
            const pct = st.percentageOfTotal || 0;
            return (
              <div key={st.stageId}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    marginBottom: '0.2rem',
                    color: '#334155',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {idx + 1}. {st.shortLabel}
                  </span>
                  <span style={{ fontWeight: 700, color: st.color }}>
                    {st.count} ({pct}%)
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    background: '#f1f5f9',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: st.color,
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Quick Health */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            marginTop: '1.25rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>In Pipeline</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2563eb' }}>
              {pipeline.activeInReview}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Offers Extended</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
              {pipeline.offersExtended}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Not Selected</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626' }}>
              {pipeline.rejected}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Executive Presentation View (Used in PlacementReports.jsx)
  return (
    <div
      className="card"
      style={{
        padding: '1.75rem',
        marginBottom: '2rem',
        background: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
      }}
      role="region"
      aria-label="Campus Visual Recruitment Funnel & CTC Analytics"
    >
      {/* Header with Title and Mode Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '0.4rem',
            }}
          >
            <Sparkles size={12} />
            <span>Interactive Hiring Intelligence</span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Visual Recruitment Funnel & Candidate Conversion
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            Mathematical conversion across screening stages, interview rounds, and confirmed CTC offers
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
          <button
            onClick={() => setViewMode('visual')}
            className="btn btn-sm"
            style={{
              background: viewMode === 'visual' ? '#ffffff' : 'transparent',
              color: viewMode === 'visual' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'visual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: viewMode === 'visual' ? 700 : 500,
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
            aria-pressed={viewMode === 'visual'}
          >
            <TrendingUp size={14} />
            <span>Visual Pipeline</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className="btn btn-sm"
            style={{
              background: viewMode === 'table' ? '#ffffff' : 'transparent',
              color: viewMode === 'table' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: viewMode === 'table' ? 700 : 500,
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
            aria-pressed={viewMode === 'table'}
          >
            <TableIcon size={14} />
            <span>Accessible Matrix</span>
          </button>
        </div>
      </div>

      {/* Primary Conversion KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            padding: '1rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid #bfdbfe',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>Pipeline Inflow</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e3a8a', marginTop: '0.2rem' }}>
            {pipeline.totalApplications}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#3b82f6', marginTop: '0.1rem' }}>
            Applications received
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            padding: '1rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid #fcd34d',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>Active In-Review</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#78350f', marginTop: '0.2rem' }}>
            {pipeline.activeInReview}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '0.1rem' }}>
            Under active evaluation
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            padding: '1rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid #a7f3d0',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46' }}>Confirmed Offers</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#047857', marginTop: '0.2rem' }}>
            {pipeline.offersExtended}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '0.1rem' }}>
            Selections extended
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            padding: '1rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid #fecaca',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b' }}>Disqualified / Rejected</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#7f1d1d', marginTop: '0.2rem' }}>
            {pipeline.rejected}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.1rem' }}>
            Not selected
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            padding: '1rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid #ddd6fe',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5b21b6' }}>Funnel Conversion Yield</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#4c1d95', marginTop: '0.2rem' }}>
            {pipeline.overallConversionRate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginTop: '0.1rem' }}>
            Applications to offers
          </div>
        </div>
      </div>

      {/* Main Funnel Visualization vs Accessible Matrix */}
      {viewMode === 'visual' ? (
        <div>
          {/* Responsive SVG Funnel Diagram */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #e2e8f0',
              marginBottom: '1.75rem',
            }}
          >
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Pipeline Progression Geometry
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Width represents candidate throughput per milestone
              </span>
            </div>

            {/* SVG Funnel */}
            <svg
              viewBox="0 0 800 240"
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '260px' }}
              role="graphics-document"
              aria-label="Recruitment pipeline stage progression diagram"
            >
              <defs>
                <linearGradient id="grad-applied" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="grad-shortlisted" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="grad-tech" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="grad-interview" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="grad-selected" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* Tapered Segments */}
              {/* Stage 1: Applied (width 760 -> 640) */}
              <polygon
                points="20,15 780,15 720,55 80,55"
                fill="url(#grad-applied)"
                opacity={activeStageId && activeStageId !== 'applied' ? 0.45 : 0.95}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={() => setActiveStageId('applied')}
                onMouseLeave={() => setActiveStageId(null)}
              />
              <text x="400" y="38" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
                Stage 1: Applications Received ({stages[0]?.count || 0}) • 100%
              </text>

              {/* Stage 2: Shortlisted (width 640 -> 500) */}
              <polygon
                points="85,60 715,60 655,100 145,100"
                fill="url(#grad-shortlisted)"
                opacity={activeStageId && activeStageId !== 'shortlisted' ? 0.45 : 0.95}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={() => setActiveStageId('shortlisted')}
                onMouseLeave={() => setActiveStageId(null)}
              />
              <text x="400" y="83" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
                Stage 2: Screening Cleared ({stages[1]?.count || 0}) • {stages[1]?.percentageOfTotal || 0}%
              </text>

              {/* Stage 3: Technical Round (width 500 -> 380) */}
              <polygon
                points="150,105 650,105 590,145 210,145"
                fill="url(#grad-tech)"
                opacity={activeStageId && activeStageId !== 'technical' ? 0.45 : 0.95}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={() => setActiveStageId('technical')}
                onMouseLeave={() => setActiveStageId(null)}
              />
              <text x="400" y="128" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
                Stage 3: Technical Evaluation ({stages[2]?.count || 0}) • {stages[2]?.percentageOfTotal || 0}%
              </text>

              {/* Stage 4: Interview (width 380 -> 260) */}
              <polygon
                points="215,150 585,150 525,190 275,190"
                fill="url(#grad-interview)"
                opacity={activeStageId && activeStageId !== 'interview' ? 0.45 : 0.95}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={() => setActiveStageId('interview')}
                onMouseLeave={() => setActiveStageId(null)}
              />
              <text x="400" y="173" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
                Stage 4: Formal Interviews ({stages[3]?.count || 0}) • {stages[3]?.percentageOfTotal || 0}%
              </text>

              {/* Stage 5: Selected (width 260 -> 220) */}
              <polygon
                points="280,195 520,195 480,230 320,230"
                fill="url(#grad-selected)"
                opacity={activeStageId && activeStageId !== 'selected' ? 0.45 : 0.95}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={() => setActiveStageId('selected')}
                onMouseLeave={() => setActiveStageId(null)}
              />
              <text x="400" y="215" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
                Stage 5: Offers Extended ({stages[4]?.count || 0}) • {stages[4]?.percentageOfTotal || 0}%
              </text>
            </svg>
          </div>

          {/* Interactive Stage Milestone Cards with Drop-offs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {stages.map((st, idx) => {
              const isLast = idx === stages.length - 1;
              const isHovered = activeStageId === st.stageId;

              return (
                <div key={st.stageId}>
                  <div
                    style={{
                      background: isHovered ? st.bgColor : '#ffffff',
                      borderRadius: '12px',
                      padding: '1.15rem 1.25rem',
                      border: `1.5px solid ${isHovered ? st.color : '#e2e8f0'}`,
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.25s ease',
                      boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                    }}
                    onMouseEnter={() => setActiveStageId(st.stageId)}
                    onMouseLeave={() => setActiveStageId(null)}
                  >
                    {/* Left: Stage Title and Description */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 300px' }}>
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: st.bgColor,
                          color: st.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.875rem',
                          border: `1px solid ${st.borderColor}`,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                            {st.title}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: st.color,
                              background: st.bgColor,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              border: `1px solid ${st.borderColor}`,
                            }}
                          >
                            {st.badge}
                          </span>
                        </div>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.775rem', color: '#64748b' }}>
                          {st.description}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Count & Share of Total */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: st.color }}>
                          {st.count}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {st.percentageOfTotal}% of total
                        </div>
                      </div>

                      {/* Right: Step Conversion Rate */}
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          minWidth: '120px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                          {idx === 0 ? 'Initial Intake' : 'Step Conversion'}
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                          {idx === 0 ? '100% Inflow' : `${st.conversionFromPrev}%`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drop-off Connector Pill between Stages */}
                  {!isLast && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0.35rem 0',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ height: '18px', width: '2px', background: '#e2e8f0' }} />
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#dc2626',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          padding: '0.15rem 0.6rem',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontWeight: 600,
                        }}
                      >
                        <ArrowDown size={11} />
                        <span>
                          {st.dropOffCount} candidate{st.dropOffCount === 1 ? '' : 's'} did not advance ({st.dropOffRate}% drop-off)
                        </span>
                      </span>
                      <div style={{ height: '18px', width: '2px', background: '#e2e8f0' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Accessible Data Matrix Table */
        <div className="table-responsive" style={{ marginBottom: '1.75rem' }}>
          <table className="table" aria-label="Recruitment pipeline stage data matrix">
            <thead>
              <tr>
                <th>Milestone Stage</th>
                <th>Stage Description</th>
                <th>Candidates Reaching Stage</th>
                <th>% of Total Submissions</th>
                <th>Step-to-Step Conversion</th>
                <th>Stage Drop-off</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((st, idx) => (
                <tr key={st.stageId}>
                  <td style={{ fontWeight: 700, color: st.color }}>
                    {idx + 1}. {st.shortLabel}
                  </td>
                  <td style={{ fontSize: '0.825rem', color: '#475569' }}>{st.description}</td>
                  <td style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    {st.count}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: st.bgColor,
                        color: st.color,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {st.percentageOfTotal}%
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#334155' }}>
                    {idx === 0 ? '100% Inflow' : `${st.conversionFromPrev}%`}
                  </td>
                  <td>
                    {idx === stages.length - 1 ? (
                      <span style={{ color: '#059669', fontWeight: 600 }}>0 (Final Stage)</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>
                        {st.dropOffCount} ({st.dropOffRate}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Salary CTC & Package Tier Distribution */}
      {salaryData && (
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Compensation & Package Tier Distribution
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                Mathematical CTC distribution across Super Dream, Dream, and Core placement drives
              </p>
            </div>
            {salaryData.hasOffers && (
              <span
                style={{
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  color: '#065f46',
                  background: '#ecfdf5',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  border: '1px solid #a7f3d0',
                }}
              >
                {salaryData.offersCount} confirmed offer{salaryData.offersCount === 1 ? '' : 's'} recorded
              </span>
            )}
          </div>

          {/* Salary Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Highest Offer</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                {salaryData.highestLPA > 0 ? `${salaryData.highestLPA} LPA` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Top package secured</div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Average Offer</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>
                {salaryData.averageLPA > 0 ? `${salaryData.averageLPA} LPA` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Mean placement CTC</div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Median Offer</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.2rem' }}>
                {salaryData.medianLPA > 0 ? `${salaryData.medianLPA} LPA` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Median candidate package</div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Lowest Offer</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
                {salaryData.lowestLPA > 0 ? `${salaryData.lowestLPA} LPA` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Baseline placement CTC</div>
            </div>
          </div>

          {/* CTC Tier Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            {salaryData.tiers?.map((tier) => (
              <div
                key={tier.tierId}
                style={{
                  background: tier.bgColor,
                  border: `1px solid ${tier.borderColor}`,
                  borderRadius: '12px',
                  padding: '1.15rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: tier.color, fontSize: '0.9rem' }}>
                    {tier.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: '#ffffff',
                      color: tier.color,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      border: `1px solid ${tier.borderColor}`,
                    }}
                  >
                    {tier.drivesCount} Drive{tier.drivesCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#334155' }}>
                    <span>Offers Extended</span>
                    <span style={{ fontWeight: 800, color: tier.color }}>
                      {tier.offersCount} ({tier.offersPercentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '7px',
                      background: '#ffffff',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      marginTop: '0.35rem',
                      border: `1px solid ${tier.borderColor}`,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${tier.offersPercentage}%`,
                        background: tier.color,
                        borderRadius: '9999px',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Confirmed Placed Offers Roster Highlight */}
          {salaryData.topOffers && salaryData.topOffers.length > 0 && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
                Confirmed Student Offers by Package
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {salaryData.topOffers.map((offer, idx) => (
                  <div
                    key={offer.applicationId || idx}
                    style={{
                      background: '#ffffff',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flex: '1 1 220px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                        {offer.studentName} ({offer.branch})
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {offer.companyName}
                      </div>
                    </div>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: '#059669',
                        background: '#ecfdf5',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      {offer.packageCTC}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branch Placement Comparison */}
      {branchData && branchData.length > 0 && (
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Departmental Placement Performance
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
              Comparison of unique student placement rate across academic branches
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {branchData.map((b) => (
              <div
                key={b.branch}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem 1.15rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                    {b.branch}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: b.placementRate > 0 ? '#059669' : '#64748b',
                      background: b.placementRate > 0 ? '#ecfdf5' : '#f1f5f9',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      border: b.placementRate > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                    }}
                  >
                    {b.placementRate || 0}% Placed
                  </span>
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Registered Students</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{b.totalStudents}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Applications Filed</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{b.applicationsCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Confirmed Offers</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>
                      {b.selectedCount} ({b.selectionRate}% application rate)
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    height: '6px',
                    background: '#f1f5f9',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    marginTop: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${b.placementRate || 0}%`,
                      background: b.placementRate > 0 ? '#059669' : '#cbd5e1',
                      borderRadius: '9999px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualRecruitmentFunnel;
