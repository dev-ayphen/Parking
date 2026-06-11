/**
 * Object utility functions - pure JavaScript with no dependencies
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep merge multiple objects
 */
export function deepMerge<T extends Record<string, any>>(...objects: T[]): T {
  const result = {} as T;

  for (const obj of objects) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (isPlainObject(value) && isPlainObject(result[key])) {
          result[key] = deepMerge(result[key], value) as any;
        } else {
          result[key] = value;
        }
      }
    }
  }

  return result;
}

/**
 * Check if value is a plain object
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Pick specific keys from object
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from object
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Get value from nested object using dot notation path
 */
export function get<T extends Record<string, any>>(
  obj: T,
  path: string,
  defaultValue?: any
): any {
  const keys = path.split('.');
  let value: any = obj;

  for (const key of keys) {
    if (value !== null && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value;
}

/**
 * Set value in nested object using dot notation path
 */
export function set<T extends Record<string, any>>(
  obj: T,
  path: string,
  value: any
): T {
  const keys = path.split('.');
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Get object keys with type safety
 */
export function keys<T extends Record<string, any>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Get object values with type safety
 */
export function values<T extends Record<string, any>>(obj: T): T[keyof T][] {
  return Object.values(obj);
}

/**
 * Get object entries with type safety
 */
export function entries<T extends Record<string, any>>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Invert object (swap keys and values)
 */
export function invert<T extends Record<string, string>>(obj: T): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[obj[key]] = key;
    }
  }
  return result;
}

/**
 * Transform object values with a function
 */
export function mapValues<T extends Record<string, any>, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U
): Record<keyof T, U> {
  const result = {} as Record<keyof T, U>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key as keyof T] = fn(obj[key as keyof T], key as keyof T);
    }
  }
  return result;
}

/**
 * Filter object by predicate
 */
export function filterObject<T extends Record<string, any>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result = {} as Partial<T>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && predicate(obj[key], key as keyof T)) {
      result[key as keyof T] = obj[key as keyof T];
    }
  }
  return result;
}


/**
 * Create object from entries
 */
export function fromEntries<T extends readonly (readonly [string | number, any])[]>(
  entries: T
): Record<string, any> {
  return Object.fromEntries(entries);
}

/**
 * Clone object (shallow copy)
 */
export function clone<T extends Record<string, any>>(obj: T): T {
  return { ...obj } as T;
}

/**
 * Deep clone object
 */
export function deepClone<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any;
  if (obj instanceof Object) {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}
