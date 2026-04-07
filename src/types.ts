export interface Look {
  id: string;
  originalImage: string;
  resultImage: string;
  garmentImage: string;
  timestamp: number;
}

export interface TryOnState {
  personImage: string | null;
  garmentImage: string | null;
  isProcessing: boolean;
  result: string | null;
  error: string | null;
}

export interface BodyAnalysis {
  bodyType: string;
  skinTone: string;
  suggestedSize: string;
  colorPalette: string[];
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface TrendingItem {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  category: string;
  targetAge: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface OTPData {
  email: string;
  otp: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export interface AuthError {
  message: string;
  code?: string;
}
