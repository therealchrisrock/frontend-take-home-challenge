'use client';

import { m } from 'framer-motion';

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'muted';
  className?: string;
}

const sizeClasses = {
  sm: 'w-1 h-1',
  md: 'w-1.5 h-1.5', 
  lg: 'w-2 h-2'
};

const colorClasses = {
  primary: 'bg-blue-500',
  secondary: 'bg-gray-500',
  muted: 'bg-gray-400'
};

const containerVariants = {
  start: {
    transition: {
      staggerChildren: 0.2,
    },
  },
  end: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const dotVariants = {
  start: {
    y: '0%',
  },
  end: {
    y: '100%',
  },
};

const dotTransition = {
  duration: 0.5,
  repeat: Infinity,
  repeatType: 'reverse' as const,
  ease: 'easeInOut',
};

export function LoadingDots({ 
  size = 'md', 
  color = 'primary', 
  className = '' 
}: LoadingDotsProps) {
  return (
    <m.div
      className={`flex space-x-1 ${className}`}
      variants={containerVariants}
      initial="start"
      animate="end"
    >
      {[0, 1, 2].map((index) => (
        <m.div
          key={index}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
          variants={dotVariants}
          transition={dotTransition}
        />
      ))}
    </m.div>
  );
}