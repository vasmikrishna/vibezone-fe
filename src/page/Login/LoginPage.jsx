import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/firebase';
import { useAuth } from '../../firebase/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [error, setError] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Google Login Successful:', result.user);
      login(result.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Google Login Error:', error.message);
      setError('Failed to login with Google. Please try again.');
    }
  };

  const handlePhoneLogin = async () => {
    try {
      const phoneNumber = prompt('Enter your phone number:');
      if (!phoneNumber) throw new Error('Phone number is required');
  
      // Initialize RecaptchaVerifier if not already initialized
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(
          'recaptcha-container',
          {
            size: 'invisible', // Use "invisible" for background verification
            callback: (response) => {
              console.log('Recaptcha Verified:', response);
            },
            'expired-callback': () => {
              console.error('Recaptcha expired. Please try again.');
            },
          },
          auth
        );
      }
  
      const appVerifier = window.recaptchaVerifier;
  
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      const code = prompt('Enter the verification code sent to your phone:');
      if (!code) throw new Error('Verification code is required');
  
      const result = await confirmationResult.confirm(code);
      console.log('Phone Login Successful:', result.user);
      login(result.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Phone Login Error:', error.message);
      setError('Failed to login with phone. Please try again.');
    }
  };


  const handleEmailPasswordLogin = async () => {
    try {
      setError('');
      if (!email || !password) throw new Error('Email and password are required');

      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Email/Password Login Successful:', result.user);
      login(result.user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Email/Password Login Error:', error.message);
      if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/user-not-found') {
        setError('No user found with this email. Please check and try again.');
      } else {
        setError('Failed to login. Please try again.');
      }
    }
  };

  const handlePasswordReset = async () => {
    try {
      setResetError('');
      setResetSuccess(false);
      if (!email) throw new Error('Please enter your email to reset password');

      await sendPasswordResetEmail(auth, email);
      setResetSuccess(true);
      console.log('Password reset email sent.');
    } catch (error) {
      console.error('Password Reset Error:', error.message);
      if (error.code === 'auth/user-not-found') {
        setResetError('No user found with this email. Please check and try again.');
      } else {
        setResetError('Failed to send password reset email. Please try again.');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Login</h2>

        {error && <p className="error-message">{error}</p>}

        <div className="email-password-login">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <button onClick={handleEmailPasswordLogin} className="btn email-btn">Login with Email & Password</button>
          <button onClick={handlePasswordReset} className="btn reset-btn">Forgot Password?</button>
          {resetError && <p className="error-message">{resetError}</p>}
          {resetSuccess && <p className="success-message">Password reset email sent!</p>}
        </div>

        <div className="divider">or</div>
        
        <div className="login-options">
          <button className="gsi-material-button" onClick={handleGoogleLogin} >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Continue with Google</span>
            </div>
          </button>
        </div>

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}
