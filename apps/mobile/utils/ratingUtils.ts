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
    // "New" listing — blue accent (distinct from a poor rating, which is red).
    // A new space has NO rating; showing it in blue reads as "fresh", never "bad".
    return {
      label: 'New',
      bgColor: '#EFF6FF', // blue-50
      textColor: '#2563EB', // blue-600
      iconColor: '#3B82F6', // blue-500
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
