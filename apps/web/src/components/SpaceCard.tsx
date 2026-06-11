'use client';

import { Space } from '@/types/space';

interface SpaceCardProps {
  space: Space;
  onView: (space: Space) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function SpaceCard({
  space,
  onView,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: SpaceCardProps) {
  const statusConfig = {
    PENDING: {
      bg: 'from-amber-50 to-amber-100',
      border: 'border-amber-300',
      badge: 'bg-amber-100 text-amber-800 border border-amber-300',
      badgeIcon: '⏳',
      text: 'Pending Review',
      topColor: 'from-amber-400 to-amber-500'
    },
    VERIFIED: {
      bg: 'from-emerald-50 to-emerald-100',
      border: 'border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      badgeIcon: '✅',
      text: 'Approved',
      topColor: 'from-emerald-400 to-emerald-500'
    },
    REJECTED: {
      bg: 'from-red-50 to-red-100',
      border: 'border-red-300',
      badge: 'bg-red-100 text-red-800 border border-red-300',
      badgeIcon: '❌',
      text: 'Rejected',
      topColor: 'from-red-400 to-red-500'
    },
  };

  const config = statusConfig[space.status as keyof typeof statusConfig];

  return (
    <div className={`bg-gradient-to-br ${config.bg} border-2 ${config.border} rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group hover:-translate-y-1`}>
      {/* Color Bar */}
      <div className={`h-1 bg-gradient-to-r ${config.topColor}`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{space.name}</h3>
            <p className="text-sm text-gray-700 flex items-center gap-1 mt-2 font-semibold">
              📍 {space.address}
            </p>
            <p className="text-xs text-gray-600 mt-2 bg-indigo-100 px-2 py-1 rounded-full inline-block">
              📌 {space.spaceType}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${config.badge}`}>
            {config.badgeIcon} {config.text}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-gray-300">
          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <p className="text-xs text-gray-700 uppercase font-bold tracking-wide">🏗️ Capacity</p>
            <p className="text-2xl font-bold text-primary mt-1">{space.capacity}</p>
          </div>
          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <p className="text-xs text-gray-700 uppercase font-bold tracking-wide">💰 Price</p>
            <p className="text-2xl font-bold text-primary mt-1">₹{space.hourlyRate}/hr</p>
          </div>
          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <p className="text-xs text-gray-700 uppercase font-bold tracking-wide">🚗 Type</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{space.spaceType}</p>
          </div>
        </div>

        {/* Owner Info */}
        <div className="mb-5 bg-white bg-opacity-40 rounded-lg p-4 border border-white border-opacity-50">
          <p className="text-xs text-gray-700 uppercase font-bold tracking-wide mb-2">👤 Owner</p>
          <p className="text-sm font-bold text-gray-900">
            {space.owner.firstName} {space.owner.lastName}
          </p>
          <p className="text-xs text-gray-600 mt-1 font-mono">{space.owner.email}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onView(space)}
            className="flex-1 px-4 py-3 bg-white hover:bg-gray-50 text-gray-900 rounded-xl font-bold transition-all duration-200 border-2 border-gray-300 hover:border-indigo-400 transform hover:scale-105 active:scale-95"
          >
            👁️ View Details
          </button>

          {space.status === 'PENDING' && (
            <>
              <button
                onClick={() => onApprove(space.id)}
                disabled={isApproving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {isApproving ? '⏳ ...' : '✅ Approve'}
              </button>
              <button
                onClick={() => onReject(space.id)}
                disabled={isRejecting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {isRejecting ? '⏳ ...' : '❌ Reject'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
