import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import Loading from '../components/Loading/Loading';
import { api } from '../services/apiConfig';

export default function PromoterWithPlanProtector({ children }) {
    const [cookies] = useCookies(['MegaBox']);
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const checkAccess = async () => {
            const token = cookies.MegaBox;
            if (!token) {
                if (!cancelled) setLoading(false);
                return;
            }

            try {
                const response = await api.get('/users/profile');
                const userData = response.data?.data;
                const isPromoter = userData?.isPromoter === true;
                const hasPlan = Boolean(userData?.promoterPlan);
                if (!cancelled) {
                    setHasAccess(isPromoter && hasPlan);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error checking promoter with plan status:', error);
                if (!cancelled) setLoading(false);
            }
        };

        checkAccess();
        return () => {
            cancelled = true;
        };
    }, [cookies.MegaBox]);

    if (loading) {
        return <Loading />;
    }

    if (hasAccess) {
        return children;
    }

    return <Navigate to="/dashboard" replace />;
}
