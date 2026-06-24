import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const roundedMap = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height = 16,
  rounded = 'md',
}) => (
  <div
    className={`animate-pulse bg-neutral-200 ${roundedMap[rounded]} ${className}`}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    }}
  />
);

export const SkeletonCircle: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => (
  <Skeleton
    width={size}
    height={size}
    rounded="full"
    className={className}
  />
);

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, columns = 5 }) => (
  <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
    <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width="100%" height={14} className="flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="px-6 py-4 border-b border-neutral-100 flex gap-4 items-center">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton
            key={c}
            width="100%"
            height={16}
            className="flex-1"
          />
        ))}
      </div>
    ))}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white border border-neutral-200 rounded-xl p-6">
    <div className="flex items-start justify-between mb-4">
      <Skeleton width={80} height={12} />
      <SkeletonCircle size={32} />
    </div>
    <Skeleton width={120} height={28} className="mb-2" />
    <Skeleton width={140} height={12} />
  </div>
);

