export const allowedOrigins = [
  'https://dashboardmbk.com.br',
  'https://www.dashboardmbk.com.br',
  'http://localhost:8080',
  'http://localhost:5173'
];

export const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://dashboardmbk.com.br',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
};

export const validateEnvironmentVariables = (requiredVars: string[]) => {
  const missingVars = requiredVars.filter(varName => !Deno.env.get(varName));
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }
};

export const getClientIP = (req: Request): string => {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         'unknown';
};

export const createRateLimitKey = (clientIP: string, action: string): string => {
  return `rate_limit:${action}:${clientIP}`;
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>"'&]/g, '').trim();
};