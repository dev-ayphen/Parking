import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms have
 * passed without the input changing. Use to throttle search inputs so the
 * keystroke updates the UI immediately but the API call fires once.
 *
 * Example:
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebouncedValue(search, 400);
 *   useEffect(() => { fetchData(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
