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
  CheckCircle2,
  Award,
  Briefcase,
  Globe,
  Plus,
  Lock,
  Sparkles,
  BookOpen,
  FolderGit2,
  User,
  Phone,
  Mail,
  Linkedin,
  Github,
  TrendingUp,
} from 'lucide-react';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'];

/**
 * Real deterministic completeness calculation based on MongoDB student fields
 */
export const calculateCompleteness = (data, resumeFile, projects, certifications) => {
  let score = 0;
  const completed = [];
  const missing = [];

  // 1. Basic Info & Contact (15%)
  const hasBasic = Boolean(
    data.name &&
      data.email &&
      data.rollNo &&
      data.branch &&
      data.phone &&
      data.phone.trim().length >= 7
  );
  if (hasBasic) {
    score += 15;
    completed.push('Basic Information & Phone');
  } else {
    if (!data.phone || data.phone.trim().length < 7) {
      missing.push('Add contact phone number');
    } else {
      missing.push('Complete basic details (name, roll no, branch)');
    }
  }

  // 2. Core Academic Profile (15%)
  const cgpaNum = parseFloat(data.cgpa);
  const hasCore = Boolean(
    !isNaN(cgpaNum) &&
      cgpaNum > 0 &&
      data.passingYear &&
      data.activeBacklogs !== '' &&
      data.activeBacklogs !== undefined
  );
  if (hasCore) {
    score += 15;
    completed.push('Core Academic Record (CGPA, Backlogs, Batch)');
  } else {
    missing.push('Enter current CGPA, backlog count, and graduation batch');
  }

  // 3. Extended Academic History (15%)
  const tenth = parseFloat(data.tenthPercentage);
  const twelfth = parseFloat(data.twelfthPercentage);
  const diploma = parseFloat(data.diplomaPercentage);
  const sem = parseInt(data.currentSemester, 10);

  const has10th = !isNaN(tenth) && tenth > 0 && tenth <= 100;
  const has12thOrDip = (!isNaN(twelfth) && twelfth > 0 && twelfth <= 100) || (!isNaN(diploma) && diploma > 0 && diploma <= 100);
  const hasSem = !isNaN(sem) && sem >= 1 && sem <= 12;

  if (has10th && has12thOrDip && hasSem) {
    score += 15;
    completed.push('Schooling & Semester Record (10th, 12th/Diploma, Semester)');
  } else {
    const parts = [];
    if (!has10th) parts.push('10th %');
    if (!has12thOrDip) parts.push('12th/Diploma %');
    if (!hasSem) parts.push('Current Semester');
    missing.push(`Add academic history (${parts.join(', ')})`);
  }

  // 4. Technical Skills (15%)
  const skillsList = Array.isArray(data.skills)
    ? data.skills
    : typeof data.skills === 'string'
    ? data.skills.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  if (skillsList.length > 0) {
    score += 15;
    completed.push(`Technical Skills (${skillsList.length} skills listed)`);
  } else {
    missing.push('Add at least one technical skill (e.g., React, Java, Python)');
  }

  // 5. Resume (15%)
  const hasUploaded = Boolean(resumeFile && resumeFile.filename);
  const hasExternal = Boolean(data.resumeUrl && data.resumeUrl.trim().length > 0);
  if (hasUploaded || hasExternal) {
    score += 15;
    completed.push(hasUploaded ? 'Uploaded Resume Document' : 'External Resume Link');
  } else {
    missing.push('Upload a PDF/DOC resume or provide an external resume link');
  }

  // 6. Projects Portfolio (15%)
  const validProjects = Array.isArray(projects)
    ? projects.filter((p) => p.title && p.title.trim())
    : [];
  if (validProjects.length > 0) {
    score += 15;
    completed.push(`Projects Portfolio (${validProjects.length} project${validProjects.length > 1 ? 's' : ''})`);
  } else {
    missing.push('Add at least one technical or coursework project');
  }

  // 7. Professional Links & Certifications (10%)
  const hasLinks = Boolean(
    (data.github && data.github.trim()) ||
      (data.linkedin && data.linkedin.trim()) ||
      (data.portfolio && data.portfolio.trim())
  );
  const validCerts = Array.isArray(certifications)
    ? certifications.filter((c) => c.name && c.name.trim())
    : [];

  if (hasLinks || validCerts.length > 0) {
    score += 10;
    completed.push('Professional Links or Certifications');
  } else {
    missing.push('Add LinkedIn / GitHub link or professional certifications');
  }

  return {
    percentage: Math.min(score, 100),
    completed,
    missing,
  };
};

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
    // Extended Academic
    tenthPercentage: '',
    twelfthPercentage: '',
    diplomaPercentage: '',
    currentSemester: '',
    gapYears: '0',
    // Professional Links
    github: '',
    linkedin: '',
    portfolio: '',
  });

  const [projects, setProjects] = useState([]);
  const [certifications, setCertifications] = useState([]);

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
        cgpa: user.cgpa !== undefined && user.cgpa !== null ? user.cgpa.toString() : '0',
        activeBacklogs:
          user.activeBacklogs !== undefined && user.activeBacklogs !== null
            ? user.activeBacklogs.toString()
            : '0',
        passingYear:
          user.passingYear !== undefined && user.passingYear !== null
            ? user.passingYear.toString()
            : '2026',
        phone: user.phone || '',
        skills: Array.isArray(user.skills)
          ? user.skills.join(', ')
          : user.skills || '',
        resumeUrl: user.resumeUrl || '',
        password: '',
        // Extended Academic
        tenthPercentage:
          user.academicDetails?.tenthPercentage !== null &&
          user.academicDetails?.tenthPercentage !== undefined
            ? user.academicDetails.tenthPercentage.toString()
            : '',
        twelfthPercentage:
          user.academicDetails?.twelfthPercentage !== null &&
          user.academicDetails?.twelfthPercentage !== undefined
            ? user.academicDetails.twelfthPercentage.toString()
            : '',
        diplomaPercentage:
          user.academicDetails?.diplomaPercentage !== null &&
          user.academicDetails?.diplomaPercentage !== undefined
            ? user.academicDetails.diplomaPercentage.toString()
            : '',
        currentSemester:
          user.academicDetails?.currentSemester !== null &&
          user.academicDetails?.currentSemester !== undefined
            ? user.academicDetails.currentSemester.toString()
            : '',
        gapYears:
          user.academicDetails?.gapYears !== null &&
          user.academicDetails?.gapYears !== undefined
            ? user.academicDetails.gapYears.toString()
            : '0',
        // Professional Links
        github: user.links?.github || '',
        linkedin: user.links?.linkedin || '',
        portfolio: user.links?.portfolio || '',
      });

      setProjects(
        Array.isArray(user.projects) && user.projects.length > 0
          ? user.projects.map((p) => ({
              title: p.title || '',
              description: p.description || '',
              techStack: Array.isArray(p.techStack)
                ? p.techStack.join(', ')
                : p.techStack || '',
              link: p.link || '',
            }))
          : []
      );

      setCertifications(
        Array.isArray(user.certifications) && user.certifications.length > 0
          ? user.certifications.map((c) => ({
              name: c.name || '',
              issuer: c.issuer || '',
              issueDate: c.issueDate || '',
              certificateUrl: c.certificateUrl || '',
            }))
          : []
      );
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

  // Project item handlers
  const handleAddProject = () => {
    setProjects((prev) => [
      ...prev,
      { title: '', description: '', techStack: '', link: '' },
    ]);
  };

  const handleProjectChange = (index, field, value) => {
    setProjects((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveProject = (index) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  // Certification item handlers
  const handleAddCert = () => {
    setCertifications((prev) => [
      ...prev,
      { name: '', issuer: '', issueDate: '', certificateUrl: '' },
    ]);
  };

  const handleCertChange = (index, field, value) => {
    setCertifications((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveCert = (index) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
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
      showError(
        'Invalid file format. Only PDF (.pdf), DOC (.doc), and DOCX (.docx) documents are supported.'
      );
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      showError('File size exceeds 5MB limit. Please upload a smaller file.');
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
      // Validate percentages if entered
      if (
        formData.tenthPercentage !== '' &&
        (parseFloat(formData.tenthPercentage) < 0 || parseFloat(formData.tenthPercentage) > 100)
      ) {
        showError('10th percentage must be between 0 and 100');
        setSaving(false);
        return;
      }
      if (
        formData.twelfthPercentage !== '' &&
        (parseFloat(formData.twelfthPercentage) < 0 || parseFloat(formData.twelfthPercentage) > 100)
      ) {
        showError('12th percentage must be between 0 and 100');
        setSaving(false);
        return;
      }
      if (
        formData.diplomaPercentage !== '' &&
        (parseFloat(formData.diplomaPercentage) < 0 || parseFloat(formData.diplomaPercentage) > 100)
      ) {
        showError('Diploma percentage must be between 0 and 100');
        setSaving(false);
        return;
      }
      if (
        formData.currentSemester !== '' &&
        (parseInt(formData.currentSemester, 10) < 1 || parseInt(formData.currentSemester, 10) > 12)
      ) {
        showError('Current semester must be between 1 and 12');
        setSaving(false);
        return;
      }

      const formattedProjects = projects
        .filter((p) => p.title && p.title.trim())
        .map((p) => ({
          title: p.title.trim(),
          description: (p.description || '').trim(),
          techStack:
            typeof p.techStack === 'string'
              ? p.techStack
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : p.techStack || [],
          link: (p.link || '').trim(),
        }));

      const formattedCerts = certifications
        .filter((c) => c.name && c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          issuer: (c.issuer || '').trim(),
          issueDate: (c.issueDate || '').trim(),
          certificateUrl: (c.certificateUrl || '').trim(),
        }));

      const payload = {
        name: formData.name.trim(),
        branch: formData.branch,
        cgpa: parseFloat(formData.cgpa) || 0,
        activeBacklogs: parseInt(formData.activeBacklogs, 10) || 0,
        passingYear: parseInt(formData.passingYear, 10) || 2026,
        phone: formData.phone.trim(),
        skills: formData.skills,
        resumeUrl: formData.resumeUrl.trim(),
        academicDetails: {
          tenthPercentage:
            formData.tenthPercentage === '' ? null : parseFloat(formData.tenthPercentage),
          twelfthPercentage:
            formData.twelfthPercentage === '' ? null : parseFloat(formData.twelfthPercentage),
          diplomaPercentage:
            formData.diplomaPercentage === '' ? null : parseFloat(formData.diplomaPercentage),
          currentSemester:
            formData.currentSemester === '' ? null : parseInt(formData.currentSemester, 10),
          gapYears: formData.gapYears === '' ? 0 : parseInt(formData.gapYears, 10),
        },
        links: {
          github: (formData.github || '').trim(),
          linkedin: (formData.linkedin || '').trim(),
          portfolio: (formData.portfolio || '').trim(),
        },
        projects: formattedProjects,
        certifications: formattedCerts,
      };

      if (formData.password && formData.password.trim().length >= 6) {
        payload.password = formData.password.trim();
      }

      await updateProfile(payload);
      showSuccess('Career profile updated successfully!');
    } catch (err) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const hasUploadedResume = Boolean(user?.resumeFile && user.resumeFile.filename);
  const isPdf = Boolean(
    user?.resumeFile &&
      (user.resumeFile.mimeType === 'application/pdf' ||
        (user.resumeFile.filename || '').toLowerCase().endsWith('.pdf') ||
        (user.resumeFile.originalName || '').toLowerCase().endsWith('.pdf'))
  );

  // Compute live deterministic completeness
  const completeness = calculateCompleteness(
    formData,
    user?.resumeFile,
    projects,
    certifications
  );

  return (
    <div style={{ width: '100%', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Student Career Profile & Readiness</h1>
          <p className="page-subtitle">
            Manage your academic credentials, technical skillset, projects portfolio, certifications, and resume.
          </p>
        </div>
      </div>

      {/* Profile Completeness & Readiness Card */}
      <div
        className="card"
        style={{
          border: '1px solid #cbd5e1',
          marginBottom: '1.75rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background:
                  completeness.percentage >= 80
                    ? '#dcfce7'
                    : completeness.percentage >= 50
                    ? '#eff6ff'
                    : '#fef3c7',
                color:
                  completeness.percentage >= 80
                    ? '#15803d'
                    : completeness.percentage >= 50
                    ? '#2563eb'
                    : '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Profile Completeness: {completeness.percentage}%
                </h3>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background:
                      completeness.percentage === 100
                        ? '#dcfce7'
                        : completeness.percentage >= 70
                        ? '#eff6ff'
                        : '#fef3c7',
                    color:
                      completeness.percentage === 100
                        ? '#15803d'
                        : completeness.percentage >= 70
                        ? '#1d4ed8'
                        : '#92400e',
                  }}
                >
                  {completeness.percentage === 100
                    ? 'Placement Ready'
                    : completeness.percentage >= 70
                    ? 'Good Profile Readiness'
                    : 'Profile In Progress'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                Deterministic score calculated across 7 core career dimensions.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '10px',
            background: '#e2e8f0',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${completeness.percentage}%`,
              background:
                completeness.percentage >= 80
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : completeness.percentage >= 50
                  ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                  : 'linear-gradient(90deg, #f59e0b, #d97706)',
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Missing / Actionable Checklist Items */}
        {completeness.missing.length > 0 ? (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.85rem',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: '#92400e',
                marginBottom: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <AlertCircle size={15} />
              <span>Recommended actions to reach 100% profile readiness:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#78350f' }}>
              {completeness.missing.map((item, idx) => (
                <li key={idx} style={{ margin: '0.2rem 0' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #dcfce7',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.85rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={18} color="#16a34a" />
            <span>Excellent! Your career profile is 100% complete and fully ready for placement evaluations.</span>
          </div>
        )}

        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>
          * Note: Profile completeness is an informational career readiness guide. Placement drive applications remain governed by each company's eligibility criteria.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Basic Information */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <User size={18} color="#2563eb" />
              1. Basic Identity & Contact Information
            </h3>
          </div>
          <div className="card-body">
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

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Roll Number (Unique ID)</label>
                <input
                  type="text"
                  disabled
                  className="form-control"
                  style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                  value={formData.rollNo}
                />
                <div className="form-help">Roll number is fixed to your student account.</div>
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

              <div className="form-group">
                <label className="form-label">Contact Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Academic Profile */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <GraduationCap size={18} color="#2563eb" />
              2. Academic Profile & Performance Records
            </h3>
          </div>
          <div className="card-body">
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              Undergraduate Degree Credentials
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
                <div className="form-help">0.0 to 10.0 scale. Drives evaluate this score.</div>
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
                <label className="form-label">Graduation Year / Batch *</label>
                <input
                  type="number"
                  name="passingYear"
                  required
                  className="form-control"
                  value={formData.passingYear}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Semester (1-12)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  name="currentSemester"
                  className="form-control"
                  placeholder="e.g. 6"
                  value={formData.currentSemester}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '1.25rem 0 0.75rem' }}>
              Secondary & Pre-University History
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">10th Standard Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  name="tenthPercentage"
                  className="form-control"
                  placeholder="e.g. 91.5"
                  value={formData.tenthPercentage}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">12th Standard Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  name="twelfthPercentage"
                  className="form-control"
                  placeholder="e.g. 88.0"
                  value={formData.twelfthPercentage}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Diploma Percentage (%) [If applicable]</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  name="diplomaPercentage"
                  className="form-control"
                  placeholder="e.g. 85.0"
                  value={formData.diplomaPercentage}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Academic Gap Years</label>
                <input
                  type="number"
                  min="0"
                  name="gapYears"
                  className="form-control"
                  placeholder="0"
                  value={formData.gapYears}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Technical Skills */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Sparkles size={18} color="#2563eb" />
              3. Technical Skills & Core Competencies
            </h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Technical Skills (Comma-separated)</label>
              <input
                type="text"
                name="skills"
                className="form-control"
                placeholder="React, Node.js, Python, MongoDB, AWS, Data Structures, SQL, Docker"
                value={formData.skills}
                onChange={handleChange}
              />
              <div className="form-help">
                List programming languages, frameworks, databases, and tools you are proficient in.
              </div>
            </div>

            {/* Render Skill Badges Preview */}
            {formData.skills && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {formData.skills
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Projects Portfolio */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">
              <FolderGit2 size={18} color="#2563eb" />
              4. Projects Portfolio ({projects.length})
            </h3>
            <button
              type="button"
              onClick={handleAddProject}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={15} />
              <span>Add Project</span>
            </button>
          </div>
          <div className="card-body">
            {projects.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                <FolderGit2 size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No projects added yet.</p>
                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Showcase coursework, hackathons, or open-source software projects.
                </p>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} />
                  <span>Add First Project</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                        Project #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(idx)}
                        className="btn btn-sm"
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flex: '2' }}>
                        <label className="form-label">Project Title *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Distributed Task Queue"
                          value={proj.title}
                          onChange={(e) => handleProjectChange(idx, 'title', e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: '2' }}>
                        <label className="form-label">Project URL / GitHub Repo</label>
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://github.com/..."
                          value={proj.link}
                          onChange={(e) => handleProjectChange(idx, 'link', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tech Stack (Comma-separated)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. React, Node.js, Redis, Docker"
                        value={proj.techStack}
                        onChange={(e) => handleProjectChange(idx, 'techStack', e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Description / Highlights</label>
                      <textarea
                        rows={2}
                        className="form-control"
                        placeholder="Briefly describe the purpose, architecture, and key achievements..."
                        value={proj.description}
                        onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Certifications */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">
              <Award size={18} color="#2563eb" />
              5. Certifications & Honors ({certifications.length})
            </h3>
            <button
              type="button"
              onClick={handleAddCert}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={15} />
              <span>Add Certification</span>
            </button>
          </div>
          <div className="card-body">
            {certifications.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                <Award size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No certifications added yet.</p>
                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Add AWS, Cloud, CyberSecurity, or Coursera credentials.
                </p>
                <button
                  type="button"
                  onClick={handleAddCert}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} />
                  <span>Add First Certification</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                        Certification #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCert(idx)}
                        className="btn btn-sm"
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flex: '2' }}>
                        <label className="form-label">Certificate Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. AWS Certified Solutions Architect"
                          value={cert.name}
                          onChange={(e) => handleCertChange(idx, 'name', e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: '1.5' }}>
                        <label className="form-label">Issuing Body / Organization</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Amazon Web Services"
                          value={cert.issuer}
                          onChange={(e) => handleCertChange(idx, 'issuer', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Issue Date</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. May 2025"
                          value={cert.issueDate}
                          onChange={(e) => handleCertChange(idx, 'issueDate', e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: '2' }}>
                        <label className="form-label">Certificate Verification URL</label>
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://..."
                          value={cert.certificateUrl}
                          onChange={(e) => handleCertChange(idx, 'certificateUrl', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Professional Links */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Globe size={18} color="#2563eb" />
              6. Professional Links & Profiles
            </h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Github size={15} />
                  <span>GitHub Profile URL</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    name="github"
                    className="form-control"
                    placeholder="https://github.com/username"
                    value={formData.github}
                    onChange={handleChange}
                  />
                  {formData.github && (
                    <a
                      href={formData.github}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Open GitHub Profile"
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Linkedin size={15} />
                  <span>LinkedIn Profile URL</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    name="linkedin"
                    className="form-control"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedin}
                    onChange={handleChange}
                  />
                  {formData.linkedin && (
                    <a
                      href={formData.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Open LinkedIn Profile"
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Globe size={15} />
                <span>Personal Portfolio / Website URL</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="url"
                  name="portfolio"
                  className="form-control"
                  placeholder="https://yourportfolio.dev"
                  value={formData.portfolio}
                  onChange={handleChange}
                />
                {formData.portfolio && (
                  <a
                    href={formData.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Open Portfolio Website"
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Resume Management */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <FileText size={18} color="#2563eb" />
              7. Resume Management & Document Vault
            </h3>
          </div>
          <div className="card-body">
            {/* Uploaded Resume Area */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                Uploaded Resume (Primary PDF/DOC Document)
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
                          flexWrap: 'wrap',
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
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#64748b',
                      fontSize: '0.875rem',
                    }}
                  >
                    <AlertCircle size={16} color="#94a3b8" />
                    <span>No uploaded resume document on file. Upload a document below.</span>
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
                    Accepted formats: <strong>PDF, DOC, DOCX</strong> • Maximum <strong>5 MB</strong> (PDF supports immediate in-browser preview)
                  </div>
                </div>
              )}
            </div>

            {/* External Resume Link Area */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                External Resume Link (Google Drive / Portfolio)
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
        </div>

        {/* Section 8: Account Security */}
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Lock size={18} color="#2563eb" />
              8. Account Security & Password
            </h3>
          </div>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Change Password (Leave blank to keep current password)</label>
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
          </div>
        </div>

        {/* Save Bar */}
        <div
          style={{
            position: 'sticky',
            bottom: '1rem',
            background: '#ffffff',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Ensure all career details are accurate before submitting drive applications.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary btn-lg"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={18} />
            <span>{saving ? 'Saving Profile...' : 'Save Career Profile'}</span>
          </button>
        </div>
      </form>

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
