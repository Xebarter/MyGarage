import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');

const root = createRoot(container);
root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/vehicles" element={<App />} />
        <Route path="/mechanics" element={<App />} />
        <Route path="/part-identifier" element={<ImageAnalysis />} />
        <Route path="/profile" element={<App />} />
        <Route path="/service-history" element={<ServiceHistory />} />
        <Route path="/profile/documents" element={<DocumentsAndInsurance />} />
        <Route path="/documents-insurance" element={<DocumentsAndInsurance />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
        <Route path="/admin/appointments" element={<AdminAppointments />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/repairshop" element={<RepairShopDashboard />} />
        <Route path="/superadmin/*" element={<SuperAdminDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);