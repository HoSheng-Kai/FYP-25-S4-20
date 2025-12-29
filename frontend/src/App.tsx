import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Dashboards
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import ManufacturerDashboardPage from "./pages/manufacturer/ManufacturerDashboardPage";
import DistributorDashboardPage from "./pages/distributor/DistributorDashboardPage";
import ConsumerDashboardPage from "./pages/consumer/ConsumerDashboardPage";

// Consumer pages
import QrInput from "./components/products/QrInput";
import MarketplacePage from "./pages/marketplace/MarketplacePage";
import MyListingsPage from "./pages/marketplace/MyListingsPage";
import EditListingPage from "./pages/marketplace/EditListingPage";
import ConsumerLayout from "./components/layout/ConsumerLayout";

// Transaction History standalone (leave for now)
import TransactionHistory from "./components/products/TransactionHistory";

// Manufacturer pages
import ManufacturerProductsPage from "./pages/manufacturer/ManufacturerProductsPage";
import RegisterProductPage from "./pages/manufacturer/RegisterProductPage";

//Blockchain pages
import CreateTransferPage from './pages/blockchain/CreateTransferPage';
import AcceptTransferPage from './pages/blockchain/AcceptTransferPage';
import ExecuteTransferPage from './pages/blockchain/ExecuteTransferPage';
import RegisterTestPage from "./pages/blockchain/RegisterTestPage";
import RegisterOnChainPage from "./pages/blockchain/RegisterOnChainPage";

function App() {
  return (
    <Routes>
      {/* Default route */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin */}
      <Route path="/adminDashboardPage" element={<AdminDashboardPage />} />

      {/* Manufacturer */}
      <Route path="/manufacturerDashboardPage" element={<ManufacturerDashboardPage />} />
      <Route path="/ManufacturerProductsPage" element={<ManufacturerProductsPage />} />
      <Route path="/RegisterProductPage" element={<RegisterProductPage />} />

      {/* Distributor */}
      <Route path="/DistributorDashboardPage" element={<DistributorDashboardPage />} />

      {/* ✅ Consumer routes WITH persistent sidebar */}
      <Route element={<ConsumerLayout />}>
        <Route path="/ConsumerDashboardPage" element={<ConsumerDashboardPage />} />
        <Route path="/QrInput" element={<QrInput />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/my-listings" element={<MyListingsPage />} />
        <Route path="/my-listings/:listingId/edit" element={<EditListingPage />} />
      </Route>

      {/* Optional standalone page */}
      <Route path="/TransactionHistory" element={<TransactionHistory />} />

      {/* <Route path="/" element={<Navigate to="/blockchain/create" replace />} /> */}

      {/* Blockchain transfer flow */}
      <Route path="/blockchain/create" element={<CreateTransferPage />} />
      <Route path="/blockchain/accept" element={<AcceptTransferPage />} />
      <Route path="/blockchain/execute" element={<ExecuteTransferPage />} />
      <Route path="/blockchain/register-test" element={<RegisterTestPage />} />
      <Route path="/blockchain/register" element={<RegisterOnChainPage />} />

      {/* 404 */}
      <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />

    </Routes>
     
  );
}

export default App;
