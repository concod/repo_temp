import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import IBLogoLogin from "../../assets/ib-logo-login.svg";
import IALogoLogin from "../../assets/ia-logo-login.svg";

interface LoginPageProps {
    onLoginSuccess?: () => void;
    onNavigateToSignUp?: () => void;
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

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToSignUp }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const { login, isLoading, error, clearError } = useAuthStore();

    const canSubmit = useMemo(
        () => Boolean(email.trim()) && Boolean(password.trim()) && !isLoading,
        [email, password, isLoading]
    );

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

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;

        const success = await login(email.trim(), password);
        if (success) {
            onLoginSuccess?.();
        }
    };

    const handleFieldInput = () => {
        if (error) {
            clearError();
        }
    };

    return (
        <div className="ib-auth-login">
            <div className="ib-auth-login__overlay" />
            <main className="ib-auth-login__content">
                <section className="ib-auth-login__card" aria-label="Login form">
                    <header className="ib-auth-login__header">
                        <img src={IBLogoLogin} alt="Interstate" className="ib-auth-login__brand" />
                        <h1>Welcome back!</h1>
                    </header>

                    <form className="ib-auth-login__form" onSubmit={handleSubmit} noValidate>
                        {error && <div className="ib-auth-login__error">{error}</div>}

                        <label htmlFor="ib-email" className="ib-auth-login__label">Email</label>
                        <input
                            id="ib-email"
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

                        <label htmlFor="ib-password" className="ib-auth-login__label">Password</label>
                        <div className="ib-auth-login__password-wrap">
                            <input
                                id="ib-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    handleFieldInput();
                                }}
                                placeholder="Password"
                                autoComplete="current-password"
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

                        <div className="ib-auth-login__forgot-row">
                            <a href="#" aria-disabled="true" onClick={(event) => event.preventDefault()}>
                                Forgot Password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="ib-auth-login__submit"
                        >
                            {isLoading ? "Signing In..." : "Sign In"}
                        </button>
                    </form>

                    <footer className="ib-auth-login__footer">
                        <p>
                            Don&apos;t have an account?{" "}
                            <button
                                type="button"
                                className="ib-auth-login__link-btn"
                                onClick={onNavigateToSignUp}
                                disabled={isLoading}
                            >
                                Sign up
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
