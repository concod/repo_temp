import { useState } from "react";
import logo from "../../assets/images/ia-logo.svg";
import GoogleSignInButton from "../../components/Button/GoogleSignInButton";
import secureBadge from "../../assets/images/secure-badge.svg";
import fastBadge from "../../assets/images/fast-badge.svg";
import teamBadge from "../../assets/images/team-badge.svg";
import Badge from "../../components/Badge/Badge";
import type { LoginResponse } from "../../types/auth";
import errorIcon from "../../assets/images/error-badge.svg";

const LoginPage = () => {
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLoginSuccess = (response: LoginResponse) => {
    console.log("Login successful:", response);
    // Clear any previous auth error on successful login
    setAuthError(null);
    // Redirect happens automatically in the GoogleSignInButton component
  };

  const handleLoginError = (error: string) => {
    console.error("Login error:", error);
    setAuthError(error);
  };


  return (
    <div className="login">
      <div className="login__bg-gradient login__bg-gradient--left"></div>
      <div className="login__bg-gradient login__bg-gradient--right"></div>
      <div className="login__card">
        <div className="login__logo">
          <img src={logo} alt="logo" />
        </div>

        {/* Show error state components when there's an auth error */}
        {authError ? (
          <>
            <div className="login__error-icon">
              <img src={errorIcon} alt="error" />
            </div>
            <div className="login__content-error">
              <h1 className="headline-1 login__heading">Sign in Failed</h1>
              <p className="body-medium--medium login__text">
                We couldn't sign you in to Agentic Retail Automation Platform.
                Please check your account and try again.
              </p>
            </div>
            <div className="login__error-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 12C8.22666 12 8.4168 11.9232 8.5704 11.7696C8.724 11.616 8.80053 11.4261 8.8 11.2C8.79946 10.9739 8.72266 10.784 8.5696 10.6304C8.41653 10.4768 8.22666 10.4 8 10.4C7.77333 10.4 7.58346 10.4768 7.4304 10.6304C7.27733 10.784 7.20053 10.9739 7.2 11.2C7.19946 11.4261 7.27626 11.6163 7.4304 11.7704C7.58453 11.9245 7.7744 12.0011 8 12ZM7.2 8.8H8.8V4H7.2V8.8ZM8 16C6.89333 16 5.85333 15.7899 4.88 15.3696C3.90667 14.9493 3.06 14.3795 2.34 13.66C1.62 12.9405 1.05013 12.0939 0.630401 11.12C0.210668 10.1461 0.000534346 9.10613 1.01266e-06 8C-0.00053232 6.89386 0.209601 5.85387 0.630401 4.88C1.0512 3.90613 1.62107 3.05947 2.34 2.34C3.05893 1.62053 3.9056 1.05067 4.88 0.6304C5.8544 0.210133 6.8944 0 8 0C9.10559 0 10.1456 0.210133 11.12 0.6304C12.0944 1.05067 12.9411 1.62053 13.66 2.34C14.3789 3.05947 14.9491 3.90613 15.3704 4.88C15.7917 5.85387 16.0016 6.89386 16 8C15.9984 9.10613 15.7883 10.1461 15.3696 11.12C14.9509 12.0939 14.3811 12.9405 13.66 13.66C12.9389 14.3795 12.0923 14.9496 11.12 15.3704C10.1477 15.7912 9.10773 16.0011 8 16ZM8 14.4C9.78666 14.4 11.3 13.78 12.54 12.54C13.78 11.3 14.4 9.78666 14.4 8C14.4 6.21333 13.78 4.7 12.54 3.46C11.3 2.22 9.78666 1.6 8 1.6C6.21333 1.6 4.7 2.22 3.46 3.46C2.22 4.7 1.6 6.21333 1.6 8C1.6 9.78666 2.22 11.3 3.46 12.54C4.7 13.78 6.21333 14.4 8 14.4Z"
                  fill="#F23131"
                />
              </svg>
              <div className="error__content">
                <h5 className="headline-5 error__heading">
                  Authentication Error
                </h5>
                <p className="body-medium--regular error__text">
                  Google sign-in failed. Please try again or switch your
                  account.
                </p>
              </div>
            </div>
            <div className="login__retry-button">
              <GoogleSignInButton
                variant="retry"
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
              />
            </div>
            <div className="login__contactus">
              <GoogleSignInButton
                variant="support"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M2.66634 13.3333C2.29967 13.3333 1.9859 13.2029 1.72501 12.942C1.46412 12.6811 1.33345 12.3671 1.33301 12V3.99999C1.33301 3.63332 1.46367 3.31955 1.72501 3.05866C1.98634 2.79777 2.30012 2.6671 2.66634 2.66666H13.333C13.6997 2.66666 14.0137 2.79732 14.275 3.05866C14.5363 3.31999 14.6668 3.63377 14.6663 3.99999V12C14.6663 12.3667 14.5359 12.6807 14.275 12.942C14.0141 13.2033 13.7001 13.3338 13.333 13.3333H2.66634ZM7.99967 8.66666L2.66634 5.33332V12H13.333V5.33332L7.99967 8.66666ZM7.99967 7.33332L13.333 3.99999H2.66634L7.99967 7.33332ZM2.66634 5.33332V3.99999V12V5.33332Z"
                      fill="#4B5767"
                    />
                  </svg>
                }
                onClick={() => console.log("Contact Support clicked")}
              >
                Contact Support
              </GoogleSignInButton>
            </div>
            <div className="login__policy-container">
              <span className="body-small login__policy-text">
                Need help? Check our{" "}
                <a href="#" className="body-small login__policy-link">
                  troubleshooting guide{" "}
                </a>{" "}
                or contact support.
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Show normal state components when no auth error */}
            <div className="login__content">
              <h1 className="headline-1 login__heading">
                Welcome to Agentic Retail Automation Platform
              </h1>
              <p className="body-medium--medium login__text">
                Sign in to access your Agentic Retail Automation Platform and
                build, manage, and collaborate on AI agents with your team.
              </p>
            </div>
            <div className="login__signin-button">
              <GoogleSignInButton
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
              />
            </div>
            <div className="login__divider">
              <div className="login__divider-line"></div>
              <div className="body-small login__divider-text">
                Secure & Fast
              </div>
            </div>
            <div className="login__feature-badges">
              <div className="login__feature-badge-item">
                <Badge
                  className="badge badge--secure"
                  imageUrl={secureBadge}
                  imageClassName="badge__image opacity-50"
                />
                <span className="body-small badge__text">Secure</span>
              </div>
              <div className="login__feature-badge-item">
                <Badge
                  className="badge badge--fast"
                  imageUrl={fastBadge}
                  imageClassName="badge__image"
                />
                <span className="body-small badge__text">Fast</span>
              </div>
              <div className="login__feature-badge-item">
                <Badge
                  className="badge badge--team"
                  imageUrl={teamBadge}
                  imageClassName="badge__image"
                />
                <span className="body-small badge__text">Team</span>
              </div>
            </div>
            <div className="login__policy-container">
              <span className="body-small login__policy-text">
                By signing in, you agree to our{" "}
                <a href="#" className="body-small login__policy-link">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="body-small login__policy-link">
                  Privacy Policy
                </a>
              </span>
            </div>
          </>
        )}
      </div>
      <div className="login__footer">
        <div className="login__footer-text body-small">
          <span className="body-small body-small--medium">
            New to Agentic Retail Automation Platform?
          </span>{" "}
          &nbsp;Join thousands of teams already using our platform
        </div>
        <div className="login__footer-features">
          <div className="login__feature-item">
            <div className="login__feature-icon login__feature-icon--uptime"></div>
            <div className="body-small login__feature-text">99.9% Uptime</div>
          </div>
          <div className="login__feature-item">
            <div className="login__feature-icon login__feature-icon--enterprise"></div>
            <div className="body-small login__feature-text">
              Enterprise Ready
            </div>
          </div>
          <div className="login__feature-item">
            <div className="login__feature-icon login__feature-icon--support"></div>
            <div className="body-small login__feature-text">24/7 Support</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
