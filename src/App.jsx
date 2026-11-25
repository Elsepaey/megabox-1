import { createElement, lazy, Suspense, useMemo } from 'react'
import { BrowserRouter as Router, Routes, Route, createBrowserRouter, RouterProvider, useNavigate, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LanguageRoute from './components/LanguageRoute/LanguageRoute'
import LandingPage from './pages/LandingPage'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import ConfirmEmail from './pages/Auth/ConfirmEmail'
import ForgotPasswordEmail from './pages/Auth/ForgotPasswordEmail'
import ForgotPasswordReset from './pages/Auth/ForgotPasswordReset'
import GoogleCallback from './pages/Auth/GoogleCallback'
import DashboardLayout from './pages/Dashboard.Layout'
import Files from './pages/Files/AllFiles/Files'
import UploadFiles from './pages/Files/fileDetails/fileDetails'
import ZipContents from './pages/Files/ZipContents/ZipContents'
import LoginProtector from './protectors/LoginProtector'
import Profile from './pages/profile/Profile'
import RoleProtector from './protectors/RoleProtector'
import { useCookies } from 'react-cookie'
import { jwtDecode } from 'jwt-decode'
import LandingLayout from './pages/LandingLayout'

import VideoPreview from './pages/VideoPreview/VideoPreview'
import Earning from './pages/Earning/Earning'
import Notifications from './pages/Notifications/Notifications'
import PromoterDashboard from './pages/Promoter/PromoterDashboard'
import SharedFiles from './pages/SharedFiles/SharedFiles'
import RevenueData from './pages/RevenueData/RevenueData'
import Referral from './pages/Referral/Referral'
import PromoterProtector from './protectors/PromoterProtector'
import PromoterWithPlanProtector from './protectors/PromoterWithPlanProtector'
import Channels from './pages/Channels/Channels'
import ChannelFiles from './pages/Channels/ChannelFiles'
import PromoterChannels from './pages/Channels/PromoterChannels'

// Staff dashboard (/Owner, Owner + Admin)
const Analasys = lazy(() => import('./pages/OwnerPages/Analasyis/Analasys'))
const Users = lazy(() => import('./pages/OwnerPages/Users/Users'))
const UserDetail = lazy(() => import('./pages/OwnerPages/Users/UserDetail'))
const UserStats = lazy(() => import('./pages/OwnerPages/UserStats/UserStats'))
const Storage = lazy(() => import('./pages/OwnerPages/Storage/Storage'))
const Promoters = lazy(() => import('./pages/OwnerPages/Promoters/Promoters'))
const PromoterDetail = lazy(() => import('./pages/OwnerPages/Promoters/PromoterDetail'))
const Reports = lazy(() => import('./pages/OwnerPages/Reports/Reports'))
const ReportDetail = lazy(() => import('./pages/OwnerPages/Reports/ReportDetail'))
const Complaints = lazy(() => import('./pages/OwnerPages/Complaints/Complaints'))
const ComplaintDetail = lazy(() => import('./pages/OwnerPages/Complaints/ComplaintDetail'))
const AdminShares = lazy(() => import('./pages/OwnerPages/Shares/AdminShares'))
const AdminShareDetail = lazy(() => import('./pages/OwnerPages/Shares/AdminShareDetail'))
const AdminChannels = lazy(() => import('./pages/OwnerPages/Channels/AdminChannels'))
const AdminChannelDetail = lazy(() => import('./pages/OwnerPages/Channels/AdminChannelDetail'))
const AdminFiles = lazy(() => import('./pages/OwnerPages/Files/AdminFiles'))
const AdminFileDetail = lazy(() => import('./pages/OwnerPages/Files/AdminFileDetail'))
const AdminFolders = lazy(() => import('./pages/OwnerPages/Folders/AdminFolders'))
const AdminFolderDetail = lazy(() => import('./pages/OwnerPages/Folders/AdminFolderDetail'))
const AdminNotifications = lazy(() => import('./pages/OwnerPages/Notifications/AdminNotifications'))
const Withdrawals = lazy(() => import('./pages/OwnerPages/Withdrawals/Withdrawals'))
const Plans = lazy(() => import('./pages/OwnerPages/Plans/Plans'))
const AdminSubscriptions = lazy(() => import('./pages/OwnerPages/Subscriptions/AdminSubscriptions'))
const AdminWheel = lazy(() => import('./pages/OwnerPages/Wheel/AdminWheel'))
const AdminCatalogs = lazy(() => import('./pages/OwnerPages/Catalogs/AdminCatalogs'))
const AdminLegal = lazy(() => import('./pages/OwnerPages/Legal/AdminLegal'))
const AdminAppConfig = lazy(() => import('./pages/OwnerPages/AppConfig/AdminAppConfig'))
const AdminZips = lazy(() => import('./pages/OwnerPages/Zips/AdminZips'))
const AdminOcr = lazy(() => import('./pages/OwnerPages/Ocr/AdminOcr'))
const AdminPaymentMethods = lazy(() => import('./pages/OwnerPages/PaymentMethods/AdminPaymentMethods'))


// Main Pages
const Feedback = lazy(() => import('./pages/Feedback/Feedback'))
const PrivacyPolicy = lazy(() => import('./pages/Privacy/Privacy'))
const RemovalGuidelines = lazy(() => import('./pages/RemovalPolicy/RemovalPolicy'))
const PromotersLanding = lazy(() => import('./pages/Promoters/Promoters'))
const Subscription = lazy(() => import('./pages/Subscription/Subscription'))
const Subscribe = lazy(() => import('./pages/Subscribe/Subscribe'))
const Contact = lazy(() => import('./pages/Contact/Contact'))
const TermsOfService = lazy(() => import('./pages/TermsOfService/TermsOfService'))
const RewardsEligibility = lazy(() => import('./pages/RewardsEligibility/RewardsEligibility'))
const AccountDeletion = lazy(() => import('./pages/AccountDeletion/AccountDeletion'))
const Premium = lazy(() => import('./pages/Premium/Premium'))

import Loading from './components/Loading/Loading'
import SignupForMoney from './pages/Auth/SignupForMoney'

// Staff page element: signed in, Owner or Admin, lazily loaded.
const staffPage = (page) => (
  <LoginProtector>
    <RoleProtector requiredRole="Staff">
      <Suspense fallback={<Loading />}>
        {createElement(page)}
      </Suspense>
    </RoleProtector>
  </LoginProtector>
);

// AuthWrapper component - must be used within Router and AuthProvider context
// This component will be rendered by RouterProvider, so hooks will work
// IMPORTANT: This component is only instantiated when the route is rendered, not during router configuration
const AuthWrapper = ({ children }) => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [Token] = useCookies(['MegaBox']);

  if (typeof children === 'function') {
    return children({ navigate, auth, Token });
  }
  return children;
};

