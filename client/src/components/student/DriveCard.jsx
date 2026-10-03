import React from 'react';
import { Link } from 'react-router-dom';
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

  const isEligible = drive.isEligible !== false;
  const reasons = drive.eligibilityReasons || [];
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
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  border: '1px solid #e2e8f0',
                }}
              />
            ) : (
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                {company.name ? company.name.substring(0, 2).toUpperCase() : 'CO'}
              </div>
            )}
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
                gap: '0.4rem',
                background: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 600,
              }}
            >
              <FileCheck size={16} color="#2563eb" />
              <span>Applied • Current Status: <strong>{drive.myApplicationStatus || 'Applied'}</strong></span>
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
