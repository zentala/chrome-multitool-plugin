/**
 * Tells TypeScript how to handle imports for CSS Modules (*.module.css).
 * When you import a CSS Module, it will be treated as an object where keys
 * are the class names defined in the CSS file, and values are the generated,
 * unique class names (strings).
 */
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

/**
 * Optional: Add declarations for standard CSS files if you plan to import them directly.
 * This treats them as simple strings (less common with modern bundling).
 */
// declare module '*.css' {
//   const content: string;
//   export default content;
// } 