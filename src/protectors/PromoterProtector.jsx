import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import Loading from '../components/Loading/Loading';
import { api } from '../services/apiConfig';

export default function PromoterProtector({ children }) {
    const [cookies] = useCookies(['MegaBox']);
    const [isPromoter, setIsPromoter] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const checkPromoter = async () => {
            const token = cookies.MegaBox;
            if (!token) {
                if (!cancelled) setLoading(false);
                return;
            }

            try {
                const response = await api.get('/users/profile');
                const userData = response.data?.data;
                if (!cancelled) {
                    setIsPromoter(userData?.isPromoter === true);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error checking promoter status:', error);
                if (!cancelled) setLoading(false);
            }
        };

        checkPromoter();
        return () => {
            cancelled = true;
        };
    }, [cookies.MegaBox]);

    if (loading) {
        return <Loading />;
    }

    if (isPromoter) {
        return children;
    }

    return <Navigate to="/dashboard" replace />;
}
