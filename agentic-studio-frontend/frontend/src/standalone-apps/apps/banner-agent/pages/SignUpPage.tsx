import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./LoginPage.scss";
import { useAuthStore } from "../store/authStore";
import { useStandaloneCreativeConfig } from "../../../shared/packages/marketingCreativeCore/provider";

type SignUpPageProps = {
    onSignUpSuccess?: () => void;
    onBackToLogin?: () => void;
};

export default function SignUpPage({ onSignUpSuccess, onBackToLogin }: SignUpPageProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    const { signup, isLoading, error, clearError } = useAuthStore();
    const {
        branding: { heroImageSrc, loginFooterSrc, loginHeaderSrc, logoSrc },
    } = useStandaloneCreativeConfig();

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
        const timer = window.setTimeout(() => clearError(), 5000);
        return () => window.clearTimeout(timer);
    }, [error, clearError]);

    const handleFieldInput = () => {
        if (error) clearError();
        if (localError) setLocalError(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
        }
    };

    const resolvedError = error || localError;

    return (
        <div className="login-page">
            <div className="background" />

            <header className="login-page-header" aria-label="Brand header">
                <img src={loginHeaderSrc} alt="Built by Impact Analytics" />
            </header>

            <div className="login-container">
                <div className="login-card">
                    <div className="logo">
                        <img src={logoSrc} alt="App logo" />
                    </div>

                    <h2>Create your account</h2>

                    <form className="form" onSubmit={handleSubmit} noValidate>
                        {resolvedError && <p className="submit-message submit-message--error">{resolvedError}</p>}

                        <div className="field">
                            <label htmlFor="banner-agent-name">Full name</label>
                            <input
                                id="banner-agent-name"
                                type="text"
                                placeholder="Full name"
                                value={name}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    handleFieldInput();
                                }}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="banner-agent-email">Email</label>
                            <input
                                id="banner-agent-email"
                                type="email"
                                placeholder="E-mail"
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    handleFieldInput();
                                }}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="banner-agent-password">Password</label>
                            <input
                                id="banner-agent-password"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    handleFieldInput();
                                }}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="banner-agent-confirm-password">Confirm Password</label>
                            <input
                                id="banner-agent-confirm-password"
                                type="password"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(event) => {
                                    setConfirmPassword(event.target.value);
                                    handleFieldInput();
                                }}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <button type="submit" className="btn" disabled={!canSubmit}>
                            {isLoading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    <div className="signup">
                        Already have an account?{" "}
                        <button type="button" className="link-btn" onClick={onBackToLogin} disabled={isLoading}>
                            Sign In
                        </button>
                    </div>

                    <div className="form-footer">
                        <img src={loginFooterSrc} alt="Footer brand" />
                    </div>
                </div>

                <div className="illustration">
                    <img src={heroImageSrc} alt="Marketing Hero" />
                </div>
            </div>
        </div>
    );
}
