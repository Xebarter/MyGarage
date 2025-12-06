import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import App from './App.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminReports } from './components/admin/AdminReports.tsx';
import { AdminOrders } from './components/admin/AdminOrders.tsx';
import { AdminOrderDetail } from './components/admin/AdminOrderDetail.tsx';
import { AdminProducts } from './components/admin/AdminProducts.tsx';
import { AdminAppointments } from './components/admin/AdminAppointments.tsx';
import { AdminSettings } from './components/admin/AdminSettings.tsx';
import { ImageAnalysis } from './components/general-public/ImageAnalysis.tsx';
import { RepairShopDashboard } from './components/repair-shop/RepairShopDashboard.tsx';
import { ProfileAndSecurity } from './components/general-public/ProfileAndSecurity.tsx';
import { ServiceHistory } from './components/general-public/ServiceHistory.tsx';
import { DocumentsAndInsurance } from './components/general-public/DocumentsAndInsurance';
import { VehicleManagement } from './components/general-public/VehicleManagement.tsx';
import { RepairShopLocator } from './components/general-public/RepairShopLocator.tsx';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard.tsx';
import Login from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import './index.css';
import { AgentDashboard } from './components/Agent';
import AgentReports from './components/Agent/AgentReports';
import AdminManagement from './components/Agent/AdminManagement';
import RepairShopManagement from './components/Agent/RepairShopManagement';
import AgentLayout from './components/Agent/AgentLayout';

// Import profile components for routing
import { ProfileOverview } from './components/general-public/profile/ProfileOverview';
import { MyVehicles } from './components/general-public/profile/MyVehicles';
import { Appointments as ProfileAppointments } from './components/general-public/profile/Appointments';
import { WalletAndPayments } from './components/general-public/profile/WalletAndPayments';
import { ServiceHistory as ProfileServiceHistory } from './components/general-public/profile/ServiceHistory';
import { DocumentsAndInsurance as ProfileDocumentsAndInsurance } from './components/general-public/profile/DocumentsAndInsurance';
import { SavedMechanics } from './components/general-public/profile/SavedMechanics';
import { MaintenanceReminders } from './components/general-public/profile/MaintenanceReminders';
import { MessagesAndSupport } from './components/general-public/profile/MessagesAndSupport';
import { Notifications } from './components/general-public/profile/Notifications';
import { Settings } from './components/general-public/profile/Settings';
import { ProfilesAndSecurity } from './components/general-public/profile/ProfilesAndSecurity';
import { AccountActivity } from './components/general-public/profile/AccountActivity';
import { ReferralsAndRewards } from './components/general-public/profile/ReferralsAndRewards';
import { RatingsReviews } from './components/general-public/profile/RatingsReviews';
import { Header } from './components/general-public/Header';

// Wrapper component to provide header and onBack prop to profile components
function ProfileLayout({ children }: { children: React.ReactNode }) {
  const [cartItems] = useState<any[]>([]);
  const navigate = useNavigate();

  return (
    <>
      <Header
        cartItems={cartItems}
        onCartClick={() => { }}
        currentView="profile"
        onViewChange={() => { }}
        onShowAppointmentForm={() => { }}
        selectedCategory={null}
        onCategorySelect={() => { }}
        onProfileOptionSelect={() => { }}
      />
      <div className="mt-0">
        {children}
      </div>
    </>
  );
}

// Wrapper components to provide onBack prop to profile components
function MyVehiclesWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <MyVehicles onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function WalletWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <WalletAndPayments onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function ServiceHistoryWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <ProfileServiceHistory onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function DocumentsWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <ProfileDocumentsAndInsurance onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function SavedMechanicsWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <SavedMechanics onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function MaintenanceRemindersWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <MaintenanceReminders onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function MessagesWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <MessagesAndSupport onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function NotificationsWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <Notifications onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function SettingsWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <Settings onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function ProfilesAndSecurityWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <ProfilesAndSecurity onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function AccountActivityWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <AccountActivity onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function ReferralsWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <ReferralsAndRewards onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function RatingsWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <RatingsReviews onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function ProfileOverviewWithHeader() {
  return (
    <ProfileLayout>
      <ProfileOverview />
    </ProfileLayout>
  );
}

