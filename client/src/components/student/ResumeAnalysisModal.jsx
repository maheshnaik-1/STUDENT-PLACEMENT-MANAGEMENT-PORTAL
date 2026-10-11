import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../services/api';
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const ResumeAnalysisModal = ({
  isOpen,
  onClose,
  user,
  onAddSkillToProfile,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);

  const hasResume = Boolean(user?.resumeFile && user.resumeFile.filename);

  const handleAnalyze = async () => {
    if (analyzing) return; // Prevent duplicate concurrent requests

    if (!hasResume) {
      setError('No resume file has been uploaded yet. Please upload a PDF or DOCX resume first.');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      const res = await api.ai.parseResume();
      if (res.success) {
        setAnalysisData(res.data);
      } else {
        setError(res.message || 'Failed to extract text from resume.');
      }
    } catch (err) {
      if (err.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.status === 400) {
        setError(err.message || 'Unable to parse this resume format. Please ensure it is a valid PDF or DOCX file.');
      } else {
        setError(err.message || 'An error occurred while analyzing the resume. Please try again.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Auto-trigger analysis when modal opens if not already loaded
      if (!analysisData && !analyzing && hasResume) {
        handleAnalyze();
      }
    } else {
      // Clear transient error when modal closes
      setError(null);
    }
  }, [isOpen]);

  const handleAddSingleSkill = (skill) => {
    if (onAddSkillToProfile) {
      onAddSkillToProfile(skill);
    }
  };

  const handleAddAllNewSkills = () => {
    if (onAddSkillToProfile && analysisData?.newSkillsFound && analysisData.newSkillsFound.length > 0) {
      onAddSkillToProfile(analysisData.newSkillsFound);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resume Skills & Intelligence Analysis"
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Intelligence Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
              <Sparkles size={18} />
              <span>V3.0 Resume Text Extraction & Skill Discovery</span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.825rem', color: '#dbeafe' }}>
              Secure in-memory keyword scanning based on the placement portal canonical ontology.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !hasResume}
            className="btn btn-sm"
            style={{
              background: '#ffffff',
              color: '#1e40af',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: 'none',
            }}
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Re-analyze</span>
              </>
            )}
          </button>
        </div>

        {/* Loading State */}
        {analyzing && !analysisData && (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={36} className="spin" color="#2563eb" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 600, color: '#1e293b' }}>
              Extracting document text & analyzing competencies...
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
              Parsing secure resume storage in-memory without server disk leakage.
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '1rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <div style={{ fontWeight: 700 }}>Analysis Request Error</div>
              <div style={{ marginTop: '0.2rem' }}>{error}</div>
            </div>
          </div>
        )}

        {/* Missing Resume State */}
        {!hasResume && !error && (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              color: '#64748b',
            }}
          >
            <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ color: '#1e293b', fontWeight: 700, margin: 0 }}>No Uploaded Resume</h4>
            <p style={{ fontSize: '0.85rem', margin: '0.35rem 0 0', color: '#64748b' }}>
              Please upload your PDF or DOCX resume document in Section 7 before running analysis.
            </p>
          </div>
        )}

        {/* Successful Analysis Results Display */}
        {analysisData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Basic Extraction Statistics */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.825rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="#2563eb" />
                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                  {analysisData.originalName || 'Resume Document'}
                </span>
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  {analysisData.fileType}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', color: '#64748b' }}>
                <span>Words: <strong>{(analysisData.wordCount ?? analysisData.extractionStats?.wordCount ?? 0).toLocaleString()}</strong></span>
                <span>Characters: <strong>{(analysisData.characterCount ?? analysisData.extractionStats?.characterCount ?? 0).toLocaleString()}</strong></span>
                <span>Detected Skills: <strong>{analysisData.extractedSkills?.length || 0}</strong></span>
              </div>
            </div>

            {/* Newly Discovered Skills (Not in Profile) */}
            <div
              style={{
                background: analysisData.newSkillsFound.length > 0 ? '#eff6ff' : '#f8fafc',
                border: analysisData.newSkillsFound.length > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.65rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem' }}>
                  <Sparkles size={16} color="#2563eb" />
                  <span>
                    New Skills Discovered in Resume ({analysisData.newSkillsFound.length})
                  </span>
                </div>

                {analysisData.newSkillsFound.length > 0 && onAddSkillToProfile && (
                  <button
                    type="button"
                    onClick={handleAddAllNewSkills}
                    className="btn btn-sm"
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add All to Profile Form</span>
                  </button>
                )}
              </div>

              {analysisData.newSkillsFound.length > 0 ? (
                <>
                  <p style={{ margin: '0 0 0.65rem', fontSize: '0.8rem', color: '#475569' }}>
                    These competencies were detected in your resume document but are not currently listed in your profile skills.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {analysisData.newSkillsFound.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          background: '#ffffff',
                          color: '#1d4ed8',
                          border: '1px solid #93c5fd',
                          borderRadius: '6px',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span>{skill}</span>
                        {onAddSkillToProfile && (
                          <button
                            type="button"
                            onClick={() => handleAddSingleSkill(skill)}
                            title={`Add ${skill} to profile input`}
                            style={{
                              background: '#eff6ff',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontSize: '0.825rem' }}>
                  <CheckCircle2 size={16} />
                  <span>All technical skills detected in your resume are already in your career profile!</span>
                </div>
              )}
            </div>

            {/* All Extracted Resume Skills */}
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                All Skills Identified in Resume ({analysisData.extractedSkills.length})
              </div>
              {analysisData.extractedSkills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {analysisData.extractedSkills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.825rem', margin: 0 }}>
                  No recognized technical keywords were detected in the resume text.
                </p>
              )}
            </div>

            {/* Current Profile Skills */}
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                Current Profile Skills ({analysisData.currentProfileSkills?.length || 0})
              </div>
              {analysisData.currentProfileSkills?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {analysisData.currentProfileSkills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.825rem', margin: 0 }}>
                  No skills are currently listed in your student profile.
                </p>
              )}
            </div>

            {/* Contact Information Identified in Document */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                Contact Info Extracted from Resume
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155' }}>
                  <Mail size={15} color="#64748b" />
                  <span>{analysisData.contactInfo?.email || 'None detected'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155' }}>
                  <Phone size={15} color="#64748b" />
                  <span>{analysisData.contactInfo?.phone || 'None detected'}</span>
                </div>
              </div>

              {analysisData.contactInfo?.links?.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem' }}>
                  {analysisData.contactInfo.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <Globe size={13} />
                      <span>{link}</span>
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy & In-Memory Assurance */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#64748b',
                background: '#f8fafc',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <ShieldCheck size={16} color="#059669" />
              <span>
                <strong>Zero-Mutation Security:</strong> Analysis operates strictly in-memory. Your profile skills are never modified without your manual review and submission.
              </span>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '0.85rem',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ResumeAnalysisModal;
