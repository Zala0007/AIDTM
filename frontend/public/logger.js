// Custom Logger for Development
(function() {
  'use strict';
  
  // Check if we're in development by looking at the hostname
  const isDevelopment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  // Enhanced console logger
  const logger = {
    log: (...args) => {
      if (isDevelopment) {
        console.log('[LOG]', new Date().toISOString(), ...args);
      }
    },
    info: (...args) => {
      if (isDevelopment) {
        console.info('[INFO]', new Date().toISOString(), ...args);
      }
    },
    warn: (...args) => {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    },
    error: (...args) => {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    },
    debug: (...args) => {
      if (isDevelopment) {
        console.debug('[DEBUG]', new Date().toISOString(), ...args);
      }
    }
  };
  
  // Make logger available globally
  window.logger = logger;
  
  // Monitor API calls
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    logger.debug('API Request:', url);
    
    try {
      const response = await originalFetch.apply(this, args);
      logger.debug('API Response:', url, response.status);
      return response;
    } catch (error) {
      logger.error('API Error:', url, error);
      throw error;
    }
  };
  
  // Log unhandled errors
  window.addEventListener('error', (event) => {
    logger.error('Unhandled Error:', event.error);
  });
  
  // Log unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection:', event.reason);
  });
  
  logger.info('Logger initialized');
})();
