import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const ALL_BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'];

const DriveFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  companies = [],
  initialData = null,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    company: '',
    title: '',
    jobRole: '',
    packageCTC: '',
    location: '',
    minCGPA: 6.5,
    allowedBranches: ['CSE', 'IT'],
    maxBacklogs: 0,
    passingYear: 2026,
    driveDate: '',
    deadline: '',
    status: 'Upcoming',
    roundsText: 'Online Assessment, Technical Interview, HR Interview',
    jobDescription: '',
  });

  useEffect(() => {
    if (initialData) {
      const eligibility = initialData.eligibility || {};
      setFormData({
        company: initialData.company?._id || initialData.company || '',
        title: initialData.title || '',
        jobRole: initialData.jobRole || '',
        packageCTC: initialData.packageCTC || '',
        location: initialData.location || '',
        minCGPA: eligibility.minCGPA ?? 6.5,
        allowedBranches: eligibility.allowedBranches || ['CSE', 'IT'],
        maxBacklogs: eligibility.maxBacklogs ?? 0,
        passingYear: eligibility.passingYear || 2026,
        driveDate: initialData.driveDate
          ? new Date(initialData.driveDate).toISOString().split('T')[0]
          : '',
        deadline: initialData.deadline
          ? new Date(initialData.deadline).toISOString().split('T')[0]
          : '',
        status: initialData.status || 'Upcoming',
        roundsText: initialData.rounds ? initialData.rounds.join(', ') : '',
        jobDescription: initialData.jobDescription || '',
      });
    } else {
      setFormData({
        company: companies[0]?._id || '',
        title: '',
        jobRole: '',
        packageCTC: '',
        location: '',
        minCGPA: 6.5,
        allowedBranches: ['CSE', 'IT'],
        maxBacklogs: 0,
        passingYear: 2026,
        driveDate: '',
        deadline: '',
        status: 'Upcoming',
        roundsText: 'Online Assessment, Technical Interview, HR Interview',
        jobDescription: '',
      });
    }
  }, [initialData, companies, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBranchToggle = (branch) => {
    setFormData((prev) => {
      const exists = prev.allowedBranches.includes(branch);
      return {
        ...prev,
        allowedBranches: exists
          ? prev.allowedBranches.filter((b) => b !== branch)
          : [...prev.allowedBranches, branch],
      };
    });
  };

  const handleSelectAllBranches = () => {
    setFormData((prev) => ({
      ...prev,
      allowedBranches: [...ALL_BRANCHES],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.allowedBranches.length === 0) {
      alert('Please select at least one eligible branch.');
      return;
    }

    const payload = {
      company: formData.company,
      title: formData.title,
      jobRole: formData.jobRole,
      packageCTC: formData.packageCTC,
      location: formData.location,
      eligibility: {
        minCGPA: Number(formData.minCGPA),
        allowedBranches: formData.allowedBranches,
        maxBacklogs: Number(formData.maxBacklogs),
        passingYear: Number(formData.passingYear),
      },
      driveDate: new Date(formData.driveDate),
      deadline: new Date(formData.deadline),
      status: formData.status,
      rounds: formData.roundsText
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      jobDescription: formData.jobDescription,
    };

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Placement Drive' : 'Create New Placement Drive'}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Recruiting Company *</label>
            <select
              name="company"
              required
              className="form-control"
              value={formData.company}
              onChange={handleChange}
            >
              <option value="" disabled>
                -- Select Company --
              </option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.industry})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Drive Headline / Title *</label>
            <input
              type="text"
              name="title"
              required
              className="form-control"
              placeholder="e.g. SDE-1 Campus Drive 2026"
              value={formData.title}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Job Designation / Role *</label>
            <input
              type="text"
              name="jobRole"
              required
              className="form-control"
              placeholder="e.g. Software Development Engineer"
              value={formData.jobRole}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Package (CTC) *</label>
            <input
              type="text"
              name="packageCTC"
              required
              className="form-control"
              placeholder="e.g. 14 LPA"
              value={formData.packageCTC}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Work Location *</label>
            <input
              type="text"
              name="location"
              required
              className="form-control"
              placeholder="e.g. Bangalore / Remote"
              value={formData.location}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Drive Status</label>
            <select
              name="status"
              className="form-control"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing (Open for Apply)</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Eligibility Fieldset */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.875rem',
              color: '#1e293b',
              marginBottom: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Eligibility Criteria Settings</span>
            <button
              type="button"
              onClick={handleSelectAllBranches}
              style={{
                fontSize: '0.75rem',
                color: '#2563eb',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Select All Branches
            </button>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Min CGPA Required</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                name="minCGPA"
                required
                className="form-control"
                value={formData.minCGPA}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Max Active Backlogs</label>
              <input
                type="number"
                min="0"
                name="maxBacklogs"
                required
                className="form-control"
                value={formData.maxBacklogs}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Target Batch Passing Year</label>
              <input
                type="number"
                name="passingYear"
                required
                className="form-control"
                value={formData.passingYear}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Eligible Engineering Branches *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {ALL_BRANCHES.map((b) => {
                const isSelected = formData.allowedBranches.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleBranchToggle(b)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected
                        ? '1px solid #2563eb'
                        : '1px solid #cbd5e1',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : '#64748b',
                    }}
                  >
                    {isSelected ? `✓ ${b}` : b}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Application Deadline *</label>
            <input
              type="date"
              name="deadline"
              required
              className="form-control"
              value={formData.deadline}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Drive Commencement Date *</label>
            <input
              type="date"
              name="driveDate"
              required
              className="form-control"
              value={formData.driveDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Selection Rounds (Comma-separated)</label>
          <input
            type="text"
            name="roundsText"
            className="form-control"
            placeholder="Online Assessment, Technical Interview, HR Round"
            value={formData.roundsText}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Job Description & Responsibilities *</label>
          <textarea
            name="jobDescription"
            required
            rows={3}
            className="form-control"
            placeholder="Detailed requirements, technical stack, skills..."
            value={formData.jobDescription}
            onChange={handleChange}
          />
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
            {isSubmitting
              ? 'Saving...'
              : initialData
              ? 'Update Drive'
              : 'Create Drive'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DriveFormModal;
