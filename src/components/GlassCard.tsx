import React from 'react';
import { cn } from '../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export default function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div 
      className={cn(
        "bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
