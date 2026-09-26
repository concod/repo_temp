/**
 * Security utilities for URL validation and safe navigation
 */

/**
 * Validates if a URL is a safe internal path for redirect
 * Prevents open redirect attacks by ensuring only relative paths are allowed
 */
export const isValidInternalPath = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Remove leading/trailing whitespace
  const cleanUrl = url.trim();

  // Reject empty strings
  if (!cleanUrl) {
    return false;
  }

  // Reject absolute URLs (http://, https://, //, etc.)
  if (cleanUrl.match(/^https?:\/\//) || cleanUrl.startsWith('//')) {
    return false;
  }

  // Reject javascript: protocol and other dangerous schemes
  if (cleanUrl.match(/^(javascript|data|vbscript|file|about):/i)) {
    return false;
  }

  // Must start with / (relative path)
  if (!cleanUrl.startsWith('/')) {
    return false;
  }

  // Reject paths with .. (directory traversal)
  if (cleanUrl.includes('..')) {
    return false;
  }

  // Additional security: reject URLs with suspicious patterns
  const suspiciousPatterns = [
    /[<>'"]/,           // HTML/script injection
    /javascript:/i,      // JS protocol
    /vbscript:/i,       // VBScript protocol
    /data:/i,           // Data URLs
    /\x00-\x1f/,        // Control characters
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(cleanUrl)) {
      return false;
    }
  }

  return true;
};

/**
 * Validates if a redirect URL is allowed based on application routes
 * @param url - The URL to validate
 * @param allowedPaths - Optional array of allowed path prefixes
 */
export const isAllowedRedirectPath = (
  url: string, 
  allowedPaths: string[] = [
    '/home',
    '/agents',
    '/tools',
    '/models',
    '/multi-agents',
    '/data-connectors',
    '/knowledge-base',
    '/workflows',
    '/api-keys',
    '/dashboard',
    '/reports',
    '/users',
    '/profile',
    '/settings'
  ]
): boolean => {
  if (!isValidInternalPath(url)) {
    return false;
  }

  // Check if URL starts with any allowed path
  return allowedPaths.some(allowedPath => 
    url.startsWith(allowedPath) || url === allowedPath
  );
};

/**
 * Sanitizes and validates a redirect URL for safe navigation
 * @param url - The URL to sanitize
 * @returns Safe URL or null if invalid
 */
export const sanitizeRedirectUrl = (url: string | null): string | null => {
  if (!url) {
    return null;
  }

  // Basic validation
  if (!isValidInternalPath(url)) {
    console.warn('[Security] Invalid redirect URL blocked:', url);
    return null;
  }

  // Additional validation against allowed paths
  if (!isAllowedRedirectPath(url)) {
    console.warn('[Security] Redirect URL not in allowed paths:', url);
    return null;
  }

  return url;
};

/**
 * Safe navigation function that validates URLs before redirecting
 */
export const safeNavigate = (
  navigate: (path: string, options?: { replace?: boolean }) => void,
  url: string | null,
  fallbackUrl: string = '/home',
  useReplace: boolean = true
): void => {
  const safeUrl = sanitizeRedirectUrl(url);
  
  if (safeUrl) {
    navigate(safeUrl, { replace: useReplace });
  } else {
    // Use fallback if provided URL is invalid
    navigate(fallbackUrl, { replace: useReplace });
  }
};
