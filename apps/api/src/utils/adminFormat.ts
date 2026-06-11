/**
 * Shared formatters for admin service responses.
 * Moved out of admin.service.ts to allow splitting into focused sub-services.
 */

export const formatUserType = (role: string, hasSpaces: boolean): string => {
  if (role === 'OWNER' && hasSpaces) return 'Owner & Parker';
  if (role === 'OWNER') return 'Owner';
  if (role === 'ADMIN') return 'Admin';
  return 'Parker';
};

export const formatDateShort = (d: Date): string =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateMid = (d: Date): string =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const timeAgo = (d: Date): string => {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};
