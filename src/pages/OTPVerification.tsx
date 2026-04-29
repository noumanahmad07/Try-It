import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, RefreshCw, Shield } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { validateOTPForm, ValidationErrors } from '../lib/auth-validation';
import { OTPData } from '../types';

export default function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [formData, setFormData] = useState<OTPData>({
    email: email,
    otp: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    const newOTP = formData.otp.split('');
    newOTP[index] = value;
    const updatedOTP = newOTP.join('').slice(0, 6);
    
    setFormData(prev => ({ ...prev, otp: updatedOTP }));
    
    // Clear error when user starts typing
    if (errors.otp) {
      setErrors(prev => ({ ...prev, otp: null }));
    }
    
    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, otp: pastedData }));
    
    // Focus the appropriate input after paste
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const validateForm = (): boolean => {
    const newErrors = validateOTPForm(formData.otp);
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // TODO: Implement actual OTP verification API call
      console.log('OTP verification request:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsVerified(true);
      
      // Redirect to login after successful verification
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('OTP verification error:', error);
      setErrors({ otp: 'Invalid OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      // TODO: Implement actual resend OTP API call
      console.log('Resend OTP request:', { email: formData.email });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset timer and state
      setTimeLeft(300);
      setCanResend(false);
      setFormData(prev => ({ ...prev, otp: '' }));
      setErrors({});
      
      // Focus first input
      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error('Resend OTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-gray-400 mb-6">
              Your email has been successfully verified. Redirecting you to sign in...
            </p>
            
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div
                className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear" }}
              />
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Verify Your Email
            </h1>
            <p className="text-gray-400">
              We've sent a 6-digit verification code to<br />
              <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-4 text-center">Enter Verification Code</label>
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={formData.otp[index] || ''}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`w-12 h-12 text-center text-lg font-semibold bg-white/10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                      errors.otp ? 'border-red-500' : 'border-white/20'
                    }`}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              {errors.otp && (
                <p className="mt-2 text-sm text-red-400 text-center">{errors.otp}</p>
              )}
            </div>

            <div className="text-center">
              {timeLeft > 0 ? (
                <p className="text-sm text-gray-400">
                  Code expires in <span className="text-purple-400 font-medium">{formatTime(timeLeft)}</span>
                </p>
              ) : (
                <p className="text-sm text-red-400">Code has expired</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || formData.otp.length !== 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend || isLoading}
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${canResend && !isLoading ? 'animate-spin' : ''}`} />
                {canResend ? 'Resend Code' : `Resend available in ${formatTime(timeLeft)}`}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign Up
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
