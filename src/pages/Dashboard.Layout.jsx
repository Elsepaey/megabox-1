import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidenav from '../components/Sidenav/Sidenav'
import BottomNavigation from '../components/BottomNavigation/BottomNavigation'
import DashboardHeader from '../components/DashboardHeader/DashboardHeader'
import { useAuth } from '../context/AuthContext'
import { useCookies } from 'react-cookie';
import { jwtDecode } from "jwt-decode";
import Loading from '../components/Loading/Loading';
import { useQuery } from 'react-query';
import { userService } from '../services';
import { isStaffRole } from '../utils/roles';


export default function DashboardLayout({ role }) {

    const auth = useAuth();
    const [Token] = useCookies(['MegaBox']);
    const location = useLocation();

    const [RoleLoading, setRoleLoading] = useState(true)

    const { data: userData } = useQuery(
        ['userAccount'],
        () => userService.getUserInfo(Token.MegaBox),
        {
            enabled: !!Token.MegaBox && role === "User",
            retry: false
        }
    );

    const isPromoter = userData?.isPromoter === "true" || userData?.isPromoter === true;

    const navigate = useNavigate();

    useEffect(() => {
        const idTracker = () => {
            let id;

            if (Token.MegaBox) {
                id = jwtDecode(Token.MegaBox).id;
                return id
            } else {
                return false
            }
        }

        if (!auth) {
            navigate("/login");
            return;
        }

        if (idTracker() && auth.getUserRole) {
            let tokenRole = null;
            try {
                const decoded = jwtDecode(Token.MegaBox);
                tokenRole = decoded?.role;
            } catch (error) {
                console.error('Error decoding token:', error);
                setRoleLoading(false);
                return;
            }

            const tokenIsStaff = isStaffRole(tokenRole);
            const staffLayout = role === "Owner";

            if (tokenIsStaff && !staffLayout) {
                navigate("/Owner/profile", { replace: true });
                return;
            }

            if (!tokenIsStaff && staffLayout) {
                navigate(tokenRole === "User" ? "/dashboard" : "/login", { replace: true });
                return;
            }

            setRoleLoading(false);
        } else {
            navigate("/login")
        }

    }, [auth, navigate, role, Token, location.pathname]);

    if (RoleLoading)
        return <Loading />


    return <div className='flex justify-start items-center bg-[#f2f0f0] dark:bg-slate-900 transition-colors duration-300'>
        {role !== "Owner" && (
            <div className="sidnav">
                <Sidenav role={role} />
            </div>
        )}
        <div className="min-h-screen w-full overflow-hidden pb-24 md:pb-4 dark:bg-slate-900 transition-colors duration-300">
            <DashboardHeader />
            <Outlet>
            </Outlet>
        </div>
        {role === "User" && (
            <BottomNavigation
                role={role}
                isPromoter={isPromoter}
                userData={userData}
            />
        )}
        {role === "Owner" && (
            <BottomNavigation
                role={role}
            />
        )}
    </div>
}
