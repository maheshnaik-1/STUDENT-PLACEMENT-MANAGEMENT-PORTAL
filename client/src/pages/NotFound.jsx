import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '5rem 1.5rem',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <div
        className="brand-icon"
        style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem' }}
      >
        <GraduationCap size={32} />
      </div>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', color: '#334155', marginBottom: '0.75rem' }}>
        Page Not Found
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
        The page you are looking for does not exist or you may need to sign in to access it.
      </p>
      <Link to="/" className="btn btn-primary">
        <ArrowLeft size={16} />
        <span>Return to Home Page</span>
      </Link>
    </div>
  );
};

export default NotFound;
