import React from 'react';

/**
 * FinSparkLogo — unique SVG mark for FinSpark Intelligence.
 *
 * Concept: An upward-trending chart line that peaks at a glowing "spark"
 * (lightning/star burst), representing financial intelligence + energy.
 *
 * Two variants:
 *  - "badge"  → rounded-square background (for sidebar / login)
 *  - "inline" → transparent bg, fits any context
 */
export default function FinSparkLogo({ size = 40, variant = 'badge', style = {} }) {
  // Unique IDs to avoid SVG gradient conflicts when logo appears multiple times
  const uid = variant + size;

  if (variant === 'badge') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={style}
        aria-label="FinSpark Intelligence logo"
      >
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id={`line-${uid}`} x1="5" y1="32" x2="28" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,1)" />
          </linearGradient>
          <filter id={`glow-${uid}`}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Rounded background */}
        <rect width="40" height="40" rx="10" fill={`url(#bg-${uid})`} />

        {/* Subtle grid lines */}
        <line x1="5" y1="28" x2="35" y2="28" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line x1="5" y1="20" x2="35" y2="20" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* Area fill under chart line */}
        <path
          d="M5,32 L11,25 L18,27 L26,14 L26,32 Z"
          fill="rgba(255,255,255,0.07)"
        />

        {/* Chart line: trending up to the spark */}
        <polyline
          points="5,32 11,25 18,27 26,14"
          stroke={`url(#line-${uid})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Spark glow (blurred backdrop) */}
        <circle cx="26" cy="14" r="5" fill="rgba(255,255,255,0.18)" filter={`url(#glow-${uid})`} />

        {/* Spark center dot */}
        <circle cx="26" cy="14" r="2.5" fill="white" />

        {/* Spark rays — 4 directional lines */}
        <line x1="26" y1="8"  x2="26" y2="10"  stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
        <line x1="32" y1="14" x2="30" y2="14"  stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
        <line x1="30" y1="9.5" x2="28.5" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
        <line x1="22" y1="9.5" x2="23.5" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
      </svg>
    );
  }

  // "inline" variant — no background, just the mark scaled to fit
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-label="FinSpark Intelligence logo"
    >
      <defs>
        <linearGradient id={`iline-${uid}`} x1="2" y1="26" x2="22" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <filter id={`iglow-${uid}`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polyline
        points="2,24 8,17 14,20 22,8"
        stroke={`url(#iline-${uid})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22" cy="8" r="2.5" fill="#6366f1" filter={`url(#iglow-${uid})`} />
      <line x1="22" y1="3"  x2="22" y2="5"  stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <line x1="27" y1="8"  x2="25" y2="8"  stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <line x1="25.5" y1="4.5" x2="24" y2="6" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
