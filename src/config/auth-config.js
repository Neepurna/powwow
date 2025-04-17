/**
 * Authentication Configuration for the Powwow App
 * This file contains settings related to Firebase Authentication
 */

// Default to redirect-based authentication
export const authConfig = {
  // Prefer redirect-based authentication
  preferRedirect: true,
  
  // Timeout for popup authentication (in milliseconds)
  popupTimeout: 30000,
  
  // Additional auth provider options
  providerOptions: {
    google: {
      // Custom parameters for Google provider
      customParameters: {
        // Force account selection
        prompt: 'select_account',
        // Request full profile access
        access_type: 'offline'
      }
    }
  }
};

export default authConfig;
