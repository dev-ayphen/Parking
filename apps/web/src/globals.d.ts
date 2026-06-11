// Ambient declarations for non-code imports.
// TS 6 no longer auto-resolves side-effect CSS imports (e.g. `import './globals.css'`),
// so declare them here.
declare module '*.css';
declare module '*.scss';
declare module '*.sass';
