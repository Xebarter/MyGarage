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
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/reports" element={<AdminReports />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);