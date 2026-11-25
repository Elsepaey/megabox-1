import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCookies } from 'react-cookie';
import { jwtDecode } from 'jwt-decode';
import Loading from '../components/Loading/Loading';
import { isStaffRole } from '../utils/roles';

// requiredRole: "User" or "Staff" (Owner or Admin).
export default function RoleProtector({ children, requiredRole }) {
    const { getUserRole } = useAuth();
    const [cookies] = useCookies(['MegaBox']);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = cookies.MegaBox;
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const decoded = jwtDecode(token);
            const tokenRole = decoded?.role;
            getUserRole(decoded?.id).then((fetchedRole) => {
                const apiRole =
                    fetchedRole === false || fetchedRole == null || fetchedRole === undefined
                        ? null
                        : fetchedRole;
                setRole(apiRole ?? tokenRole ?? null);
                setLoading(false);
            });
        } catch {
            setLoading(false);
        }
    }, [cookies, getUserRole, requiredRole]);

    if (loading) {
        return <Loading />
    }

    const allowed = requiredRole === 'Staff' ? isStaffRole(role) : role === requiredRole;
    if (allowed) {
        return children;
    }

    if (isStaffRole(role)) {
        return <Navigate to="/Owner/profile" replace />;
    }

    if (role === "User") {
        return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
}
