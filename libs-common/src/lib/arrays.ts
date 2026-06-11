/**
 * Array utility functions - pure JavaScript with no dependencies
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Chunk array into groups of given size
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Chunk size must be positive');
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Flatten nested array
 */
export function flatten<T>(arr: any[], depth = Infinity): T[] {
  if (depth === 0) return arr;
  const result: T[] = [];

  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...(flatten(item, depth - 1) as T[]));
    } else {
      result.push(item);
    }
  }

  return result;
}

/**
 * Get unique elements from array
 */
export function unique<T>(arr: T[], key?: (item: T) => any): T[] {
  if (!key) {
    return [...new Set(arr)];
  }

  const seen = new Set();
  const result: T[] = [];

  for (const item of arr) {
    const value = key(item);
    if (!seen.has(value)) {
      seen.add(value);
      result.push(item);
    }
  }

  return result;
}

/**
 * Remove duplicates and return unique elements
 */
export function deduplicate<T>(arr: T[], key?: (item: T) => any): T[] {
  return unique(arr, key);
}

/**
 * Compact array (remove falsy values)
 */
export function compact<T>(arr: (T | null | undefined | false | 0 | '')[]): T[] {
  return arr.filter(Boolean) as T[];
}

/**
 * Find difference between two arrays
 */
export function difference<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter((item) => !arr2.includes(item));
}

/**
 * Find intersection of two arrays
 */
export function intersection<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter((item) => arr2.includes(item));
}

/**
 * Check if arrays have same elements (order independent)
 */
export function hasSameElements<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((item, idx) => item === sorted2[idx]);
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get random element from array
 */
export function sample<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Cannot sample from empty array');
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get n random elements from array
 */
export function sampleMany<T>(arr: T[], n: number): T[] {
  if (n > arr.length) throw new Error('Sample size cannot exceed array length');
  const shuffled = shuffle(arr);
  return shuffled.slice(0, n);
}

/**
 * Group array elements by a key
 */
export function groupBy<T>(arr: T[], key: (item: T) => string | number): Record<string | number, T[]> {
  const result: Record<string | number, T[]> = {};

  for (const item of arr) {
    const groupKey = key(item);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
  }

  return result;
}

/**
 * Map array to object using key and value functions
 */
export function toObject<T, K extends string | number, V>(
  arr: T[],
  keyFn: (item: T) => K,
  valueFn: (item: T) => V
): Record<K, V> {
  const result: Record<K, V> = {} as any;

  for (const item of arr) {
    result[keyFn(item)] = valueFn(item);
  }

  return result;
}

/**
 * Find index matching predicate
 */
export function findIndex<T>(arr: T[], predicate: (item: T, index: number) => boolean): number {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i)) return i;
  }
  return -1;
}

/**
 * Find all indices matching predicate
 */
export function findIndices<T>(arr: T[], predicate: (item: T, index: number) => boolean): number[] {
  const indices: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i)) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Range of numbers
 */
export function range(start: number, end: number, step = 1): number[] {
  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else if (step < 0) {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  return result;
}

/**
 * Sum array elements
 */
export function sum(arr: number[]): number {
  return arr.reduce((acc, val) => acc + val, 0);
}

/**
 * Average of array elements
 */
export function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

/**
 * Min value in array
 */
export function min(arr: number[]): number {
  return Math.min(...arr);
}

/**
 * Max value in array
 */
export function max(arr: number[]): number {
  return Math.max(...arr);
}

/**
 * Transpose 2D array
 */
export function transpose<T>(arr: T[][]): T[][] {
  if (arr.length === 0) return [];
  const result: T[][] = [];
  for (let col = 0; col < arr[0].length; col++) {
    const newRow: T[] = [];
    for (let row = 0; row < arr.length; row++) {
      newRow.push(arr[row][col]);
    }
    result.push(newRow);
  }
  return result;
}

/**
 * Move element from one index to another
 */
export function move<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}

/**
 * Insert element at index
 */
export function insert<T>(arr: T[], index: number, ...items: T[]): T[] {
  const result = [...arr];
  result.splice(index, 0, ...items);
  return result;
}

/**
 * Remove element at index
 */
export function removeAt<T>(arr: T[], index: number): T[] {
  const result = [...arr];
  result.splice(index, 1);
  return result;
}

/**
 * Zip multiple arrays together
 */
export function zip<T extends any[]>(...arrays: T[][]): T[] {
  if (arrays.length === 0) return [];
  const result: T[] = [];
  const minLength = Math.min(...arrays.map((arr) => arr.length));

  for (let i = 0; i < minLength; i++) {
    const tuple: any[] = [];
    for (const arr of arrays) {
      tuple.push(arr[i]);
    }
    result.push(tuple as T);
  }

  return result;
}

/**
 * Check if array is empty
 */
export function isEmptyArray<T>(arr: T[]): boolean {
  return arr.length === 0;
}
