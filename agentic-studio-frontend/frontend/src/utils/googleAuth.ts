import type { GoogleCredentialResponse } from '../types/auth';

// Google Sign-In configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '482146741158-q68nmoak32jq9il8moj9e6gtohqkfkjb.apps.googleusercontent.com';

// Utility functions for Google Sign-In integration
export class GoogleAuthUtils {
  /**
   * Initialize Google Sign-In (without creating any buttons)
   */
  static initializeGoogleSignIn(
    callback: (response: GoogleCredentialResponse) => void
  ): void {
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback,
        context: 'signin',
        ux_mode: 'popup',
        auto_prompt: false,
        use_fedcm_for_prompt: false, // Explicitly disable FedCM
      });
      
      // Store callback for later use
      (window as any).__googleSignInCallback = callback;
    }
  }

  /**
   * Trigger Google Sign-In (create button only when clicked)
   */
  static triggerGoogleSignIn(): void {
    if (typeof window !== 'undefined' && window.google) {
      // Create temporary button only when needed
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.visibility = 'hidden';
      document.body.appendChild(tempContainer);

      try {
        // Render button temporarily
        window.google.accounts.id.renderButton(tempContainer, {
          type: 'standard',
          shape: 'rectangular',
          theme: 'outline',
          text: 'signin_with',
          size: 'large',
          logo_alignment: 'left',
        });

        // Wait a moment for button to render, then click it
        setTimeout(() => {
          const googleButton = tempContainer.querySelector('div[role="button"]') as HTMLElement;
          if (googleButton) {
            googleButton.click();
          }
          
          // Clean up immediately after clicking
          setTimeout(() => {
            if (tempContainer.parentNode) {
              tempContainer.parentNode.removeChild(tempContainer);
            }
          }, 100);
        }, 50);

      } catch (error) {
        console.error('Google Sign-In trigger error:', error);
        // Clean up on error
        if (tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }
      }
    }
  }

  /**
   * Load Google Sign-In script
   */
  static loadGoogleScript(onLoad?: () => void): HTMLScriptElement {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    if (onLoad) {
      script.onload = onLoad;
    }
    document.head.appendChild(script);
    return script;
  }

  /**
   * Remove Google Sign-In script and cleanup
   */
  static removeGoogleScript(script: HTMLScriptElement): void {
    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
    }
    
    // Clean up any temporary containers
    const tempContainers = document.querySelectorAll('div[style*="-9999px"]');
    tempContainers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
    
    // Clear stored callback
    if (typeof window !== 'undefined') {
      delete (window as any).__googleSignInCallback;
    }
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement | null, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}
