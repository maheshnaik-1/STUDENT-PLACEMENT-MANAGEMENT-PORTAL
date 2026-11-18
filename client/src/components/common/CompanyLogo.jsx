import React, { useState, useEffect } from 'react';

const CompanyLogo = ({
  src,
  name,
  size = 46,
  borderRadius = 10,
  fontSize = '1.1rem',
  className = '',
  style = {},
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = name && name.trim().length > 0
    ? name.trim().substring(0, 2).toUpperCase()
    : 'CO';

  const sizePx = typeof size === 'number' ? `${size}px` : size;
  const radiusPx = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;
  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 46;
  const paddingPx = Math.max(3, Math.round(numSize * 0.08));

  if (!src || failed) {
    return (
      <div
        className={className}
        style={{
          width: sizePx,
          height: sizePx,
          borderRadius: radiusPx,
          background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize,
          flexShrink: 0,
          ...style,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Company'}
      onError={() => setFailed(true)}
      className={className}
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: radiusPx,
        objectFit: 'contain',
        objectPosition: 'center',
        background: '#ffffff',
        padding: `${paddingPx}px`,
        boxSizing: 'border-box',
        border: '1px solid #e2e8f0',
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

export default CompanyLogo;

