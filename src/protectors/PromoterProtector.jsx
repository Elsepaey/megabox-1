import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import Loading from '../components/Loading/Loading';
import api from '../services/api';

export default function PromoterProtector({ children }) {
    const [cookies] = useCookies(['MegaBox']);
    const [isPromoter, setIsPromoter] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkPromoter = async () => {
            const token = cookies.MegaBox;
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await api.get('/users/profile', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const userData = response.data?.data;
                setIsPromoter(userData?.isPromoter === "true" || userData?.isPromoter === true);
                setLoading(false);
            } catch (error) {
                console.error('Error checking promoter status:', error);
                setLoading(false);
            }
        };

        checkPromoter();
    }, [cookies]);

    if (loading) {
        return <Loading />;
    }

    if (isPromoter) {
        return children;
    }

    return <Navigate to="/dashboard" replace />;
}
