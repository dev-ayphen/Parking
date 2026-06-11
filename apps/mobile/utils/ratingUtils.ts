export interface RatingStyle {
  label: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
  isNew: boolean;
}

export function getRatingStyle(rating: number | undefined | null): RatingStyle {
  const numRating = Number(rating) || 0;

  if (numRating === 0) {
    return {
      label: 'New',
      bgColor: '#F1F5F9', // slate-100
      textColor: '#64748B', // slate-500
      iconColor: '#94A3B8', // slate-400
      isNew: true,
    };
  }

  if (numRating >= 4.0) {
    return {
      label: numRating.toFixed(1),
      bgColor: '#F0FDF4', // green-50
      textColor: '#16A34A', // green-600
      iconColor: '#16A34A',
      isNew: false,
    };
  }

  if (numRating >= 3.0) {
    return {
      label: numRating.toFixed(1),
      bgColor: '#FEF3C7', // amber-100
      textColor: '#D97706', // amber-600
      iconColor: '#D97706',
      isNew: false,
    };
  }

  // 0.1 - 2.9
  return {
    label: numRating.toFixed(1),
    bgColor: '#FEF2F2', // red-50
    textColor: '#DC2626', // red-600
    iconColor: '#DC2626',
    isNew: false,
  };
}
