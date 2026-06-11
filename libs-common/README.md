# @parkswift/libs-common

Pure JavaScript utility library with no external dependencies. Contains common functions for working with strings, objects, arrays, numbers, and validation.

## Installation

This is a local workspace package. Import from:

```typescript
import { capitalize, camelCase, sum, pick } from '@parkswift/libs-common';
```

## Features

### String Utilities (`strings.ts`)

Text manipulation and conversion functions:

- `capitalize()` - Capitalize first letter
- `camelCase()` - Convert to camelCase
- `snakeCase()` - Convert to snake_case
- `kebabCase()` - Convert to kebab-case
- `padStart()` / `padEnd()` - Pad strings
- `truncate()` - Truncate with ellipsis
- `repeat()` - Repeat string n times
- `reverse()` - Reverse a string
- `trim()` / `stripWhitespace()` - Remove whitespace
- `startsWith()` / `endsWith()` / `includes()` - Check substrings
- `count()` - Count occurrences
- `replaceAll()` - Replace all occurrences
- `between()` - Extract string between two strings
- `slugify()` - Convert to URL-friendly slug
- `isEmpty()` - Check if string is empty

### Object Utilities (`objects.ts`)

Object manipulation and transformation:

- `deepMerge()` - Deep merge multiple objects
- `isPlainObject()` - Check if value is plain object
- `pick()` - Select specific keys
- `omit()` - Exclude specific keys
- `get()` - Get nested value with dot notation
- `set()` - Set nested value with dot notation
- `keys()` / `values()` / `entries()` - Get object properties
- `invert()` - Swap keys and values
- `mapValues()` - Transform values with function
- `filterObject()` - Filter by predicate
- `fromEntries()` - Create object from entries
- `clone()` - Shallow copy
- `deepClone()` - Deep copy

### Array Utilities (`arrays.ts`)

Array manipulation and analysis:

- `chunk()` - Split into groups
- `flatten()` - Flatten nested arrays
- `unique()` / `deduplicate()` - Get unique elements
- `compact()` - Remove falsy values
- `difference()` - Elements in first but not second
- `intersection()` - Common elements
- `hasSameElements()` - Same elements (order independent)
- `shuffle()` - Randomize order
- `sample()` / `sampleMany()` - Random selection
- `groupBy()` - Group by key function
- `toObject()` - Convert to object with key/value functions
- `findIndex()` / `findIndices()` - Find matching indices
- `range()` - Generate number range
- `sum()` / `average()` / `min()` / `max()` - Math functions
- `transpose()` - Transpose 2D array
- `move()` / `insert()` / `removeAt()` - Modify array
- `zip()` - Combine multiple arrays
- `isEmpty()` - Check if array is empty

### Validation Utilities (`validators.ts`)

Type checking and validation:

- `isNil()` / `isNull()` / `isUndefined()` - Check for null/undefined
- `isBoolean()` / `isNumber()` / `isString()` - Type checks
- `isObject()` / `isArray()` / `isFunction()` - Reference types
- `isDate()` / `isValidDate()` - Date checks
- `isMap()` / `isSet()` - Collection types
- `isEmail()` - Email validation
- `isUrl()` - URL validation
- `matches()` - Regex matching
- `isInteger()` - Check for integer
- `isPositive()` / `isNegative()` / `isZero()` - Number comparisons
- `isCreditCard()` - Credit card validation (Luhn)
- `isPhoneNumber()` - Phone number validation
- `isAlphanumeric()` / `isAlpha()` - Character checks
- `isTruthy()` / `isFalsy()` - Boolean checks
- `isJsonString()` - Valid JSON check

### Number Utilities (`numbers.ts`)

Math and numeric operations:

- `round()` / `floor()` / `ceil()` - Rounding functions
- `clamp()` - Constrain to range
- `inRange()` - Check if in range
- `toPercent()` / `parsePercent()` - Percentage conversion
- `formatCurrency()` - Format as currency
- `formatNumber()` - Format with separators
- `abbreviate()` - Abbreviate large numbers (1K, 1M, 1B)
- `padZero()` - Pad with zeros
- `isPrime()` - Check if prime
- `gcd()` / `lcm()` - Greatest/least common multiple
- `isEven()` / `isOdd()` - Parity checks
- `factorial()` - Calculate factorial
- `pow()` / `sqrt()` / `abs()` - Math functions
- `toRadians()` / `toDegrees()` - Angle conversion
- `percentOf()` - Calculate percentage
- `increasePercent()` / `decreasePercent()` - Percent calculations
- `random()` / `randomInt()` - Random numbers
- `lerp()` / `inverseLerp()` - Linear interpolation
- `map()` - Map value between ranges
- `toFixed()` / `toExponential()` - Format numbers
- `sign()` - Get sign of number

## Usage Examples

```typescript
import {
  capitalize,
  camelCase,
  pick,
  unique,
  sum,
  isEmail,
  clamp,
} from '@parkswift/libs-common';

// Strings
capitalize('hello');           // 'Hello'
camelCase('hello-world');      // 'helloWorld'

// Objects
pick({ a: 1, b: 2, c: 3 }, ['a', 'b']); // { a: 1, b: 2 }

// Arrays
unique([1, 2, 2, 3, 3, 3]);   // [1, 2, 3]
sum([1, 2, 3, 4]);            // 10

// Validation
isEmail('test@example.com');  // true

// Numbers
clamp(5, 0, 10);              // 5
clamp(15, 0, 10);             // 10
```

## Building

```bash
pnpm exec nx build libs-common
```

## Testing

```bash
pnpm exec nx test libs-common
```

## Linting

```bash
pnpm exec nx lint libs-common
```

---

**Note**: This is a pure JavaScript library with no external dependencies, making it lightweight and suitable for use in any JavaScript/TypeScript project within the monorepo.
