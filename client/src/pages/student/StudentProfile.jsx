import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import Modal from '../../components/common/Modal';
import {
  GraduationCap,
  FileText,
  Save,
  ExternalLink,
  Upload,
  Trash2,
  Download,
  FileCheck,
  AlertCircle,
  Eye,
  Loader2,
} from 'lucide-react';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'];

const StudentProfile = () => {
  const { user, updateProfile, updateResumeState } = useAuth();
  const { showSuccess, showError } = useNotification();

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    branch: 'CSE',
    cgpa: '0',
    activeBacklogs: '0',
    passingYear: '2026',
    phone: '',
    skills: '',
    resumeUrl: '',
    password: '',
  });

  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // PDF Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        rollNo: user.rollNo || '',
        branch: user.branch || 'CSE',
        cgpa: user.cgpa?.toString() || '0',
        activeBacklogs: user.activeBacklogs?.toString() || '0',
        passingYear: user.passingYear?.toString() || '2026',
        phone: user.phone || '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
        resumeUrl: user.resumeUrl || '',
        password: '',
      });
    }
  }, [user]);

  // Clean up object URL when component unmounts or blob changes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload Resume handler
  const handleUploadResume = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showError('Please select a resume file (PDF, DOC, DOCX up to 5MB).');
      return;
    }

    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      showError('Invalid file format. Only PDF (.pdf), DOC (.doc), and DOCX (.docx) documents are supported.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      showError('File size exceeds the 5MB limit. Please upload a file smaller than 5MB.');
      return;
    }

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('resume', selectedFile);

      const res = await api.auth.uploadResume(uploadData);
      if (res.success && res.resumeFile) {
        if (updateResumeState) {
          updateResumeState(res.resumeFile);
        }
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        showSuccess('Resume uploaded successfully!');
      }
    } catch (err) {
      showError(err.message || 'Failed to upload resume file.');
    } finally {
      setUploading(false);
    }
  };

  // Download Resume handler
  const handleDownloadResume = async () => {
    setDownloading(true);
    try {
      const blob = await api.auth.downloadResume();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = user?.resumeFile?.originalName || 'Resume.pdf';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
      showSuccess('Resume download started.');
    } catch (err) {
      showError(err.message || 'Failed to download resume file.');
    } finally {
      setDownloading(false);
    }
  };

  // Delete Resume handler
  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to delete your uploaded resume?')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await api.auth.deleteResume();
      if (res.success) {
        if (updateResumeState) {
          updateResumeState(null);
        }
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // If preview modal was open, close it
        handleClosePreview();
        showSuccess('Uploaded resume deleted successfully.');
      }
    } catch (err) {
      showError(err.message || 'Failed to delete resume.');
    } finally {
      setDeleting(false);
    }
  };

  // Open PDF Preview Handler
  const handleOpenPreview = async () => {
    setPreviewModalOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);

    // Revoke previous blob if any
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const blob = await api.auth.downloadResume();
      const url = window.URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
    } catch (err) {
      console.error('Failed to load PDF preview:', err);
      setPreviewError(err.message || 'Unable to load PDF document for preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Close PDF Preview Handler
  const handleClosePreview = () => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewModalOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        branch: formData.branch,
        cgpa: parseFloat(formData.cgpa),
        activeBacklogs: parseInt(formData.activeBacklogs, 10),
        passingYear: parseInt(formData.passingYear, 10),
        phone: formData.phone,
        skills: formData.skills,
        resumeUrl: formData.resumeUrl,
      };

      if (formData.password && formData.password.length >= 6) {
        payload.password = formData.password;
      }

      await updateProfile(payload);
      showSuccess('Your academic profile has been updated successfully!');
    } catch (err) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const hasUploadedResume = Boolean(user?.resumeFile && user.resumeFile.filename);
  const isPdf =
    Boolean(
      user?.resumeFile &&
        (user.resumeFile.mimeType === 'application/pdf' ||
          (user.resumeFile.filename || '').toLowerCase().endsWith('.pdf') ||
          (user.resumeFile.originalName || '').toLowerCase().endsWith('.pdf'))
    );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Profile & Academic Record</h1>
          <p className="page-subtitle">
            Ensure your academic details, CGPA, and resume are up to date for placement eligibility
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <GraduationCap size={20} color="#2563eb" />
            Profile Details
          </h3>
          <span className="badge badge-applied">Batch of {formData.passingYear}</span>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Read-only Identity / Roll No */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">College Email Address (Registered)</label>
                <input
                  type="email"
                  disabled
                  className="form-control"
                  style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                  value={formData.email}
                />
              </div>
            </div>

            {/* Academic Information */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                margin: '1rem 0 1.5rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Academic Credentials
              </h4>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    disabled
                    className="form-control"
                    style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                    value={formData.rollNo}
                  />
                  <div className="form-help">Roll number cannot be modified.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Engineering Branch *</label>
                  <select
                    name="branch"
                    className="form-control"
                    value={formData.branch}
                    onChange={handleChange}
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cumulative GPA (CGPA) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa"
                    required
                    className="form-control"
                    value={formData.cgpa}
                    onChange={handleChange}
                  />
                  <div className="form-help">Updated CGPA immediately recalculates eligibility.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Active Backlogs *</label>
                  <input
                    type="number"
                    min="0"
                    name="activeBacklogs"
                    required
                    className="form-control"
                    value={formData.activeBacklogs}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Graduation Year *</label>
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
            </div>

            {/* Resume & Portfolio Section */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                margin: '1.5rem 0',
              }}
            >
              <h4
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <FileText size={18} color="#2563eb" />
                Resume Management
              </h4>

              {/* Uploaded Resume Area */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                  Uploaded Resume (Server File)
                </label>

                {hasUploadedResume ? (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FileCheck size={24} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>
                          {user.resumeFile.originalName || user.resumeFile.filename}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#64748b',
                            display: 'flex',
                            gap: '0.75rem',
                            marginTop: '0.2rem',
                          }}
                        >
                          <span>{formatFileSize(user.resumeFile.size)}</span>
                          <span>•</span>
                          <span>
                            {user.resumeFile.uploadedAt
                              ? `Uploaded ${new Date(user.resumeFile.uploadedAt).toLocaleDateString()}`
                              : 'Uploaded'}
                          </span>
                          {!isPdf && (
                            <span style={{ color: '#6366f1', fontWeight: 500 }}>
                              (DOC/DOCX • Download only)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {isPdf && (
                        <button
                          type="button"
                          onClick={handleOpenPreview}
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            borderColor: '#bfdbfe',
                          }}
                        >
                          <Eye size={15} />
                          <span>Preview</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleDownloadResume}
                        disabled={downloading}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Download size={15} />
                        <span>{downloading ? 'Downloading...' : 'Download'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteResume}
                        disabled={deleting}
                        className="btn btn-sm"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                        }}
                      >
                        <Trash2 size={15} />
                        <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                      <AlertCircle size={16} color="#94a3b8" />
                      <span>No uploaded resume on file. Upload a document below.</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        disabled={uploading}
                        style={{
                          fontSize: '0.875rem',
                          color: '#334155',
                          flex: '1',
                          minWidth: '220px',
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleUploadResume}
                        disabled={uploading || !selectedFile}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Upload size={16} />
                        <span>{uploading ? 'Uploading...' : 'Upload Resume'}</span>
                      </button>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Accepted formats: <strong>PDF, DOC, DOCX</strong> • Maximum <strong>5 MB</strong> (PDF supports in-browser preview)
                    </div>
                  </div>
                )}
              </div>

              {/* External Resume Link Area */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                  External Resume Link (Drive / Portfolio)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    name="resumeUrl"
                    className="form-control"
                    placeholder="https://drive.google.com/... / external resume URL"
                    value={formData.resumeUrl}
                    onChange={handleChange}
                  />
                  {formData.resumeUrl && (
                    <a
                      href={formData.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Open External Resume Link"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <ExternalLink size={16} />
                      <span style={{ fontSize: '0.8rem' }}>Visit</span>
                    </a>
                  )}
                </div>
                <div className="form-help">
                  You can keep both an uploaded resume file and an external portfolio link.
                </div>
              </div>
            </div>

            {/* Contact & Skills */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Technical Skills (Comma-separated)</label>
                <input
                  type="text"
                  name="skills"
                  className="form-control"
                  placeholder="React, Node.js, Python, MongoDB, AWS, Data Structures"
                  value={formData.skills}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Change Password (Leave blank to keep unchanged)</label>
              <input
                type="password"
                name="password"
                minLength={6}
                className="form-control"
                placeholder="New password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-lg"
              >
                <Save size={18} />
                <span>{saving ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PDF Resume Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        title={`Resume Preview — ${user?.resumeFile?.originalName || user?.resumeFile?.filename || 'Resume.pdf'}`}
        maxWidth="880px"
      >
        <div>
          {previewLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                color: '#2563eb',
                gap: '1rem',
              }}
            >
              <Loader2 size={36} className="spin" />
              <div style={{ fontWeight: 600, color: '#475569' }}>
                Fetching authenticated PDF preview...
              </div>
            </div>
          )}

          {previewError && !previewLoading && (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                background: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                color: '#991b1b',
              }}
            >
              <AlertCircle size={36} style={{ margin: '0 auto 1rem', color: '#dc2626' }} />
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Preview Not Available
              </h4>
              <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem', color: '#7f1d1d' }}>
                {previewError}
              </p>
              <button
                type="button"
                onClick={handleDownloadResume}
                className="btn btn-primary btn-sm"
                style={{ margin: '0 auto' }}
              >
                <Download size={16} />
                <span>Download Resume File Instead</span>
              </button>
            </div>
          )}

          {previewBlobUrl && !previewLoading && !previewError && (
            <div>
              <iframe
                src={previewBlobUrl}
                title="PDF Resume Preview"
                style={{
                  width: '100%',
                  height: '70vh',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#f8fafc',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Viewing authenticated PDF resume stream.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Download size={15} />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="btn btn-secondary btn-sm"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StudentProfile;
