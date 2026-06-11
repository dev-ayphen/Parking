/**
 * String utility functions - pure JavaScript with no dependencies
 */

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
}

/**
 * Convert string to snake_case
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Convert string to kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Pad string to a given length
 */
export function padStart(str: string, length: number, char = ' '): string {
  return String(str).padStart(length, char);
}

/**
 * Pad string end to a given length
 */
export function padEnd(str: string, length: number, char = ' '): string {
  return String(str).padEnd(length, char);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number, suffix = '...'): string {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Repeat string n times
 */
export function repeat(str: string, count: number): string {
  return str.repeat(count);
}

/**
 * Reverse a string
 */
export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * Remove whitespace from both ends
 */
export function trim(str: string): string {
  return str.trim();
}

/**
 * Remove all whitespace
 */
export function stripWhitespace(str: string): string {
  return str.replace(/\s/g, '');
}

/**
 * Check if string starts with substring
 */
export function startsWith(str: string, searchStr: string): boolean {
  return str.startsWith(searchStr);
}

/**
 * Check if string ends with substring
 */
export function endsWith(str: string, searchStr: string): boolean {
  return str.endsWith(searchStr);
}

/**
 * Check if string includes substring
 */
export function includes(str: string, searchStr: string): boolean {
  return str.includes(searchStr);
}

/**
 * Count occurrences of substring in string
 */
export function count(str: string, searchStr: string): number {
  if (!searchStr) return 0;
  return str.split(searchStr).length - 1;
}

/**
 * Replace all occurrences (legacy support for older JS versions)
 */
export function replaceAll(str: string, search: string, replace: string): string {
  return str.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
}

/**
 * Get string between two strings
 */
export function between(str: string, start: string, end: string): string {
  const startIdx = str.indexOf(start);
  if (startIdx === -1) return '';
  const endIdx = str.indexOf(end, startIdx + start.length);
  if (endIdx === -1) return '';
  return str.substring(startIdx + start.length, endIdx);
}

/**
 * Convert string to slug (URL-friendly)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if string is empty or whitespace only
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}
