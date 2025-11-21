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
  deadCodeInjectionThreshold: 0.3,  // Inject dead code in 30% of statements
  
  // STRING ARRAY ENCODING - STRONGER ALTERNATIVE TO CONTROL FLOW
  stringArray: true,                // Encode string literals into array + getter
  stringArrayThreshold: 0.75,       // Encode 75% of strings
  stringArrayEncoding: ['base64'],  // Use base64 encoding for obfuscation
  stringArrayIndexShift: true,      // Add array index shifting
  stringArrayRotate: true,          // Rotate array on each access
  stringArrayShuffle: true,         // Randomize array order
  stringArrayWrappersCount: 2,      // Create 2 wrapper functions
  stringArrayWrappersChainedCalls: true,  // Chain wrapper calls
  stringArrayWrappersParametersMaxCount: 3, // Max 3 wrapper parameters
  stringArrayWrappersType: 'function',    // Use function wrappers
  
  // NAME OBFUSCATION
  identifierNamesGenerator: 'mangled-shuffled',  // Mangle names + shuffle
  renameGlobals: false,             // Don't rename globals (Workers compatibility)
  renameProperties: false,          // Don't rename object properties
  transformObjectKeys: true,        // Transform computed property access
  
  // ADDITIONAL OBFUSCATION
  numbersToExpressions: true,       // Convert numbers to expressions
  rotateStringArray: true,          // Rotate string array
  selfDefending: true,              // Add self-defending code
  simplify: true,                   // Simplify code (can help CPU)
  splitStrings: true,               // Split long strings
  splitStringsChunkLength: 5,       // Split into 5-char chunks
  
  // DEBUG & SAFETY
  debugProtection: false,           // Don't prevent debugging (Workers compatibility)
  debugProtectionInterval: 0,
  disableConsoleOutput: true,       // Remove console.log calls
  unicodeEscapeSequence: false,     // Don't use unicode escapes (faster parsing)
  
  // LOGGING
  log: false                        // Suppress obfuscator output
};
