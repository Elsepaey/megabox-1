import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, fileService, notificationService } from '../services/api';
import { useCookies } from 'react-cookie';
import { getFCMToken } from '../utils/fcmToken';
import { jwtDecode } from 'jwt-decode';
import { useQueryClient } from 'react-query';
import { authStorage } from '../services/authStorage';
import { setAuthFailureHandler } from '../services/apiConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tempEmail, setTempEmail] = useState('');
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [UserRole, setUserRole] = useState('')
  const [UserRefLink, setUserRefLink] = useState('')

  const [cookies, setToken, removeToken] = useCookies(['MegaBox'], {
    doNotParse: true,
  });
  
  const queryClient = useQueryClient();

  const getUserRole = async (id) => {
    try {
      setError(null)
      const token = cookies.MegaBox;
      const role = await authService.userRole(id, token);

      setUserRole(role?.role);
      setUserRefLink(role?.referralLink);

      return role?.role;

    } catch (err) {

      setError(err)
      return false;
    }
  }

  // Initialize UserRole from token on page load/reload
  useEffect(() => {
    const token = cookies.MegaBox;
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded?.role) {
          setUserRole(decoded.role);
        }
        // Optionally fetch referral link if needed
        if (decoded?.id && !UserRefLink) {
          getUserRole(decoded.id).catch(() => {
            // Silently fail if role fetch fails
          });
        }
      } catch (error) {
        // Invalid token, clear it
        console.warn('Invalid token on page load:', error);
        removeToken("MegaBox", {
          path: '/',
        });
        setUserRole('');
      }
    } else {
      setUserRole('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cookies.MegaBox]);

  /**
   * Persist tokens + user from a `{ accessToken, refreshToken, user }`
   * response shape (login + verify-OTP both return this).
   *
   * The access token lives in the `MegaBox` cookie (read elsewhere via
   * react-cookie) and the refresh token in localStorage (used only by
   * /auth/refresh and /auth/logout).
   */
  const persistAuthSuccess = async (data) => {
    const accessToken = data?.accessToken;
    const refreshToken = data?.refreshToken;
    const u = data?.user;
    if (!accessToken) return null;

    setToken("MegaBox", accessToken, { path: '/', maxAge: 30 * 24 * 60 * 60 });
    if (refreshToken) authStorage.setRefreshToken(refreshToken);
    setUser(u || null);
    setUserRole(u?.role || '');
    setUserRefLink(u?.referralLink || '');

    try {
      const fcmToken = await getFCMToken();
      if (fcmToken && u?._id) {
        await notificationService.saveFcmToken(u._id, fcmToken);
      }
    } catch {
      // FCM is optional.
    }

    return accessToken;
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      setNeedsEmailVerification(false);

      const data = await authService.login(email, password);
      console.log('[auth] AuthContext got data', {
        keys: Object.keys(data || {}),
        hasAccessToken: !!data?.accessToken,
        hasUser: !!data?.user,
        message: data?.message,
      });
      const accessToken = await persistAuthSuccess(data);
      console.log('[auth] persistAuthSuccess returned', !!accessToken);

      setLoading(false);
      return accessToken || false;
    } catch (err) {
      setLoading(false);
      // Email-not-verified branch — let the page route to /confirm-email.
      if (err?.needsEmailVerification) {
        setTempEmail(err.email || email);
        setNeedsEmailVerification(true);
        setError(null);
        return { needsEmailVerification: true, email: err.email || email };
      }
      setError(err.message || err?.error || 'Login failed');
      return false;
    }
  };

  const signup = async (username, email, password, confirmationPassword, privacyPolicyVersion = null) => {
    try {
      setLoading(true);
      setError(null);
      await authService.signup(username, email, password, confirmationPassword, privacyPolicyVersion);
      setTempEmail(email);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Signup failed');
      setLoading(false);
      return false;
    }
  };


  const signupWithRef = async (username, email, password, confirmationPassword, ref, privacyPolicyVersion = null) => {
    try {
      setLoading(true);
      setError(null);
      await authService.signupWithRef(username, email, password, confirmationPassword, ref, privacyPolicyVersion);
      setTempEmail(email);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Signup failed');
      setLoading(false);
      return false;
    }
  };

  // const confirmEmail = async (code) => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     // Implement your email confirmation API call here
  //     // const response = await api.confirmEmail(code);
  //     setLoading(false);
  //     return true;
  //   } catch (err) {
  //     setError(err.message);
  //     setLoading(false);
  //     return false;
  //   }
  // };

  const sendResetCode = async (email) => {
    try {
      setLoading(true);
      setError(null);
      await authService.resendotp(email,);
      setTempEmail(email);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  const resetPassword = async (email, password, code) => {
    try {
      setLoading(true);
      setError(null);
      await authService.resetPassword(email, password, code);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to reset password');
      setLoading(false);
      return false;
    }
  };

  const confirmOTP = async (code, email) => {
    try {
      setLoading(true);
      setError(null);
      // The new backend issues tokens on successful verify, so we treat this
      // as an auto-login.
      const data = await authService.confirmOTP(code, email);
      if (data?.accessToken) {
        await persistAuthSuccess(data);
        setNeedsEmailVerification(false);
      }
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'OTP confirmation failed');
      setLoading(false);
      return false;
    }
  };

  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      await authService.forgotPassword(email);
      setTempEmail(email);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
      setLoading(false);
      return false;
    }
  };


  const UploadFile = async (file, token) => {
    try {
      setError(null)

      const fileUploaded = await fileService.uploadFile(file, token);

      return fileUploaded

    } catch (err) {

      setError(err)
      return false;
    }
  }

  const DeleteFile = async (id, token) => {
    try {
      setError(null);

      const fileDeleted = await fileService.deletFile(id, token);

      return fileDeleted
    } catch (err) {

      setError(err)
      return false;
    }
  }

  const ChangeFileName = async (id, token, newFileName) => {
    try {
      setError(null);

      const fileDeleted = await fileService.changeFileName(id, token, newFileName);

      return fileDeleted
    } catch (err) {

      setError(err)
      return false;
    }
  }

  // Centralized logout function — server first (best-effort), then local.
  const logout = async () => {
    const token = cookies.MegaBox;

    // FCM token cleanup (best-effort)
    if (token) {
      try {
        await notificationService.deleteFcmToken(token);
      } catch (e) {
        console.warn('Failed to delete FCM token:', e);
      }
    }

    // Server-side logout — invalidates the refresh token. Best-effort.
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Server logout failed:', e);
    }

    queryClient.clear();
    setUser(null);
    setUserRole('');
    setUserRefLink('');
    setTempEmail('');
    setNeedsEmailVerification(false);
    setError(null);

    removeToken("MegaBox", { path: '/' });
    authStorage.clear();

    // Belt-and-braces fallback for stale cookies on different paths/domains.
    document.cookie = "MegaBox=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    document.cookie = "MegaBox=; path=/; domain=" + window.location.hostname + "; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
  }

  // Wire the apiConfig refresh-failure handler so a failed /auth/refresh wipes
  // local auth state (the user lands on /login next render via protectors).
  useEffect(() => {
    setAuthFailureHandler(() => {
      authStorage.clear();
      removeToken("MegaBox", { path: '/' });
      queryClient.clear();
      setUser(null);
      setUserRole('');
      setUserRefLink('');
    });
    return () => setAuthFailureHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      tempEmail,
      setTempEmail,
      needsEmailVerification,
      setNeedsEmailVerification,
      login,
      signup,
      sendResetCode,
      resetPassword,
      confirmOTP,
      forgotPassword,
      getUserRole,
      UserRole,
      setUserRole,
      UserRefLink,
      UploadFile,
      DeleteFile,
      ChangeFileName,
      signupWithRef,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 