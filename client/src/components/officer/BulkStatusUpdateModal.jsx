import React, { useState } from 'react';
import Modal from '../common/Modal';
import { AlertCircle, AlertTriangle, Edit3, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'Applied', label: 'Applied (Initial Submission)' },
  { value: 'Shortlisted', label: 'Shortlisted for Assessment' },
  { value: 'Technical Round', label: 'In Technical Interview Round' },
  { value: 'Interview', label: 'In Managerial / HR Round' },
  { value: 'Selected', label: 'Selected / Offer Extended' },
  { value: 'Rejected', label: 'Rejected / Not Selected' },
];

/**
 * BulkStatusUpdateModal (V4.0 Phase 2 Step 4)
 *
 * Implements bulk status update with terminal-state protection.
 * Automatically skips applications whose current status is 'Selected' or 'Rejected',
 * providing clear warnings and preventing accidental terminal state overwrites.
 */
const BulkStatusUpdateModal = ({
  isOpen,
  onClose,
  selectedCount = 0,
  selectedApplications = [],
  drive,
  onSubmit,
  isSubmitting = false,
}) => {
  const [status, setStatus] = useState('Shortlisted');
  const [remarks, setRemarks] = useState('');

  // Terminal-State Protection Computations
  const terminalApps = (selectedApplications || []).filter((a) =>
    ['Selected', 'Rejected'].includes(a?.status)
  );
  const updatableApps = (selectedApplications || []).filter(
    (a) => !['Selected', 'Rejected'].includes(a?.status)
  );

  const hasTerminal = terminalApps.length > 0;
  const allTerminal = hasTerminal && updatableApps.length === 0;

  const selectedCountDisplay = selectedCount || selectedApplications.length;
  const updatableCount =
    selectedApplications.length > 0 ? updatableApps.length : selectedCountDisplay;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (allTerminal || updatableCount === 0) return;
    onSubmit({ status, remarks });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Status Update"
      maxWidth="560px"
      zIndex={200}
    >
      <form onSubmit={handleSubmit}>
        {/* Drive & Selected Count Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.4rem',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#1d4ed8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Target Placement Drive
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                background: allTerminal ? '#dc2626' : hasTerminal ? '#d97706' : '#2563eb',
                color: '#ffffff',
              }}
            >
              {hasTerminal
                ? `${updatableCount} of ${selectedCountDisplay} Updatable`
                : `${selectedCountDisplay} Applicant${selectedCountDisplay > 1 ? 's' : ''} Selected`}
            </span>
          </div>

          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
            {drive?.company?.name || 'Company'} — {drive?.title || 'Placement Drive'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
            Package: <strong style={{ color: '#059669' }}>{drive?.packageCTC || 'Competitive'}</strong>
          </div>
        </div>

        {/* Terminal-State Protection Warning Banner */}
        {hasTerminal && (
          <div
            style={{
              background: allTerminal ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${allTerminal ? '#fecaca' : '#fef3c7'}`,
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.825rem',
              color: allTerminal ? '#991b1b' : '#92400e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertTriangle
              size={18}
              color={allTerminal ? '#dc2626' : '#d97706'}
              style={{ flexShrink: 0, marginTop: '2px' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                {allTerminal
                  ? 'All Selected Candidates in Terminal Status (Protected)'
                  : `Terminal-State Protection Active (${terminalApps.length} candidate${terminalApps.length > 1 ? 's' : ''} protected)`}
              </div>
              <div>
                <strong>{terminalApps.length}</strong> of <strong>{selectedCountDisplay}</strong> selected candidate
                {selectedCountDisplay > 1 ? 's are' : ' is'} in a final terminal status (
                {terminalApps.filter((a) => a.status === 'Selected').length > 0 &&
                  `${terminalApps.filter((a) => a.status === 'Selected').length} Selected`}
                {terminalApps.filter((a) => a.status === 'Selected').length > 0 &&
                  terminalApps.filter((a) => a.status === 'Rejected').length > 0 &&
                  ', '}
                {terminalApps.filter((a) => a.status === 'Rejected').length > 0 &&
                  `${terminalApps.filter((a) => a.status === 'Rejected').length} Rejected`}
                ). Terminal statuses are protected from bulk operations to prevent accidental status overwrites.
              </div>
              {allTerminal ? (
                <div style={{ marginTop: '0.4rem', fontWeight: 600 }}>
                  No applications in this batch can be modified. To update a terminal candidate, please update them individually from the applicant roster.
                </div>
              ) : (
                <div style={{ marginTop: '0.4rem', color: '#78350f' }}>
                  Only the remaining <strong>{updatableCount}</strong> active candidate{updatableCount > 1 ? 's' : ''} will be updated to <strong>'{status}'</strong>.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selection Form Controls */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700 }}>
            New Recruitment Status *
          </label>
          <select
            className="form-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={allTerminal}
            required
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700 }}>
            Batch Feedback & Remarks (Optional)
          </label>
          <textarea
            rows={3}
            className="form-control"
            placeholder="e.g. Cleared Online Assessment with high score; scheduled for Technical Round."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={allTerminal}
          />
          <div className="form-help">
            This status and feedback will be recorded in each eligible student's application history and will trigger notifications.
          </div>
        </div>

        {/* Action Confirmation Alert Box */}
        {!allTerminal && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: '#334155',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={16} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Action Confirmation:</strong> You are about to update{' '}
              <strong>{updatableCount}</strong> active candidate application{updatableCount > 1 ? 's' : ''} to{' '}
              <strong>'{status}'</strong>. Each updated student will receive an in-portal notification.
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{ margin: '1.25rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              isSubmitting ||
              selectedCountDisplay === 0 ||
              allTerminal ||
              updatableCount === 0
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: allTerminal ? '#94a3b8' : undefined,
              borderColor: allTerminal ? '#94a3b8' : undefined,
              cursor: allTerminal ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Updating {updatableCount} Applicants...</span>
              </>
            ) : allTerminal ? (
              <span>Cannot Update (All Terminal)</span>
            ) : hasTerminal ? (
              <>
                <Edit3 size={15} />
                <span>
                  Apply to {updatableCount} Active ({terminalApps.length} Skipped)
                </span>
              </>
            ) : (
              <>
                <Edit3 size={15} />
                <span>Apply Status ({selectedCountDisplay})</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkStatusUpdateModal;
