import React from 'react';

interface LogoProps {
  variant?: 'icon' | 'full' | 'wordmark';
  color?: 'teal' | 'white' | 'dark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { icon: 24, full: 100, wordmark: 80 },
  sm: { icon: 32, full: 140, wordmark: 100 },
  md: { icon: 48, full: 200, wordmark: 140 },
  lg: { icon: 64, full: 280, wordmark: 200 },
  xl: { icon: 96, full: 400, wordmark: 280 },
};

const colorMap = {
  teal: '#0D9488',
  white: '#FFFFFF',
  dark: '#1F2937',
};

export function Logo({ 
  variant = 'full', 
  color = 'teal', 
  size = 'md',
  className = '' 
}: LogoProps) {
  const strokeColor = colorMap[color];
  const dimensions = sizeMap[size];

  if (variant === 'icon') {
    const iconSize = dimensions.icon;
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 100 80" 
        fill="none"
        width={iconSize}
        height={iconSize * 0.8}
        className={className}
        aria-label="MitaSafi"
      >
        <g fill="none" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 72 L8 35 L30 12"/>
          <path d="M30 12 L50 32"/>
          <path d="M50 32 L70 12"/>
          <path d="M70 12 L92 35 L92 72"/>
          <path d="M8 72 L92 72"/>
          <path d="M32 48 L50 30 L68 48"/>
          <path d="M36 48 L36 65 L64 65 L64 48"/>
          <path d="M46 65 L46 54 L54 54 L54 65"/>
        </g>
      </svg>
    );
  }

  if (variant === 'wordmark') {
    return (
      <span 
        className={`font-semibold tracking-tight ${className}`}
        style={{ 
          color: strokeColor,
          fontSize: dimensions.wordmark * 0.3,
        }}
      >
        MitaSafi
      </span>
    );
  }

  // Full logo with icon + wordmark
  const fullWidth = dimensions.full;
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 320 80" 
      fill="none"
      width={fullWidth}
      height={fullWidth * 0.25}
      className={className}
      aria-label="MitaSafi"
    >
      {/* Icon */}
      <g fill="none" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 68 L8 32 L28 12"/>
        <path d="M28 12 L45 28"/>
        <path d="M45 28 L62 12"/>
        <path d="M62 12 L82 32 L82 68"/>
        <path d="M8 68 L82 68"/>
        <path d="M30 45 L45 30 L60 45"/>
        <path d="M33 45 L33 60 L57 60 L57 45"/>
        <path d="M42 60 L42 52 L48 52 L48 60"/>
      </g>
      
      {/* Wordmark */}
      <text 
        x="100" 
        y="52" 
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
        fontSize="36" 
        fontWeight="600" 
        fill={strokeColor}
      >
        MitaSafi
      </text>
    </svg>
  );
}

// Standalone icon component for app icons with background
export function LogoAppIcon({ 
  size = 48,
  className = '' 
}: { 
  size?: number;
  className?: string;
}) {
  const scale = size / 100;
  const strokeWidth = Math.max(4, 5 * scale);
  
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="MitaSafi"
    >
      <rect width="100" height="100" rx="20" fill="#0D9488"/>
      
      <g 
        fill="none" 
        stroke="#FFFFFF" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        transform="translate(10, 15)"
      >
        <path d="M6 62 L6 30 L24 10"/>
        <path d="M24 10 L40 26"/>
        <path d="M40 26 L56 10"/>
        <path d="M56 10 L74 30 L74 62"/>
        <path d="M6 62 L74 62"/>
        <path d="M26 42 L40 26 L54 42"/>
        <path d="M29 42 L29 56 L51 56 L51 42"/>
        <path d="M37 56 L37 48 L43 48 L43 56"/>
      </g>
    </svg>
  );
}

export default Logo;
