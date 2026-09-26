import type { RegisterOptions } from "react-hook-form";

export interface LoginProps {
  logo: string;
  formHeader: FormProps;
}

export interface FormFields {
  email: string;
  password: string;
}

export interface FieldValidationRules {
  email?: RegisterOptions<FormFields, "email">;
  password?: RegisterOptions<FormFields, "password">;
}

export interface FormProps {
  title: string;
  onSubmit: (data: FormFields) => void | Promise<void>;
  validationRules?: FieldValidationRules;
  error?: string | null;
}