// Route components that use AuthWrapper - these are only instantiated when routes are rendered
const LoginRoute = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <Login
        onSignup={() => navigate('/signup')}
        onForgot={() => navigate('/forgot-password')}
        onSubmit={async (values) => {
          const result = await auth.login(values.email, values.password);

          // Unverified email → backend returns 403 'verify your email'.
          // AuthContext already populated tempEmail; route to OTP screen.
          if (result && typeof result === 'object' && result.needsEmailVerification) {
            navigate('/confirm-email');
            return;
          }

          if (result) {
            const accessToken = result;
            try {
              const { role } = jwtDecode(accessToken);
              switch (role) {
                case 'User':
                  navigate('/dashboard');
                  break;
                case 'Owner':
                case 'Admin':
                  navigate('/Owner/profile');
                  break;
                default:
                  navigate('/dashboard');
              }
            } catch {
              navigate('/dashboard');
            }
          }
        }}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

const SignupRoute = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <Signup
        onLogin={() => navigate('/login')}
        onConfirmMail={async (values) => {
          const success = await auth.signup(
            values.username,
            values.email,
            values.password,
            values.confirmationPassword,
            values.privacyPolicyVersion
          );
          if (success) {
            navigate('/confirm-email');
          }
        }}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

const ConfirmEmailRoute = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <ConfirmEmail
        onResend={async () => {
          await auth.resendConfirmationEmail();
        }}
        onBack={() => navigate('/login')}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

