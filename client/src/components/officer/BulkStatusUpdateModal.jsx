import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Users, Layers, AlertCircle, Edit3, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'Applied', label: 'Applied (Initial Submission)' },
  { value: 'Shortlisted', label: 'Shortlisted for Assessment' },
  { value: 'Technical Round', label: 'In Technical Interview Round' },
  { value: 'Interview', label: 'In Managerial / HR Round' },
  { value: 'Selected', label: 'Selected / Offer Extended' },
  { value: 'Rejected', label: 'Rejected / Not Selected' },
];

const BulkStatusUpdateModal = ({
  isOpen,
  onClose,
  selectedCount = 0,
  drive,
  onSubmit,
  isSubmitting = false,
}) => {
  const [status, setStatus] = useState('Shortlisted');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ status, remarks });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Status Update"
      maxWidth="540px"
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
                background: '#2563eb',
                color: '#ffffff',
              }}
            >
              {selectedCount} Applicant{selectedCount > 1 ? 's' : ''} Selected
            </span>
          </div>

          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
            {drive?.company?.name || 'Company'} — {drive?.title || 'Placement Drive'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
            Package: <strong style={{ color: '#059669' }}>{drive?.packageCTC || 'Competitive'}</strong>
          </div>
        </div>

        {/* Selection Form Controls */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700 }}>
            New Recruitment Status *
          </label>
          <select
            className="form-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
          />
          <div className="form-help">
            This status and feedback will be recorded in each selected student's application history and will trigger notifications.
          </div>
        </div>

        {/* Confirmation Alert Box */}
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Action Confirmation:</strong> You are about to update{' '}
            <strong>{selectedCount}</strong> candidate application{selectedCount > 1 ? 's' : ''} to{' '}
            <strong>'{status}'</strong>. Each student will receive an in-portal notification.
          </div>
        </div>

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
            disabled={isSubmitting || selectedCount === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Updating {selectedCount} Applicants...</span>
              </>
            ) : (
              <>
                <Edit3 size={15} />
                <span>Apply Status ({selectedCount})</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkStatusUpdateModal;
