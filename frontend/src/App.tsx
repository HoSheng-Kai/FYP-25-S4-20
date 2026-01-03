import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Layouts
import ConsumerLayout from "./components/layout/ConsumerLayout";
import ManufacturerLayout from "./components/layout/ManufacturerLayout";
import DistributorLayout from "./components/layout/DistributorLayout";
import RetailerLayout from "./components/layout/RetailerLayout";

// Dashboards
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import ManufacturerDashboardPage from "./pages/manufacturer/ManufacturerDashboardPage";
import DistributorDashboardPage from "./pages/distributor/DistributorDashboardPage";
import RetailerDashboardPage from "./pages/retailer/RetailerDashboardPage";
import ConsumerDashboardPage from "./pages/consumer/ConsumerDashboardPage";

// Product / consumer utilities
import QrInput from "./components/products/QrInput";
import TransactionHistory from "./components/products/TransactionHistory";

// Manufacturer pages
import ManufacturerProductsPage from "./pages/manufacturer/ManufacturerProductsPage";
import RegisterOnChainPage from "./pages/blockchain/RegisterOnChainPage";
// (optional legacy page kept for reference)
import RegisterProductPage from "./pages/manufacturer/RegisterProductPage";

// Marketplace
import MarketplacePage from "./pages/marketplace/MarketplacePage";
import MyListingsPage from "./pages/marketplace/MyListingsPage";
import EditListingPage from "./pages/marketplace/EditListingPage";

// Distributor
import DistributorTransferPage from "./pages/distributor/DistributorTransferPage";

// Blockchain transfer flow
import CreateTransferPage from "./pages/blockchain/CreateTransferPage";
import AcceptTransferPage from "./pages/blockchain/AcceptTransferPage";
import ExecuteTransferPage from "./pages/blockchain/ExecuteTransferPage";
import RegisterTestPage from "./pages/blockchain/RegisterTestPage";

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin (no special layout in this project) */}
      <Route path="/admin" element={<AdminDashboardPage />} />

      {/* Manufacturer */}
      <Route path="/manufacturer" element={<ManufacturerLayout />}>
        <Route index element={<ManufacturerDashboardPage />} />
        {/* New blockchain-first registration flow */}
        <Route path="register" element={<RegisterOnChainPage />} />
        {/* Legacy DB registration page (optional) */}
        <Route path="scan-qr" element={<QrInput />} />
        <Route path="register-legacy" element={<RegisterProductPage />} />
        <Route path="my-products" element={<ManufacturerProductsPage />} />
      </Route>

      {/* Distributor */}
      <Route path="/distributor" element={<DistributorLayout />}>
        <Route index element={<DistributorDashboardPage />} />
        <Route path="transfer" element={<DistributorTransferPage />} />
      </Route>

      {/* Retailer */}
      <Route path="/retailer" element={<RetailerLayout />}>
        <Route index element={<RetailerDashboardPage />} />
        <Route path="scan-qr" element={<QrInput />} />
      </Route>

      {/* Consumer + Marketplace */}
      <Route path="/consumer" element={<ConsumerLayout />}>
        <Route index element={<ConsumerDashboardPage />} />
        <Route path="scan-qr" element={<QrInput />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="my-listings" element={<MyListingsPage />} />
        <Route path="my-listings/:listingId/edit" element={<EditListingPage />} />
      </Route>

      {/* Optional standalone */}
      <Route path="/transaction-history" element={<TransactionHistory />} />

      {/* Blockchain transfer flow (standalone pages) */}
      <Route path="/blockchain/create" element={<CreateTransferPage />} />
      <Route path="/blockchain/accept" element={<AcceptTransferPage />} />
      <Route path="/blockchain/execute" element={<ExecuteTransferPage />} />
      <Route path="/blockchain/register-test" element={<RegisterTestPage />} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
