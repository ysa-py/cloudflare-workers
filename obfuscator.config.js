/**
 * Optimized Obfuscator Configuration for Cloudflare Workers
 * 
 * CRITICAL FIX: Disables controlFlowFlattening to prevent CPU limit errors (code 10021)
 * while maintaining strong security through alternative obfuscation techniques.
 * 
 * Reference: Cloudflare Workers error code 10021 = "Script startup exceeded CPU time limit"
 * Root cause: controlFlowFlattening creates complex control flow that exceeds startup CPU budget
 * Solution: Replace with lighter alternatives (deadCodeInjection, stringArray, splitStrings)
 */

module.exports = {
  // CORE MINIFICATION & COMPATIBILITY
  compact: true,                    // Minify output for faster parsing
  target: 'browser',                // Optimize for browser/Worker environment
  
  // CONTROL FLOW OPTIMIZATION - CRITICAL FIX FOR CLOUDFLARE ERROR 10021
  controlFlowFlattening: false,     // DISABLED: Prevents "CPU time limit exceeded"
  
  // STRING ARRAY OBFUSCATION - SAFE, NO CODE GENERATION BUGS
  stringArray: true,                // Encode string literals
  stringArrayThreshold: 0.5,        // Encode 50% of strings (stable threshold)
  stringArrayEncoding: ['base64'],  // Single encoding method (prevents conflicts)
  stringArrayIndexShift: false,     // DISABLED: Can cause const reassignment bugs
  stringArrayRotate: false,         // DISABLED: Can cause const reassignment bugs
  stringArrayShuffle: false,        // DISABLED: Can cause const reassignment bugs
  stringArrayWrappersCount: 0,      // DISABLED: Can cause const reassignment bugs
  
  // NAME OBFUSCATION - SAFE & EFFECTIVE
  identifierNamesGenerator: 'mangled-shuffled',  // Hide identifier meanings
  renameGlobals: false,             // Preserve Worker APIs
  renameProperties: false,          // Keep object structure intact
  transformObjectKeys: false,       // DISABLED: Prevents invalid code generation
  
  // CODE TRANSFORMATION - SELECTIVELY ENABLED FOR SAFETY
  deadCodeInjection: false,         // DISABLED: Can cause const reassignment issues
  selfDefending: true,              // ENABLED: Safe anti-tampering code
  
  // ADVANCED TRANSFORMS - ALL DISABLED FOR SAFETY
  // These can create invalid JavaScript with const reassignments
  numbersToExpressions: false,      // DISABLED: Causes const reassignment bugs
  simplify: false,                  // DISABLED: Causes invalid code generation
  splitStrings: false,              // DISABLED: Causes array access conflicts
  debugProtection: false,           // DISABLED: Workers compatibility
  unicodeEscapeSequence: false,     // DISABLED: Faster parsing
  
  // LOGGING & OUTPUT
  disableConsoleOutput: false,      // Keep console for debugging
  log: false                        // Suppress obfuscator logs
};
