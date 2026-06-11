/**
 * Number utility functions - pure JavaScript with no dependencies
 */

/**
 * Round number to specific decimal places
 */
export function round(num: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Floor number to specific decimal places
 */
export function floor(num: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(num * factor) / factor;
}

/**
 * Ceil number to specific decimal places
 */
export function ceil(num: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.ceil(num * factor) / factor;
}


/**
 * Clamp number between min and max
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Check if number is in range
 */
export function inRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

/**
 * Convert number to percentage string
 */
export function toPercent(num: number, decimals = 2): string {
  return `${round(num * 100, decimals)}%`;
}

/**
 * Parse percent string to decimal
 */
export function parsePercent(percentStr: string): number {
  const num = parseFloat(percentStr.replace('%', ''));
  return isNaN(num) ? 0 : num / 100;
}

/**
 * Format number as currency
 */
export function formatCurrency(num: number, currency = 'USD', decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Abbreviate large numbers (1000 -> 1K, 1000000 -> 1M)
 */
export function abbreviate(num: number, decimals = 1): string {
  const units = ['', 'K', 'M', 'B', 'T'];
  let unitIndex = 0;

  while (Math.abs(num) >= 1000 && unitIndex < units.length - 1) {
    num /= 1000;
    unitIndex++;
  }

  return `${round(num, decimals)}${units[unitIndex]}`;
}

/**
 * Pad number with zeros
 */
export function padZero(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

/**
 * Check if number is prime
 */
export function isPrime(num: number): boolean {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;

  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Get greatest common divisor (GCD)
 */
export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Get least common multiple (LCM)
 */
export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Check if number is even
 */
export function isEven(num: number): boolean {
  return num % 2 === 0;
}

/**
 * Check if number is odd
 */
export function isOdd(num: number): boolean {
  return num % 2 !== 0;
}

/**
 * Get factorial of number
 */
export function factorial(num: number): number {
  if (num < 0) throw new Error('Factorial is not defined for negative numbers');
  if (num === 0 || num === 1) return 1;

  let result = 1;
  for (let i = 2; i <= num; i++) {
    result *= i;
  }
  return result;
}

/**
 * Get power of number
 */
export function pow(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

/**
 * Get square root of number
 */
export function sqrt(num: number): number {
  return Math.sqrt(num);
}

/**
 * Get absolute value
 */
export function abs(num: number): number {
  return Math.abs(num);
}

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate percentage of a number
 */
export function percentOf(num: number, total: number): number {
  if (total === 0) return 0;
  return (num / total) * 100;
}

/**
 * Calculate increase percentage
 */
export function increasePercent(original: number, percentage: number): number {
  return original + original * (percentage / 100);
}

/**
 * Calculate decrease percentage
 */
export function decreasePercent(original: number, percentage: number): number {
  return original - original * (percentage / 100);
}

/**
 * Generate random number between min and max
 */
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Lerp (linear interpolation) between two numbers
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Inverse lerp - find t value from current value
 */
export function inverseLerp(start: number, end: number, current: number): number {
  return (current - start) / (end - start);
}

/**
 * Map value from one range to another
 */
export function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/**
 * Convert number to fixed string
 */
export function toFixed(num: number, digits = 0): string {
  return num.toFixed(digits);
}

/**
 * Convert number to exponential notation
 */
export function toExponential(num: number, digits = 0): string {
  return num.toExponential(digits);
}

/**
 * Get sign of number (-1, 0, or 1)
 */
export function sign(num: number): -1 | 0 | 1 {
  if (num > 0) return 1;
  if (num < 0) return -1;
  return 0;
}