const ForgotPasswordEmailRoute = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <ForgotPasswordEmail
        onSubmit={async (values) => {
          await auth.sendPasswordResetEmail(values.email);
          navigate('/forgot-password-reset');
        }}
        onBack={() => navigate('/login')}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

const ForgotPasswordResetRoute = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <ForgotPasswordReset
        onSubmit={async (values) => {
          const success = await auth.resetPassword(values.token, values.password);
          if (success) {
            navigate('/login');
          }
        }}
        onBack={() => navigate('/forgot-password')}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

const SignupForMoneyRoute = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <SignupForMoney
        onLogin={() => navigate('/login')}
        onSignup={async (values) => {
          const success = await auth.signup(
            values.username,
            values.email,
            values.password
          );
          if (success) {
            navigate('/confirm-email');
          }
        }}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

const RegisterRoute = () => (
  <AuthWrapper>
    {({ navigate, auth }) => {
      const location = window.location;
      const params = new URLSearchParams(location.search);
      const ref = params.get("ref");

      return (
        <SignupForMoney
          refCode={ref}
          onLogin={() => navigate('/login')}
          onConfirmMail={async (values) => {
            const success = await auth.signupWithRef(
              values.username,
              values.email,
              values.password,
              values.confirmationPassword,
              ref,
              values.privacyPolicyVersion
            );

            if (success) {
              navigate('/confirm-email');
            }
          }}
          loading={auth.loading}
          error={auth.error}
        />
      );
    }}
  </AuthWrapper>
);

const ConfirmEmailRouteWithTemp = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <ConfirmEmail
        email={auth.tempEmail}
        onConfirm={async (code) => {
          // confirmOTP now auto-logs in (backend returns tokens), so we go
          // straight to the dashboard.
          const success = await auth.confirmOTP(code, auth.tempEmail);
          if (success) {
            navigate('/dashboard');
          }
        }}
        onResend={async () => {
          await auth.sendResetCode(auth.tempEmail);
        }}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

const ForgotPasswordEmailRouteWithCode = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <ForgotPasswordEmail
        onSendCode={async (email) => {
          const success = await auth.forgotPassword(email);
          if (success) {
            navigate('/reset-password');
          }
        }}
        onBackToLogin={() => navigate('/login')}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

const ResetPasswordRoute = () => (
  <AuthWrapper>
    {({ navigate, auth }) => (
      <ForgotPasswordReset
        onSubmit={async (values) => {
          const success = await auth.resetPassword(values.token, values.password);
          if (success) {
            navigate('/login');
          }
        }}
        onBack={() => navigate('/forgot-password')}
        loading={auth.loading}
        error={auth.error}
      />
    )}
  </AuthWrapper>
);

// Wrapper component to ensure RoleProtector has access to AuthProvider context
const RoleProtectorWrapper = ({ requiredRole, children }) => {
  return (
    <RoleProtector requiredRole={requiredRole}>
      {children}
    </RoleProtector>
  );
};

