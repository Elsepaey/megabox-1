import { useCookies } from 'react-cookie';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../../../context/AuthContext';

// Current staff account. The server enforces roles; this only hides controls
// the account cannot use (Owner-only actions for Admin, self-actions).
export default function useStaffRole() {
    const { UserRole } = useAuth();
    const [cookies] = useCookies(['MegaBox']);
    let tokenRole = null;
    let userId = null;
    try {
        const decoded = jwtDecode(cookies.MegaBox);
        tokenRole = decoded?.role ?? null;
        userId = decoded?.id ?? null;
    } catch {
        // No or invalid token: protectors redirect.
    }
    const role = UserRole || tokenRole;
    return { role, userId, isOwner: role === 'Owner', isAdmin: role === 'Admin' };
}
