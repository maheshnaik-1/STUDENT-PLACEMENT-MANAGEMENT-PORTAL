import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const STATUS_OPTIONS = [
  { value: 'Applied', label: 'Applied (Initial Submission)' },
  { value: 'Shortlisted', label: 'Shortlisted for Assessment' },
  { value: 'Technical Round', label: 'In Technical Interview Round' },
  { value: 'Interview', label: 'In Managerial / HR Round' },
  { value: 'Selected', label: 'Selected / Offer Extended' },
  { value: 'Rejected', label: 'Rejected / Not Selected' },
];

const StatusUpdateModal = ({
  isOpen,
  onClose,
  application,
  onSubmit,
  isSubmitting = false,
}) => {
  const [status, setStatus] = useState('Applied');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (application) {
      setStatus(application.status || 'Applied');
      setRemarks(application.remarks || '');
    }
  }, [application, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ status, remarks });
  };

  if (!application) return null;

  const student = application.student || {};
  const drive = application.drive || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Student Selection Status"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit}>
        {/* Student Mini Profile Summary */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
            {student.name}
          </div>
          <div style={{ color: '#64748b', marginTop: '0.2rem' }}>
            Roll No: <strong>{student.rollNo || 'N/A'}</strong> • Branch:{' '}
            <strong>{student.branch}</strong> • CGPA: <strong>{student.cgpa}</strong>
          </div>
          <div style={{ color: '#475569', marginTop: '0.35rem' }}>
            Drive: <strong>{drive.title || 'Placement Drive'}</strong>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Recruitment Status *</label>
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
          <label className="form-label">Officer Remarks & Candidate Feedback</label>
          <textarea
            rows={3}
            className="form-control"
            placeholder="e.g. Cleared technical interview with positive feedback; package offer released."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <div className="form-help">
            This status and remark will be immediately visible to the student on their portal.
          </div>
        </div>

        <div
          className="modal-footer"
          style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Save Status'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StatusUpdateModal;
