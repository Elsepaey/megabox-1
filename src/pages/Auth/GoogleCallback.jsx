import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { ToastOptions } from '../../helpers/ToastOptions';
import { authService } from '../../services/api';
import { privacyTermsService } from '../../services/privacyTermsService';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading/Loading';

function resolveRedirectPath(data) {
    let role = data?.user?.role;
    if (!role && data?.accessToken) {
        try {
            role = jwtDecode(data.accessToken)?.role;
        } catch {
            role = null;
        }
    }
    if (role === 'Owner' || role === 'Admin') {
        return '/Owner/profile';
    }
    return '/dashboard';
}

const GoogleCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { persistAuthSuccess } = useAuth();
    const hasProcessedRef = useRef(false);

    useEffect(() => {
        if (hasProcessedRef.current) return;
        hasProcessedRef.current = true;

        const handleOAuthCallback = async () => {
            let accessToken = searchParams.get('access_token');
            let error = searchParams.get('error');

            if (!accessToken && !error && window.location.hash) {
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                accessToken = hashParams.get('access_token');
                error = hashParams.get('error');
            }

            if (!accessToken && !error) {
                const urlParams = new URLSearchParams(window.location.search);
                const urlHash = new URLSearchParams(window.location.hash.substring(1));
                accessToken = urlParams.get('access_token') || urlHash.get('access_token');
                error = urlParams.get('error') || urlHash.get('error');
            }

            // Clean up OAuth token/error from URL before redirecting
            window.history.replaceState({}, document.title, '/auth/callback');

            if (accessToken) {
                try {
                    let privacyPolicyVersion = null;
                    try {
                        const policyRes = await privacyTermsService.getPrivacyPolicy();
                        if (
                            policyRes?.policy?.version !== undefined &&
                            policyRes?.policy?.version !== null
                        ) {
                            privacyPolicyVersion = Number(policyRes.policy.version);
                        }
                    } catch {
                        // Proceed without version if no active policy exists
                    }

                    const data = await authService.loginWithGmail(
                        accessToken,
                        privacyPolicyVersion,
                    );

                    if (data?.accessToken) {
                        await persistAuthSuccess(data);
                        toast.success(
                            data?.message || 'Successfully logged in with Google!',
                            ToastOptions('success'),
                        );
                        navigate(resolveRedirectPath(data), { replace: true });
                    } else {
                        toast.error(
                            data?.message || 'Failed to login with Google. Please try again.',
                            ToastOptions('error'),
                        );
                        navigate('/login', { replace: true });
                    }
                } catch (err) {
                    toast.error(
                        err?.message || 'An error occurred during Google login. Please try again.',
                        ToastOptions('error'),
                    );
                    navigate('/login', { replace: true });
                }
            } else if (error) {
                if (error === 'redirect_uri_mismatch') {
                    toast.error(
                        'OAuth configuration error. Please check Google Cloud Console settings. Make sure the redirect URI is configured correctly.',
                        ToastOptions('error'),
                    );
                } else {
                    toast.error('Google Login Failed: ' + error, ToastOptions('error'));
                }
                navigate('/login', { replace: true });
            } else {
                navigate('/login', { replace: true });
            }
        };

        handleOAuthCallback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
            }}
        >
            <Loading />
        </div>
    );
};

export default GoogleCallback;
