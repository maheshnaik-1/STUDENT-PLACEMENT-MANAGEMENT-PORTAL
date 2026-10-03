import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import DriveFormModal from '../../components/officer/DriveFormModal';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  Building2,
  Filter,
} from 'lucide-react';

const STATUS_FILTERS = ['ALL', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

const ManageDrives = () => {
  const [drives, setDrives] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [deletingDrive, setDeletingDrive] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useNotification();

  const fetchDrivesAndCompanies = async () => {
    try {
      setLoading(true);
      const [drivesRes, companiesRes] = await Promise.all([
        api.drives.getAll({ search, status: statusFilter }),
        api.companies.getAll(),
      ]);

      if (drivesRes.success) setDrives(drivesRes.data || []);
      if (companiesRes.success) setCompanies(companiesRes.data || []);
    } catch (err) {
      showError(err.message || 'Failed to fetch placement drives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivesAndCompanies();
  }, [statusFilter, search]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingDrive) {
        const res = await api.drives.update(editingDrive._id, formData);
        if (res.success) {
          showSuccess('Placement drive updated successfully!');
        }
      } else {
        const res = await api.drives.create(formData);
        if (res.success) {
          showSuccess('Placement drive created successfully!');
        }
      }
      setIsFormOpen(false);
      setEditingDrive(null);
      fetchDrivesAndCompanies();
    } catch (err) {
      showError(err.message || 'Failed to save placement drive');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDrive) return;
    try {
      setIsSubmitting(true);
      const res = await api.drives.delete(deletingDrive._id);
      if (res.success) {
        showSuccess(res.message || 'Placement drive deleted successfully');
        setDeletingDrive(null);
        fetchDrivesAndCompanies();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete placement drive');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Placement Drives</h1>
          <p className="page-subtitle">
            Create, schedule, and supervise campus recruitment drives
          </p>
        </div>

        <button
          onClick={() => {
            if (companies.length === 0) {
              showError('Please add at least one company before creating a placement drive.');
              return;
            }
            setEditingDrive(null);
            setIsFormOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Create Placement Drive</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search drives by company, role headline, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#64748b" />
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drives Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <p>Loading placement drives...</p>
        </div>
      ) : drives.length === 0 ? (
        <div className="card empty-state">
          <Briefcase size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 className="empty-title">No Placement Drives Found</h3>
          <p className="empty-subtitle">
            Get started by scheduling your first company placement drive.
          </p>
          <button
            onClick={() => {
              setEditingDrive(null);
              setIsFormOpen(true);
            }}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            Create New Drive
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Title & Role</th>
                  <th>Package (CTC)</th>
                  <th>Eligibility Criteria</th>
                  <th>Drive Dates</th>
                  <th>Applicants</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((drive) => {
                  const company = drive.company || {};
                  const eligibility = drive.eligibility || {};

                  return (
                    <tr key={drive._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {company.name || 'Company'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {drive.location}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {drive.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Role: {drive.jobRole}
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#065f46',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          {drive.packageCTC}
                        </span>
                      </td>

                      <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                        <div>CGPA &ge; <strong>{eligibility.minCGPA || 0}</strong></div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          {eligibility.allowedBranches?.join(', ')} (Max {eligibility.maxBacklogs ?? 0} BL)
                        </div>
                      </td>

                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        <div>Drive: {new Date(drive.driveDate).toLocaleDateString()}</div>
                        <div style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                          Deadline: {new Date(drive.deadline).toLocaleDateString()}
                        </div>
                      </td>

                      <td>
                        <Link
                          to={`/officer/drives/${drive._id}/applicants`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '9999px',
                            fontWeight: 700,
                            fontSize: '0.825rem',
                            textDecoration: 'none',
                          }}
                        >
                          <Users size={13} />
                          <span>{drive.totalApplicants || 0} Applied</span>
                        </Link>
                      </td>

                      <td>
                        <StatusBadge status={drive.status} type="drive" />
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <Link
                            to={`/officer/drives/${drive._id}/applicants`}
                            className="btn btn-primary btn-sm"
                            title="Review Applicants"
                          >
                            <Users size={14} />
                            <span>Applicants</span>
                          </Link>

                          <button
                            onClick={() => {
                              setEditingDrive(drive);
                              setIsFormOpen(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.5rem' }}
                            title="Edit Drive"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => setDeletingDrive(drive)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.5rem', color: '#dc2626' }}
                            title="Delete Drive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Drive Modal */}
      <DriveFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDrive(null);
        }}
        onSubmit={handleCreateOrUpdate}
        companies={companies}
        initialData={editingDrive}
        isSubmitting={isSubmitting}
      />

      {/* Delete Drive Modal */}
      <Modal
        isOpen={!!deletingDrive}
        onClose={() => setDeletingDrive(null)}
        title="Confirm Drive Deletion"
        maxWidth="480px"
      >
        <div>
          <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Are you sure you want to delete the placement drive for{' '}
            <strong>{deletingDrive?.title}</strong>?
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
            ⚠️ Warning: All registered student applications submitted to this drive will also be permanently removed.
          </div>

          <div
            className="modal-footer"
            style={{ margin: '1.5rem -1.5rem -1.5rem', padding: '1rem 1.5rem' }}
          >
            <button
              type="button"
              onClick={() => setDeletingDrive(null)}
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
              {isSubmitting ? 'Deleting...' : 'Yes, Delete Drive'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageDrives;
