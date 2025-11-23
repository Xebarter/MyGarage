import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AdminReports } from './components/AdminReports.tsx';
import { AdminOrders } from './components/AdminOrders.tsx';
import { AdminOrderDetail } from './components/AdminOrderDetail.tsx';
import { AdminCategories } from './components/AdminCategories.tsx';
import { AdminProducts } from './components/AdminProducts.tsx';
import { AdminAppointments } from './components/AdminAppointments.tsx';
import { ImageAnalysis } from './components/general-public/ImageAnalysis.tsx';
import { RepairShopDashboard } from './components/repair-shop/RepairShopDashboard.tsx';
import { ProfileAndSecurity } from './components/general-public/ProfileAndSecurity.tsx';
import { ServiceHistory } from './components/general-public/ServiceHistory.tsx';
import { DocumentsAndInsurance } from './components/general-public/DocumentsAndInsurance';
import { VehicleManagement } from './components/general-public/VehicleManagement.tsx';
import './index.css';
import { Header } from './components/general-public/Header.tsx';

// Wrapper component to ensure all pages have the Header
function WithHeader({ children }: { children: React.ReactNode }) {
  // Mock cart items and functions for the Header component
  const mockCartItems: any[] = [];
  
  const handleCartClick = () => {
    // Mock function - in a real implementation this would open the cart
  };

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col">
      <Header 
        cartItems={mockCartItems}
        onCartClick={handleCartClick}
        currentView="shop"
        onViewChange={() => {}}
        selectedCategory={null}
        onCategorySelect={() => {}}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');

const root = createRoot(container);
root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/vehicles" element={
          <WithHeader>
            <VehicleManagement />
          </WithHeader>
        } />
        <Route path="/part-identifier" element={
          <WithHeader>
            <ImageAnalysis />
          </WithHeader>
        } />
        <Route path="/profile" element={
          <WithHeader>
            <ProfileAndSecurity />
          </WithHeader>
        } />
        <Route path="/service-history" element={
          <WithHeader>
            <ServiceHistory />
          </WithHeader>
        } />
        <Route path="/profile/documents" element={
          <WithHeader>
            <DocumentsAndInsurance />
          </WithHeader>
        } />
        <Route path="/documents-insurance" element={
          <WithHeader>
            <DocumentsAndInsurance />
          </WithHeader>
        } />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/appointments" element={<AdminAppointments />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/repairshop" element={<RepairShopDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);