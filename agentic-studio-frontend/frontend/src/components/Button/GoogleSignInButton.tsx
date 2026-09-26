import React, { useEffect, useRef } from 'react';
import googleIcon from '../../assets/images/google.svg';
import { useGoogleLogin } from '../../hooks/useGoogleLogin';
import { GoogleAuthUtils } from '../../utils/googleAuth';
import { safeNavigate } from '../../utils/navigationSecurity';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../Spinner/Spinner';
import type { LoginResponse, GoogleCredentialResponse } from '../../types/auth';
import { useNavigate } from 'react-router-dom';

type Props = {
  onSuccess?: (response: LoginResponse) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  variant?: 'default' | 'retry' | 'support';
  children?: React.ReactNode; // For support variant custom text
  icon?: React.ReactNode; // For support variant custom icon
  onClick?: () => void; // For support variant custom action
};

const GoogleSignInButton = ({ onSuccess, onError, disabled = false, variant = 'default', children, icon, onClick }: Props) => {

  const { loginWithGoogle, isLoading, error } = useGoogleLogin();
  const { login } = useAuth();
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const isGoogleInitialized = useRef<boolean>(false);
  const navigate = useNavigate();

  // Handle Google credential response
  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      const errorMsg = 'Google Sign-In failed: No credential received';
      onError?.(errorMsg);
      return;
    }

    try {
      const loginData = await loginWithGoogle(response.credential);
      if (loginData) {
        // Update auth context with login data
        login(loginData.token, loginData);
        
        onSuccess?.(loginData);

        // Secure redirect handling with validation
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        
        // Use secure navigation with validation and cleanup
        try {
          if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
          }
          safeNavigate(navigate, redirectUrl, '/home', true);
        } catch (error) {
          console.error('[Navigation] Redirect failed, using fallback:', error);
          navigate('/home', { replace: true });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      onError?.(errorMessage);
    }
  };

  // Initialize Google Sign-In (without making API calls)
  const initializeGoogleSignIn = () => {
    GoogleAuthUtils.initializeGoogleSignIn(handleCredentialResponse);
    isGoogleInitialized.current = true;
  };

  // Handle button click - only trigger Google Sign-In on click
  const handleButtonClick = () => {
    // For support variant, use custom onClick
    if (variant === 'support' && onClick) {
      onClick();
      return;
    }
    
    if (!isGoogleInitialized.current) {
      console.warn('Google Sign-In not yet initialized');
      return;
    }
    
    if (isLoading) {
      console.warn('Google Sign-In already in progress');
      return;
    }
    
    // This is the ONLY place where Google API calls should happen
    console.log('Triggering Google Sign-In...');
    GoogleAuthUtils.triggerGoogleSignIn();
  };

  useEffect(() => {
    // Load Google Sign-In script (but don't initialize/render yet)
    scriptRef.current = GoogleAuthUtils.loadGoogleScript(initializeGoogleSignIn);

    return () => {
      // Cleanup script on unmount
      if (scriptRef.current) {
        GoogleAuthUtils.removeGoogleScript(scriptRef.current);
      }
    };
  }, []);

  // Show error if any
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  return (
    <>
      {/* Clean Loading Overlay - Just Spinner */}
      {isLoading && (
        <div className="loading-overlay">
          <Spinner size={80} />
        </div>
      )}

      {/* Google Sign-In Button */}
      <div className={`google-signin-container ${variant === 'retry' ? 'google-signin-container--retry' : ''} ${variant === 'support' ? 'google-signin-container--support' : ''}`}>
        <button
          className={`btn--google ${variant === 'retry' ? 'btn--google--retry' : ''} ${variant === 'support' ? 'btn--google--support' : ''} ${disabled || isLoading ? 'btn--google--disabled' : ''}`}
          disabled={disabled || isLoading}
          onClick={handleButtonClick}
        >
          {variant === 'support' ? (
            <>
              {icon && <span className="btn--google__icon">{icon}</span>}
              <span className="body-medium--medium btn--google__text">
                {children || 'Contact Support'}
              </span>
            </>
          ) : variant === 'retry' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
                <path d="M14.1667 3.89C13.5179 2.99459 12.6661 2.2658 11.681 1.76342C10.696 1.26105 9.60584 0.999418 8.50008 1C4.88208 1 1.90675 3.74333 1.53808 7.264L1.46875 7.92667L2.79542 8.066L2.86408 7.40267C2.98825 6.22921 3.47561 5.12377 4.25817 4.24057C5.04073 3.35738 6.07946 2.74048 7.22943 2.47594C8.37941 2.2114 9.58329 2.31242 10.6731 2.7649C11.7629 3.21737 12.6843 3.99875 13.3087 5H10.8334V6.33333H15.5001V1.66667H14.1667V3.89ZM14.2047 7.934L14.1354 8.59733C14.0111 9.77061 13.5237 10.8758 12.7411 11.7588C11.9586 12.6418 10.92 13.2586 9.77024 13.5231C8.62043 13.7876 7.41673 13.6867 6.32703 13.2344C5.23732 12.7821 4.31595 12.001 3.69142 11H6.16675V9.66667H1.50008V14.3333H2.83342V12.11C3.48222 13.0054 4.3341 13.7342 5.31914 14.2366C6.30419 14.739 7.39433 15.0006 8.50008 15C12.1174 15 15.0934 12.2567 15.4614 8.736L15.5307 8.07333L14.2047 7.934Z" fill="white"/>
              </svg>
              <span className="headline-5 btn--google__text">Retry with Google</span>
            </>
          ) : (
            <>
              <img src={googleIcon} alt="Google" className="btn--google__icon" />
              <span className="headline-5 btn--google__text">Continue with Google</span>
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default GoogleSignInButton;