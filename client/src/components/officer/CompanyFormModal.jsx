import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const CompanyFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    location: '',
    website: '',
    contactPerson: '',
    contactEmail: '',
    description: '',
    logoUrl: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        industry: initialData.industry || '',
        location: initialData.location || '',
        website: initialData.website || '',
        contactPerson: initialData.contactPerson || '',
        contactEmail: initialData.contactEmail || '',
        description: initialData.description || '',
        logoUrl: initialData.logoUrl || '',
      });
    } else {
      setFormData({
        name: '',
        industry: '',
        location: '',
        website: '',
        contactPerson: '',
        contactEmail: '',
        description: '',
        logoUrl: '',
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Company Information' : 'Add New Recruiting Company'}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Company Name *</label>
            <input
              type="text"
              name="name"
              required
              className="form-control"
              placeholder="e.g. Google India"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Industry / Sector *</label>
            <input
              type="text"
              name="industry"
              required
              className="form-control"
              placeholder="e.g. IT / Product / FinTech"
              value={formData.industry}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Headquarters / Location *</label>
            <input
              type="text"
              name="location"
              required
              className="form-control"
              placeholder="e.g. Bangalore, India"
              value={formData.location}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Official Website URL</label>
            <input
              type="url"
              name="website"
              className="form-control"
              placeholder="https://company.com"
              value={formData.website}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Contact HR / Recruiter Person</label>
            <input
              type="text"
              name="contactPerson"
              className="form-control"
              placeholder="e.g. Aditi Rao (Campus Lead)"
              value={formData.contactPerson}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">HR Email Address</label>
            <input
              type="email"
              name="contactEmail"
              className="form-control"
              placeholder="campus@company.com"
              value={formData.contactEmail}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Company Description *</label>
          <textarea
            name="description"
            required
            rows={3}
            className="form-control"
            placeholder="Brief overview of company business, domain, and products..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Company Logo Image URL (Optional)</label>
          <input
            type="url"
            name="logoUrl"
            className="form-control"
            placeholder="https://... logo link"
            value={formData.logoUrl}
            onChange={handleChange}
          />
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}>
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
              ? 'Update Company'
              : 'Add Company'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CompanyFormModal;
