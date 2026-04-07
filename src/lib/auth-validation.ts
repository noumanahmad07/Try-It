export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters long';
  if (name.length > 50) return 'Name must be less than 50 characters';
  return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

export const validateOTP = (otp: string): string | null => {
  if (!otp) return 'OTP is required';
  if (!/^\d{6}$/.test(otp)) return 'OTP must be 6 digits';
  return null;
};

export interface ValidationErrors {
  [key: string]: string | null;
}

export const validateLoginForm = (email: string, password: string): ValidationErrors => {
  return {
    email: validateEmail(email),
    password: validatePassword(password)
  };
};

export const validateSignupForm = (name: string, email: string, password: string, confirmPassword: string): ValidationErrors => {
  return {
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword)
  };
};

export const validateForgotPasswordForm = (email: string): ValidationErrors => {
  return {
    email: validateEmail(email)
  };
};

export const validateResetPasswordForm = (password: string, confirmPassword: string): ValidationErrors => {
  return {
    password: validatePassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword)
  };
};

export const validateOTPForm = (otp: string): ValidationErrors => {
  return {
    otp: validateOTP(otp)
  };
};
