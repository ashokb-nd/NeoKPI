# Documentation Guidelines

## Documentation Levels

### Public API (`npm run docs:generate`)
- **Audience**: External developers, library users
- **Content**: Public methods, classes, usage examples
- **Location**: `docs/generated/`

### Internal Documentation (`npm run docs:internal`)
- **Audience**: Team members, maintainers
- **Content**: All methods including private/internal
- **Location**: `docs/internal/`

## JSDoc Tags Guide

### Visibility
- `@public` - Public API (default)
- `@private` - Internal use only
- `@protected` - For inheritance
- `@internal` - Implementation detail

### Documentation Quality
- `@param {type} name - description` - Parameters
- `@returns {type} description` - Return values
- `@throws {Error} description` - Exceptions
- `@example` - Usage examples
- `@since version` - Version added
- `@deprecated` - Mark as deprecated

## Examples

```javascript
/**
 * Create a new annotation
 * @public
 * @param {object} data - Annotation data
 * @returns {Annotation} New annotation instance
 * @throws {Error} When required fields are missing
 * @example
 * const annotation = new Annotation({
 *   id: 'test',
 *   type: 'detection',
 *   timeRange: { startMs: 0, endMs: 1000 }
 * });
 */
constructor(data) { /* ... */ }

/**
 * Internal helper for validation
 * @private
 * @param {object} data - Data to validate
 * @returns {boolean} Validation result
 */
_validateInternal(data) { /* ... */ }
```

## Commands

- `npm run docs:generate` - Public API docs
- `npm run docs:internal` - Internal docs with private methods
- `npm run docs:all` - Generate both
