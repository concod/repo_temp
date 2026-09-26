import "./Form.scss";
import type { FormFields } from "./types";
import { useForm } from "react-hook-form";
import { useState, useMemo } from "react";
import type { FormProps } from "./types";
import { EyeIcon, EyeSlashIcon } from "./Icons";

export const Form = ({
  title,
  onSubmit,
  validationRules,
  error,
}: FormProps) => {
  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
  } = useForm<FormFields>({
    mode: "onChange",
  });
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const defaultEmailValidation = useMemo(
    () => ({
      required: "Email is required",
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: "Invalid email address",
      },
    }),
    []
  );

  const defaultPasswordValidation = useMemo(
    () => ({
      required: "Password is required",
    }),
    []
  );

  const emailValidation = validationRules?.email || defaultEmailValidation;
  const passwordValidation =
    validationRules?.password || defaultPasswordValidation;

  return (
    <div className="login-form">
      <div className="login-form-header">{title}</div>
      {/* Display submission errors (from API/backend) */}
      {error && (
        <div className="login-form-error" role="alert" aria-live="polite">
          {error}
        </div>
      )}
      <form className="login-form-content" onSubmit={handleSubmit(onSubmit)}>
        <div className="login-form-content-item">
          <label htmlFor="email">Email</label>
          <input
            {...register("email", emailValidation)}
            type="email"
            id="email"
            placeholder="E-mail"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {/* Display field-level validation errors */}
          {errors.email && (
            <span
              id="email-error"
              className="login-form-field-error"
              role="alert"
            >
              {errors.email.message}
            </span>
          )}
        </div>
        <div className="login-form-content-item">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              {...register("password", passwordValidation)}
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Password"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              className="password-toggle-button"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
          {/* Display field-level validation errors */}
          {errors.password && (
            <span
              id="password-error"
              className="login-form-field-error"
              role="alert"
            >
              {errors.password.message}
            </span>
          )}
          <div className="forgot-password">
            <span>Forgot Password?</span>
          </div>
        </div>
        <div className="login-form-content-submit">
          <button disabled={!isValid || isSubmitting} type="submit">
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
        </div>
      </form>
      <div className="login-form-footer">
        Don't have an account? <span>Sign Up</span>
      </div>
    </div>
  );
};
