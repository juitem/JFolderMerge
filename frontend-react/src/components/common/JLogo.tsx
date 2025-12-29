import React from 'react';

export const JLogo: React.FC<{ size?: number, style?: React.CSSProperties }> = ({ size = 24, style }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={style}
        >
            <defs>
                <linearGradient id="rainbow_grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f87171" /> {/* Red */}
                    <stop offset="20%" stopColor="#fbbf24" /> {/* Amber */}
                    <stop offset="40%" stopColor="#34d399" /> {/* Green */}
                    <stop offset="60%" stopColor="#60a5fa" /> {/* Blue */}
                    <stop offset="80%" stopColor="#818cf8" /> {/* Indigo */}
                    <stop offset="100%" stopColor="#c084fc" /> {/* Purple */}
                </linearGradient>
            </defs>
            {/* Circle Background */}
            <circle cx="12" cy="12" r="12" fill="url(#rainbow_grad)" />

            {/* Tilted J */}
            <text
                x="50%"
                y="55%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="bold"
                fontFamily="sans-serif"
                transform="rotate(15, 12, 12)" // Tilted 15 degrees around center
            >
                J
            </text>
        </svg>
    );
};
