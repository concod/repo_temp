import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./LoginPage.scss";
import { useAuthStore } from "../store/authStore";
import { useStandaloneCreativeConfig } from "../../../shared/packages/marketingCreativeCore/provider";

type LoginPageProps = {
    onLoginSuccess?: () => void;
    onNavigateToSignUp?: () => void;
};

export default function LoginPage({ onLoginSuccess, onNavigateToSignUp }: LoginPageProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const { login, isLoading, error, clearError } = useAuthStore();
    const {
        branding: { heroImageSrc, loginFooterSrc, loginHeaderSrc, logoSrc },
    } = useStandaloneCreativeConfig();

    const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
    const canSubmit = useMemo(
        () => isEmailValid && Boolean(password.trim()) && !isLoading,
        [isEmailValid, password, isLoading]
    );

    useEffect(() => {
        clearError();
    }, [clearError]);

    useEffect(() => {
        if (!error) return;
        const timer = window.setTimeout(() => clearError(), 5000);
        return () => window.clearTimeout(timer);
    }, [error, clearError]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
        <div className="login-page">
            <div className="background">
                {/* <div className="grid" /> */}
            </div>

            <header className="login-page-header" aria-label="Brand header">
                <img src={loginHeaderSrc} alt="Built by Impact Analytics" />
            </header>

            <div className="login-container">
                <LoginCard
                    logoSrc={logoSrc}
                    loginFooterSrc={loginFooterSrc}
                    email={email}
                    password={password}
                    error={error}
                    isLoading={isLoading}
                    canSubmit={canSubmit}
                    isPasswordVisible={isPasswordVisible}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onTogglePasswordVisibility={() => setIsPasswordVisible((current) => !current)}
                    onSubmit={handleSubmit}
                    onNavigateToSignUp={onNavigateToSignUp}
                    onFieldInput={handleFieldInput}
                />
                <div className="illustration">
                    <img src={heroImageSrc} alt="Marketing Hero" />
                </div>
            </div>
        </div>
    );
}

type LoginCardProps = {
    logoSrc: string;
    loginFooterSrc: string;
    email: string;
    password: string;
    error: string | null;
    isLoading: boolean;
    canSubmit: boolean;
    isPasswordVisible: boolean;
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onTogglePasswordVisibility: () => void;
    onFieldInput: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onNavigateToSignUp?: () => void;
};

function LoginCard({
    logoSrc,
    loginFooterSrc,
    email,
    password,
    error,
    isLoading,
    canSubmit,
    isPasswordVisible,
    onEmailChange,
    onPasswordChange,
    onTogglePasswordVisibility,
    onFieldInput,
    onSubmit,
    onNavigateToSignUp,
}: LoginCardProps) {
    return (
        <div className="login-card">
            <div className="logo">
                <img src={logoSrc} alt="App logo" />
            </div>

            <h2>Sign in to your account</h2>

            <form className="form" onSubmit={onSubmit}>
                {error && <p className="submit-message submit-message--error">{error}</p>}

                <div className="field">
                    <label htmlFor="banner-agent-email">Email</label>
                    <input
                        id="banner-agent-email"
                        type="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={(event) => {
                            onEmailChange(event.target.value);
                            onFieldInput();
                        }}
                        disabled={isLoading}
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="banner-agent-password">Password</label>
                    <div className="password-input-wrap">
                        <input
                            id="banner-agent-password"
                            type={isPasswordVisible ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(event) => {
                                onPasswordChange(event.target.value);
                                onFieldInput();
                            }}
                            disabled={isLoading}
                            required
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={onTogglePasswordVisibility}
                            disabled={isLoading}
                            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            aria-pressed={isPasswordVisible}
                        >
                            {isPasswordVisible ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                <div className="forgot">Forgot Password?</div>

                <button type="submit" className="btn" disabled={!canSubmit}>
                    {isLoading ? "Signing In..." : "Sign In"}
                </button>
            </form>

            <div className="signup">
                Don&apos;t have an account?{" "}
                <button type="button" className="link-btn" onClick={onNavigateToSignUp} disabled={isLoading}>
                    Sign Up
                </button>
            </div>

            <div className="form-footer">
                <img src={loginFooterSrc} alt="Footer brand" />
            </div>
        </div>
    );
}