const AppRouter = () => {
  // Router must be created inside AppRouter which is wrapped by AuthProvider
  // Components in router config will have access to AuthProvider context when rendered
  const router = useMemo(() => createBrowserRouter([
    {
      path: "/",
      element: (
        <LanguageRoute>
          <LandingLayout />
        </LanguageRoute>
      ),
      children: [
        {
          index: true, element: <LandingPage />
        },
        {
          path: "Privacy", element: <Suspense fallback={<Loading />}> <PrivacyPolicy /></Suspense>
        },
        {
          path: "Privacy-Removal", element: <Suspense fallback={<Loading />}>
            <RemovalGuidelines />
          </Suspense>
        },
        {
          path: "copyright-feedback", element: <Suspense fallback={<Loading />}> <Feedback /></Suspense>
        },
        {
          path: "contact-support", element: <Suspense fallback={<Loading />}> <Contact /></Suspense>
        },
        {
          path: "terms-of-service", element: <Suspense fallback={<Loading />}> <TermsOfService /></Suspense>
        },
        {
          path: "rewards-eligibility", element: <Suspense fallback={<Loading />}> <RewardsEligibility /></Suspense>
        },
        {
          path: "Partners", element: <Suspense fallback={<Loading />}> <PromotersLanding /></Suspense>
        },
        {
          path: "Subscribe", element: <Suspense fallback={<Loading />}> <Subscribe /></Suspense>
        },
        {
          path: "Subscription", element: <Suspense fallback={<Loading />}> <Subscribe /></Suspense>
        },
        {
          path: "account-deletion", element: <Suspense fallback={<Loading />}> <AccountDeletion /></Suspense>
        },
        {
          path: "premium", element: <Suspense fallback={<Loading />}> <Premium /></Suspense>
        }
      ]
    },
    {
      path: "/share/:VideoId", element: <VideoPreview />
    },
    {
      path: "/login",
      element: <LoginRoute />
    },
    {
      path: "/signup",
      element: <SignupRoute />
    },
    {
      path: "/auth/callback",
      element: <GoogleCallback />
    },
    {
      path: "/register",
      element: <RegisterRoute />
    },
    {
      path: "/confirm-email",
      element: <ConfirmEmailRouteWithTemp />
    },
    {
      path: "/forgot-password",
      element: <ForgotPasswordEmailRouteWithCode />
    },
    {
      path: "/reset-password",
      element: (
        <AuthWrapper>
          {({ navigate, auth }) => (
            <ForgotPasswordReset
              onReset={async (values) => {
                const success = await auth.resetPassword(
                  values.email,
                  values.password,
                  values.code
                );
                if (success) {
                  navigate('/login');
                }
              }}
              onBackToLogin={() => navigate('/login')}
              loading={auth.loading}
              error={auth.error}
            />
          )}
        </AuthWrapper>
      )
    },

    // User dash /////////////////////////////
    {
      path: "/dashboard", element: <LoginProtector><DashboardLayout role={"User"} /> </LoginProtector>, children: [
        {
          index: true,
          element: <Navigate to="/dashboard/files" replace />
        },
        {
          path: "files", element:
            <LoginProtector>
              <RoleProtectorWrapper requiredRole="User">
                <Files />
              </RoleProtectorWrapper>
            </LoginProtector>
        },
        {
          path: "file/:fileName/:fileId", element:
            <LoginProtector>
              <RoleProtectorWrapper requiredRole="User">
                <UploadFiles />
              </RoleProtectorWrapper>
            </LoginProtector>
        },
        {
          path: "zip/:zipName/:zipId", element:
            <LoginProtector>
              <RoleProtectorWrapper requiredRole="User">
                <ZipContents />
              </RoleProtectorWrapper>
            </LoginProtector>
        },
        {
          path: "profile", element:
            <LoginProtector>
              <RoleProtectorWrapper requiredRole="User">
                <Profile />
              </RoleProtectorWrapper>
            </LoginProtector>
        },
        {
          path: "notifications", element:
            <LoginProtector>
              <RoleProtectorWrapper requiredRole="User">
                <Notifications />
              </RoleProtectorWrapper>
            </LoginProtector>
        },
        {
          path: "channels", element:
            <LoginProtector>
              <RoleProtectorWrapper requiredRole="User">
                <Channels />
              </RoleProtectorWrapper>
            </LoginProtector>
        },
        {
          path: "channels/:channelId/files", element:
            <LoginProtector>
              <RoleProtectorWrapper requiredRole="User">
                <ChannelFiles />
              </RoleProtectorWrapper>
            </LoginProtector>
        }
      ]
    },
    // User dash

    // Promoter /////////////////////////////
    {
      path: "/Promoter", element: <LoginProtector><DashboardLayout role={"User"} /> </LoginProtector>, children: [
        {
          index: true, element:
            <LoginProtector>
              <PromoterProtector>
                <PromoterDashboard />
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "notifications", element:
            <LoginProtector>
              <PromoterProtector>
                <Notifications />
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "profile", element:
            <LoginProtector>
              <PromoterProtector>
                <Profile />
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "files", element:
            <LoginProtector>
              <PromoterProtector>
                <Files />
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "file/:fileName/:fileId", element:
            <LoginProtector>
              <PromoterProtector>
                <UploadFiles />
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "zip/:zipName/:zipId", element:
            <LoginProtector>
              <PromoterProtector>
                <ZipContents />
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "channels", element:
            <LoginProtector>
              <PromoterProtector>
                <PromoterChannels />
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "channels/:channelId/files", element:
            <LoginProtector>
              <PromoterProtector>
                <ChannelFiles />
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "revenue-data", element:
            <LoginProtector>
              <PromoterProtector>
                <PromoterWithPlanProtector>
                  <RevenueData />
                </PromoterWithPlanProtector>
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "shared-files", element:
            <LoginProtector>
              <PromoterProtector>
                <PromoterWithPlanProtector>
                  <SharedFiles />
                </PromoterWithPlanProtector>
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "Earnings", element:
            <LoginProtector>
              <PromoterProtector>
                <PromoterWithPlanProtector>
                  <Earning />
                </PromoterWithPlanProtector>
              </PromoterProtector>
            </LoginProtector>
        },
        {
          path: "referral", element:
            <LoginProtector>
              <PromoterProtector>
                <Referral />
              </PromoterProtector>
            </LoginProtector>
        }
      ]
    },
    // Promoter 

    // Staff (Owner + Admin) ////////////////////////////
    {
      path: "/Owner", element: <LoginProtector><DashboardLayout role={"Owner"} /> </LoginProtector>, children: [
        { index: true, element: staffPage(Analasys) },
        { path: "profile", element: staffPage(Profile) },
        { path: "Users", element: staffPage(Users) },
        { path: "Users/:id", element: staffPage(UserDetail) },
        { path: "UserStats", element: staffPage(UserStats) },
        { path: "Storage", element: staffPage(Storage) },
        { path: "AllPromoters", element: staffPage(Promoters) },
        { path: "Promoter/:id", element: staffPage(PromoterDetail) },
        { path: "Reports", element: staffPage(Reports) },
        { path: "Reports/:id", element: staffPage(ReportDetail) },
        { path: "Complaints", element: staffPage(Complaints) },
        { path: "Complaints/:id", element: staffPage(ComplaintDetail) },
        { path: "Shares", element: staffPage(AdminShares) },
        { path: "Shares/:id", element: staffPage(AdminShareDetail) },
        { path: "Channels", element: staffPage(AdminChannels) },
        { path: "Channels/:id", element: staffPage(AdminChannelDetail) },
        { path: "Files", element: staffPage(AdminFiles) },
        { path: "Files/:id", element: staffPage(AdminFileDetail) },
        { path: "Folders", element: staffPage(AdminFolders) },
        { path: "Folders/:id", element: staffPage(AdminFolderDetail) },
        { path: "Notifications", element: staffPage(AdminNotifications) },
        { path: "Withdrawals", element: staffPage(Withdrawals) },
        { path: "PaymentMethods", element: staffPage(AdminPaymentMethods) },
        { path: "Plans", element: staffPage(Plans) },
        { path: "Subscriptions", element: staffPage(AdminSubscriptions) },
        { path: "Wheel", element: staffPage(AdminWheel) },
        { path: "Catalogs", element: staffPage(AdminCatalogs) },
        { path: "Legal", element: staffPage(AdminLegal) },
        { path: "AppConfig", element: staffPage(AdminAppConfig) },
        { path: "Zips", element: staffPage(AdminZips) },
        { path: "Ocr", element: staffPage(AdminOcr) },
      ]
    }
    // Staff

  ]), []);

  return <RouterProvider router={router} />;
};

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

// Export AppRouter separately to ensure it's only created after AuthProvider
export { AppRouter };

export default App
