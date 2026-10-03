import React from 'react';
import { GraduationCap, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '2rem 1.5rem',
        marginTop: 'auto',
        color: '#64748b',
        fontSize: '0.875rem',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GraduationCap size={18} color="#2563eb" />
          <span style={{ fontWeight: 700, color: '#1e293b' }}>
            Student Placement Management Portal
          </span>
          <span>• B.Tech CSE Mini Project</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Department of Training & Placement</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
