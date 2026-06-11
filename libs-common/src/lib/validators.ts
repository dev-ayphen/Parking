/**
 * Validation utility functions - pure JavaScript with no dependencies
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Check if value is null or undefined
 */
export function isNil(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is null
 */
export function isNull(value: any): value is null {
  return value === null;
}

/**
 * Check if value is undefined
 */
export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is a number
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a string
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is an object
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Check if value is a function
 */
export function isFunction(value: any): value is (...args: any[]) => any {
  return typeof value === 'function';
}

/**
 * Check if value is a Date
 */
export function isDate(value: any): value is Date {
  return value instanceof Date;
}

/**
 * Check if value is a valid date
 */
export function isValidDate(value: any): boolean {
  return isDate(value) && !isNaN(value.getTime());
}

/**
 * Check if value is a Map
 */
export function isMap(value: any): value is Map<any, any> {
  return value instanceof Map;
}

/**
 * Check if value is a Set
 */
export function isSet(value: any): value is Set<any> {
  return value instanceof Set;
}

/**
 * Check if email is valid (basic validation)
 */
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if URL is valid
 */
export function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string matches regex
 */
export function matches(str: string, pattern: RegExp | string): boolean {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return regex.test(str);
}

/**
 * Check if value is an integer
 */
export function isInteger(value: any): value is number {
  return Number.isInteger(value);
}

/**
 * Check if value is a positive number
 */
export function isPositive(value: any): boolean {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is a negative number
 */
export function isNegative(value: any): boolean {
  return isNumber(value) && value < 0;
}

/**
 * Check if value is zero
 */
export function isZero(value: any): boolean {
  return value === 0;
}


/**
 * Check if value is a valid JSON string
 */
export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a credit card number (basic Luhn check)
 */
export function isCreditCard(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Check if phone number is valid (basic validation)
 */
export function isPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\d\s+(),-]{7,}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Check if string is alphanumeric
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]*$/.test(str);
}

/**
 * Check if string is alphabetic only
 */
export function isAlpha(str: string): boolean {
  return /^[a-zA-Z]*$/.test(str);
}

/**
 * Check if value is truthy
 */
export function isTruthy(value: any): boolean {
  return !!value;
}

/**
 * Check if value is falsy
 */
export function isFalsy(value: any): boolean {
  return !value;
}
