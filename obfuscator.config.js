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
  // PERFORMANCE & COMPATIBILITY
  compact: true,                    // Reduces output size for faster parsing
  target: 'browser',                // Optimize for browser/Worker environment
  
  // CONTROL FLOW OPTIMIZATION - CRITICAL FOR CPU LIMITS
  controlFlowFlattening: false,     // DISABLED: Main cause of CPU exceeded errors
  controlFlowFlatteningThreshold: 0,
  deadCodeInjection: true,          // Inject unused code (lighter than control flow flattening)
  deadCodeInjectionThreshold: 0.2,  // Inject dead code in 20% of statements (reduced for safety)
  
  // STRING ARRAY ENCODING - STRONGER ALTERNATIVE TO CONTROL FLOW
  stringArray: true,                // Encode string literals into array + getter
  stringArrayThreshold: 0.5,        // Encode 50% of strings (reduced for safety)
  stringArrayEncoding: ['base64'],  // Use base64 encoding for obfuscation
  stringArrayIndexShift: true,      // Add array index shifting
  stringArrayRotate: false,         // Don't rotate on each access (can cause issues)
  stringArrayShuffle: false,        // Don't randomize array order (can cause issues)
  stringArrayWrappersCount: 1,      // Create 1 wrapper function (reduced for safety)
  stringArrayWrappersType: 'variable', // Use variable wrappers (safer than function)
  
  // NAME OBFUSCATION
  identifierNamesGenerator: 'mangled-shuffled',  // Mangle names + shuffle
  renameGlobals: false,             // Don't rename globals (Workers compatibility)
  renameProperties: false,          // Don't rename object properties
  transformObjectKeys: false,       // Don't transform object keys (can cause issues)
  
  // ADDITIONAL OBFUSCATION
  numbersToExpressions: false,      // Don't convert numbers (can cause issues)
  selfDefending: true,              // Add self-defending code
  simplify: false,                  // Don't simplify (can cause issues)
  splitStrings: false,              // Don't split strings (can cause issues)
  
  // DEBUG & SAFETY
  debugProtection: false,           // Don't prevent debugging (Workers compatibility)
  debugProtectionInterval: 0,
  disableConsoleOutput: false,      // Keep console output (safer)
  unicodeEscapeSequence: false,     // Don't use unicode escapes (faster parsing)
  
  // LOGGING
  log: false                        // Suppress obfuscator output
};
