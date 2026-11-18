import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import CompanyFormModal from '../../components/officer/CompanyFormModal';
import CompanyLogo from '../../components/common/CompanyLogo';
import Modal from '../../components/common/Modal';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Globe,
  Mail,
  MapPin,
  ExternalLink,
  Briefcase,
} from 'lucide-react';

const ManageCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useNotification();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.companies.getAll({ search });
      if (res.success) {
        setCompanies(res.data || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingCompany) {
        const res = await api.companies.update(editingCompany._id, formData);
        if (res.success) {
          showSuccess(`Company '${formData.name}' updated successfully!`);
        }
      } else {
        const res = await api.companies.create(formData);
        if (res.success) {
          showSuccess(`Company '${formData.name}' registered successfully!`);
        }
      }
      setIsFormOpen(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (err) {
      showError(err.message || 'Failed to save company information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCompany) return;
    try {
      setIsSubmitting(true);
      const res = await api.companies.delete(deletingCompany._id);
      if (res.success) {
        showSuccess(res.message || 'Company deleted successfully');
        setDeletingCompany(null);
        fetchCompanies();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Management</h1>
          <p className="page-subtitle">
            Register and manage participating campus recruiting companies
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCompany(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Add New Company</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search companies by name, location, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Company Grid / Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <p>Loading company directory...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="card empty-state">
          <Building2 size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">No Companies Found</h3>
          <p className="empty-subtitle">
            Add a company to begin scheduling recruitment drives.
          </p>
          <button
            onClick={() => {
              setEditingCompany(null);
              setIsFormOpen(true);
            }}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            Add First Company
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {companies.map((company) => (
            <div
              key={company._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div className="card-body">
                {/* Header with Logo and Action Icons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
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
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                        {company.name}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {company.industry}
                      </div>
                    </div>
                  </div>

                  {/* Edit / Delete Buttons */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => {
                        setEditingCompany(company);
                        setIsFormOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.3rem 0.5rem' }}
                      title="Edit Company"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingCompany(company)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.3rem 0.5rem', color: '#dc2626' }}
                      title="Delete Company"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p
                  style={{
                    color: '#475569',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {company.description}
                </p>

                {/* Company Meta Info */}
                <div
                  style={{
                    fontSize: '0.825rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    color: '#64748b',
                    padding: '0.75rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} />
                    <span>{company.location}</span>
                  </div>
                  {company.contactPerson && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={14} />
                      <span>
                        {company.contactPerson}{' '}
                        {company.contactEmail ? `(${company.contactEmail})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer with Drive Count */}
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.825rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e293b', fontWeight: 600 }}>
                  <Briefcase size={14} color="#2563eb" />
                  <span>{company.totalDrives || 0} Drives Conducted</span>
                </div>

                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: 600,
                      color: '#2563eb',
                    }}
                  >
                    <span>Website</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Company Form Modal */}
      <CompanyFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCompany(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingCompany}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingCompany}
        onClose={() => setDeletingCompany(null)}
        title="Confirm Company Deletion"
        maxWidth="480px"
      >
        <div>
          <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Are you sure you want to delete <strong>{deletingCompany?.name}</strong>?
          </p>
          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginTop: '1rem',
            }}
          >
            ⚠️ Warning: Deleting this company will also remove all linked placement drives and student applications. This action cannot be undone.
          </div>

          <div
            className="modal-footer"
            style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}
          >
            <button
              type="button"
              onClick={() => setDeletingCompany(null)}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Yes, Delete Company'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageCompanies;
