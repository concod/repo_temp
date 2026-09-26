import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import IBLogoLogin from "../../assets/ib-logo-login.svg";
import IALogoLogin from "../../assets/ia-logo-login.svg";

interface SignUpPageProps {
    onSignUpSuccess?: () => void;
    onBackToLogin?: () => void;
}

const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
            d="M2 12C3.8 7.9 7.4 5 12 5C16.6 5 20.2 7.9 22 12C20.2 16.1 16.6 19 12 19C7.4 19 3.8 16.1 2 12Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        {visible ? null : (
            <path
                d="M4 4L20 20"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        )}
    </svg>
);

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUpSuccess, onBackToLogin }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const { signup, isLoading, error, clearError } = useAuthStore();

    const canSubmit = useMemo(() => {
        return (
            Boolean(name.trim()) &&
            Boolean(email.trim()) &&
            Boolean(password.trim()) &&
            Boolean(confirmPassword.trim()) &&
            !isLoading
        );
    }, [name, email, password, confirmPassword, isLoading]);

    useEffect(() => {
        clearError();
    }, [clearError]);

    useEffect(() => {
        if (!error) return;

        const timer = window.setTimeout(() => {
            clearError();
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [error, clearError]);

    const handleFieldInput = () => {
        if (error) {
            clearError();
        }
        if (localError) {
            setLocalError(null);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;

        if (password !== confirmPassword) {
            setLocalError("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            setLocalError("Password must be at least 8 characters");
            return;
        }

        const success = await signup(name.trim(), email.trim(), password);
        if (success) {
            onSignUpSuccess?.();
        } else {
            // Error will be displayed from the store and auto-cleared after 5 seconds
        }
    };

    const resolvedError = error || localError;

    return (
        <div className="ib-auth-login">
            <div className="ib-auth-login__overlay" />
            <main className="ib-auth-login__content">
                <section className="ib-auth-login__card" aria-label="Sign up form">
                    <header className="ib-auth-login__header">
                        <img src={IBLogoLogin} alt="Interstate" className="ib-auth-login__brand" />
                        <h1>Create account</h1>
                        <p className="ib-auth-login__hint">Sign up to access IB BI Agent</p>
                    </header>

                    <form className="ib-auth-login__form" onSubmit={handleSubmit} noValidate>
                        {resolvedError && <div className="ib-auth-login__error">{resolvedError}</div>}

                        <label htmlFor="ib-name" className="ib-auth-login__label">Full name</label>
                        <input
                            id="ib-name"
                            type="text"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                handleFieldInput();
                            }}
                            placeholder="Full name"
                            autoComplete="name"
                            disabled={isLoading}
                            required
                            className="ib-auth-login__input"
                        />

                        <label htmlFor="ib-signup-email" className="ib-auth-login__label">Email</label>
                        <input
                            id="ib-signup-email"
                            type="email"
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                handleFieldInput();
                            }}
                            placeholder="E-mail"
                            autoComplete="email"
                            disabled={isLoading}
                            required
                            className="ib-auth-login__input"
                        />

                        <label htmlFor="ib-signup-password" className="ib-auth-login__label">Password</label>
                        <div className="ib-auth-login__password-wrap">
                            <input
                                id="ib-signup-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    handleFieldInput();
                                }}
                                placeholder="Password"
                                autoComplete="new-password"
                                disabled={isLoading}
                                required
                                className="ib-auth-login__input ib-auth-login__input--password"
                            />
                            <button
                                type="button"
                                className="ib-auth-login__toggle"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowPassword((prev) => !prev)}
                                disabled={isLoading}
                            >
                                <EyeIcon visible={showPassword} />
                            </button>
                        </div>

                        <label htmlFor="ib-signup-confirm-password" className="ib-auth-login__label">Confirm password</label>
                        <div className="ib-auth-login__password-wrap">
                            <input
                                id="ib-signup-confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(event) => {
                                    setConfirmPassword(event.target.value);
                                    handleFieldInput();
                                }}
                                placeholder="Confirm password"
                                autoComplete="new-password"
                                disabled={isLoading}
                                required
                                className="ib-auth-login__input ib-auth-login__input--password"
                            />
                            <button
                                type="button"
                                className="ib-auth-login__toggle"
                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                disabled={isLoading}
                            >
                                <EyeIcon visible={showConfirmPassword} />
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="ib-auth-login__submit"
                        >
                            {isLoading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    <footer className="ib-auth-login__footer">
                        <p>
                            Already have an account?{" "}
                            <button
                                type="button"
                                className="ib-auth-login__link-btn"
                                onClick={onBackToLogin}
                                disabled={isLoading}
                            >
                                Sign in
                            </button>
                        </p>
                        <div className="ib-auth-login__powered-by">
                            <span>Powered by</span>
                            <img src={IALogoLogin} alt="Impact Agents" />
                        </div>
                    </footer>
                </section>
                <section className="ib-auth-login__hero" aria-hidden="true" />
            </main>
        </div>
    );
};
