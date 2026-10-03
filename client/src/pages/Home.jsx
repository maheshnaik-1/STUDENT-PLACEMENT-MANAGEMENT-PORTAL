import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  GraduationCap,
  Briefcase,
  Building2,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';

const Home = () => {
  const { isAuthenticated, isOfficer, isStudent, login } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCompanies: 6,
    totalDrives: 5,
    totalStudents: 5,
    totalSelected: 2,
    placementRate: 85,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.applications.getStats();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        // Fallback to default stats if needed
      }
    };
    fetchStats();
  }, []);

  const handleQuickDemoLogin = async (role) => {
    try {
      if (role === 'officer') {
        await login('officer@college.edu', 'Officer@123', 'officer');
        navigate('/officer/dashboard');
      } else {
        await login('rahul.cse@college.edu', 'Student@123', 'student');
        navigate('/student/dashboard');
      }
    } catch (error) {
      console.error('Quick login failed', error);
      navigate('/login');
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
          color: '#ffffff',
          padding: '4.5rem 1.5rem 5rem',
          borderRadius: '24px',
          boxShadow: '0 20px 40px -15px rgba(30, 58, 138, 0.4)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '3.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '850px',
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            <GraduationCap size={18} />
            <span>Campus Recruitment & Placement Automation</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#ffffff',
              marginBottom: '1.25rem',
              letterSpacing: '-0.5px',
            }}
          >
            Student Placement Management Portal
          </h1>

          <p
            style={{
              fontSize: '1.15rem',
              color: '#dbeafe',
              lineHeight: 1.6,
              marginBottom: '2.25rem',
              maxWidth: '680px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            An integrated, automated platform connecting graduating students with top recruiting companies, automated eligibility verification, and end-to-end selection tracking.
          </p>

          {/* Call to Actions */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {isAuthenticated ? (
              <Link
                to={isOfficer ? '/officer/dashboard' : '/student/dashboard'}
                className="btn btn-lg"
                style={{
                  background: '#ffffff',
                  color: '#1e3a8a',
                  fontWeight: 700,
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                }}
              >
                Go to Your Dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-lg"
                  style={{
                    background: '#ffffff',
                    color: '#1e3a8a',
                    fontWeight: 700,
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Student / Officer Login
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/register"
                  className="btn btn-lg btn-outline"
                  style={{
                    borderColor: '#ffffff',
                    color: '#ffffff',
                    background: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  Student Registration
                </Link>
              </>
            )}
          </div>

          {/* Quick 1-Click Demo Section */}
          {!isAuthenticated && (
            <div
              style={{
                marginTop: '2.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                fontSize: '0.875rem',
              }}
            >
              <span style={{ color: '#bfdbfe', fontWeight: 600 }}>
                ⚡ Quick 1-Click Viva Demo:
              </span>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('student')}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: '#ffffff',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Demo Student (Rahul, CSE)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('officer')}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: '#ffffff',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Demo Placement Officer (Dr. Sharma)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Live KPI Statistics Banner */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Registered Companies</div>
              <div className="stat-value">{stats.totalCompanies || 6}</div>
            </div>
            <div className="stat-icon-wrapper stat-icon-blue">
              <Building2 size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Placement Drives</div>
              <div className="stat-value">{stats.totalDrives || 5}</div>
            </div>
            <div className="stat-icon-wrapper stat-icon-green">
              <Briefcase size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Registered Students</div>
              <div className="stat-value">{stats.totalStudents || 5}</div>
            </div>
            <div className="stat-icon-wrapper stat-icon-purple">
              <Users size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Offers Released</div>
              <div className="stat-value">{stats.totalSelected || 2}</div>
            </div>
            <div className="stat-icon-wrapper stat-icon-amber">
              <Award size={24} />
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
            Engineered for Seamless Campus Hiring
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '0.5rem' }}>
            Built strictly adhering to college recruitment requirements and faculty evaluation standards.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div className="card" style={{ padding: '1.75rem', margin: 0 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Automated Eligibility Engine
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Instant verification of student CGPA, eligible branch codes, active backlogs, and passing year. Prevents ineligible or duplicate applications automatically.
            </p>
          </div>

          <div className="card" style={{ padding: '1.75rem', margin: 0 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <FileCheck2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Application Lifecycle Tracking
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Live stage progression from Applied → Shortlisted → Technical Round → Interview → Selection Offer with customized remarks from the Placement Officer.
            </p>
          </div>

          <div className="card" style={{ padding: '1.75rem', margin: 0 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#f5f3ff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Role-Based Officer Hub
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Dedicated dashboard for the Training & Placement Officer to create drives, manage company profiles, filter candidates, and download comprehensive hiring reports.
            </p>
          </div>
        </div>
      </section>

      {/* Top Recruiting Partners Showcase */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginBottom: '1.5rem' }}>
          Our Premier Recruiting Partners
        </h3>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap',
          }}
        >
          {['Google India', 'Microsoft IDC', 'Amazon India', 'Cisco Systems', 'Deloitte', 'TCS'].map(
            (comp, i) => (
              <div
                key={i}
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                }}
              >
                {comp}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
