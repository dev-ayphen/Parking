'use client';

import { Space } from '@/types/space';

interface SpaceDetailsModalProps {
  space: Space | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SpaceDetailsModal({ space, isOpen, onClose }: SpaceDetailsModalProps) {
  if (!isOpen || !space) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{space.name}</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 w-8 h-8 rounded-full flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">📋 Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Space Name</p>
                <p className="text-base font-medium text-gray-900">{space.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Space Type</p>
                <p className="text-base font-medium text-gray-900">{space.spaceType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Parking For</p>
                <p className="text-base font-medium text-gray-900">{space.parkingFor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Capacity</p>
                <p className="text-base font-medium text-gray-900">{space.capacity} slots</p>
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">📍 Location</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Address</p>
                <p className="text-base font-medium text-gray-900">{space.address}</p>
              </div>
              {space.landmark && (
                <div>
                  <p className="text-sm text-gray-600 uppercase font-semibold">Landmark</p>
                  <p className="text-base font-medium text-gray-900">{space.landmark}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Coordinates</p>
                <p className="text-base font-medium text-gray-900">{space.latitude}, {space.longitude}</p>
              </div>
            </div>
          </section>

          {/* Pricing & Availability */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">💰 Pricing & Availability</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Hourly Price</p>
                <p className="text-base font-medium text-gray-900">₹{space.hourlyRate}/hr</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Availability</p>
                <p className="text-base font-medium text-gray-900">{space.availability}</p>
              </div>
            </div>
          </section>

          {/* Amenities */}
          {space.amenities && space.amenities.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">✨ Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {space.amenities.map((amenity) => (
                  <span key={amenity} className="px-3 py-1 bg-primary bg-opacity-10 border border-primary text-primary rounded-full text-sm font-medium">
                    {amenity}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Space Visibility */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">👁️ Visibility</h3>
            <p className="text-base font-medium text-gray-900">{space.visibility}</p>
          </section>

          {/* Documents */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">📄 Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Document Type</p>
                <p className="text-base font-medium text-gray-900">{space.docType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 uppercase font-semibold">Front Photo</p>
                <p className="text-base font-medium text-gray-900">{space.frontPhoto ? '✅ Uploaded' : '❌ Not provided'}</p>
              </div>
              {space.areaPhoto && (
                <div>
                  <p className="text-sm text-gray-600 uppercase font-semibold">Area Photo</p>
                  <p className="text-base font-medium text-gray-900">✅ Uploaded</p>
                </div>
              )}
            </div>
          </section>

          {/* Owner Information */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">👤 Owner Information</h3>
            <div className="space-y-2">
              <p className="text-base text-gray-900">
                <span className="font-semibold">Name:</span> {space.owner.firstName} {space.owner.lastName}
              </p>
              <p className="text-base text-gray-900">
                <span className="font-semibold">Email:</span> {space.owner.email}
              </p>
            </div>
          </section>

          {/* Status */}
          <section className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 uppercase font-semibold mb-2">Current Status</p>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                space.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : space.status === 'VERIFIED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {space.status === 'PENDING' ? '⏳ Pending Review' : space.status === 'VERIFIED' ? '✅ Approved' : '❌ Rejected'}
            </span>
            {space.status === 'REJECTED' && space.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-600 uppercase font-semibold mb-1">Rejection Reason</p>
                <p className="text-sm text-red-900">{space.rejectionReason}</p>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