function ProfileAppointmentsWithBack() {
  const navigate = useNavigate();
  return (
    <ProfileLayout>
      <ProfileAppointments onBack={() => navigate('/profile')} />
    </ProfileLayout>
  );
}

function ProfileDefaultRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/profile/overview', { replace: true });
  }, [navigate]);
  return null;
}

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');

const root = createRoot(container);
root.render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/vehicles" element={<App />} />
          <Route path="/mechanics" element={<App />} />
          <Route path="/part-identifier" element={<ImageAnalysis />} />
          <Route path="/login" element={<Login />} />

          {/* Profile routes */}
          <Route path="/profile" element={<ProtectedRoute allowedRoles={["user"]}><ProfileDefaultRedirect /></ProtectedRoute>} />
          <Route path="/profile/overview" element={<ProtectedRoute allowedRoles={["user"]}><ProfileOverviewWithHeader /></ProtectedRoute>} />
          <Route path="/profile/vehicles" element={<ProtectedRoute allowedRoles={["user"]}><MyVehiclesWithBack /></ProtectedRoute>} />
          <Route path="/profile/appointments" element={<ProtectedRoute allowedRoles={["user"]}><ProfileAppointmentsWithBack /></ProtectedRoute>} />
          <Route path="/profile/payments" element={<ProtectedRoute allowedRoles={["user"]}><WalletWithBack /></ProtectedRoute>} />
          <Route path="/profile/service-history" element={<ProtectedRoute allowedRoles={["user"]}><ServiceHistoryWithBack /></ProtectedRoute>} />
          <Route path="/profile/documents" element={<ProtectedRoute allowedRoles={["user"]}><DocumentsWithBack /></ProtectedRoute>} />
          <Route path="/profile/mechanics" element={<ProtectedRoute allowedRoles={["user"]}><SavedMechanicsWithBack /></ProtectedRoute>} />
          <Route path="/profile/reminders" element={<ProtectedRoute allowedRoles={["user"]}><MaintenanceRemindersWithBack /></ProtectedRoute>} />
          <Route path="/profile/messages" element={<ProtectedRoute allowedRoles={["user"]}><MessagesWithBack /></ProtectedRoute>} />
          <Route path="/profile/notifications" element={<ProtectedRoute allowedRoles={["user"]}><NotificationsWithBack /></ProtectedRoute>} />
          <Route path="/profile/settings" element={<ProtectedRoute allowedRoles={["user"]}><SettingsWithBack /></ProtectedRoute>} />
          <Route path="/profile/security" element={<ProtectedRoute allowedRoles={["user"]}><ProfilesAndSecurityWithBack /></ProtectedRoute>} />
          <Route path="/profile/account" element={<ProtectedRoute allowedRoles={["user"]}><AccountActivityWithBack /></ProtectedRoute>} />
          <Route path="/profile/referrals" element={<ProtectedRoute allowedRoles={["user"]}><ReferralsWithBack /></ProtectedRoute>} />
          <Route path="/profile/ratings" element={<ProtectedRoute allowedRoles={["user"]}><RatingsWithBack /></ProtectedRoute>} />

          {/* Redirect for alternative wallet URL */}
          <Route path="/profile/wallet" element={<ProtectedRoute allowedRoles={["user"]}><WalletWithBack /></ProtectedRoute>} />

          <Route path="/agent/*" element={<ProtectedRoute allowedRoles={["agent", "super_admin"]}><AgentLayout /></ProtectedRoute>}>
            <Route index element={<AgentDashboard />} />
            <Route path="dashboard" element={<AgentDashboard />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="repair-shops" element={<RepairShopManagement />} />
            <Route path="reports" element={<AgentReports />} />
          </Route>
          <Route path="/documents-insurance" element={<DocumentsAndInsurance />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/orders/:orderId" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminOrderDetail /></ProtectedRoute>} />
          <Route path="/admin/appointments" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminAppointments /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminSettings /></ProtectedRoute>} />
          <Route path="/repairshop" element={<ProtectedRoute allowedRoles={["mechanic", "super_admin"]}><RepairShopDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/*" element={<ProtectedRoute allowedRoles={["super_admin"]}><SuperAdminDashboard /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);