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
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminListingsPage from "./pages/admin/AdminListingsPage";
import AdminRegistrationPage from "./pages/admin/AdminRegistrationPage";
import ManufacturerDashboardPage from "./pages/manufacturer/ManufacturerDashboardPage";
import DistributorDashboardPage from "./pages/distributor/DistributorDashboardPage";
import RetailerDashboardPage from "./pages/retailer/RetailerDashboardPage";
import ConsumerDashboardPage from "./pages/consumer/ConsumerDashboardPage";
import ChatsPage from "./pages/consumer/ChatsPage";
import ChatThreadPage from "./pages/consumer/ChatThreadPage";

// Product / consumer utilities
import QrInput from "./components/products/QrInput";
import TransactionHistory from "./components/products/TransactionHistory";

// Consumer pages
import MyProductsPage from "./pages/consumer/MyProductsPage";
import UserReviewsPage from "./pages/consumer/UserReviewsPage";
import ProductDetailsPage from "./pages/consumer/ProductDetailsPage";

// Manufacturer pages
import ManufacturerProductsPage from "./pages/manufacturer/ManufacturerProductsPage";
import RegisterOnChainPage from "./pages/blockchain/RegisterOnChainPage";

// Marketplace
import MarketplacePage from "./pages/marketplace/MarketplacePage";
import MyListingsPage from "./pages/marketplace/MyListingsPage";
import EditListingPage from "./pages/marketplace/EditListingPage";
import CreateListingPage from "./pages/marketplace/CreateListingPage";

// Distributor
import DistributorProductsPage from "./pages/distributor/DistributorProductsPage";

// Retailer
import RetailerProductsPage from "./pages/retailer/RetailerProductsPage";
import RetailerReviewsPage from "./pages/retailer/RetailerReviewsPage";

// Shared
import SharedProductDetailsPage from "./pages/shared/ProductDetailsPage";
import SettingsPage from "./pages/shared/SettingsPage";


export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/admin/listings" element={<AdminListingsPage />} />
      <Route path="/admin/register" element={<AdminRegistrationPage />} />

      {/* Manufacturer */}
      <Route path="/manufacturer" element={<ManufacturerLayout />}>
        <Route index element={<ManufacturerDashboardPage />} />
        <Route path="register" element={<RegisterOnChainPage />} />
        <Route path="scan-qr" element={<QrInput />} />
        <Route path="my-products" element={<ManufacturerProductsPage />} />
        <Route path="product/:productId" element={<SharedProductDetailsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Distributor */}
      <Route path="/distributor" element={<DistributorLayout />}>
        <Route index element={<DistributorDashboardPage />} />
        <Route path="scan-qr" element={<QrInput />} />
        <Route path="products" element={<DistributorProductsPage />} />
        <Route path="product/:productId" element={<SharedProductDetailsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Retailer */}
      <Route path="/retailer" element={<RetailerLayout />}>
        <Route index element={<RetailerDashboardPage />} />
        <Route path="scan-qr" element={<QrInput />} />
        <Route path="products" element={<RetailerProductsPage />} />
        <Route path="product/:productId" element={<SharedProductDetailsPage />} />
        <Route path="reviews" element={<RetailerReviewsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Consumer + Marketplace */}
      <Route path="/consumer" element={<ConsumerLayout />}>
        <Route index element={<ConsumerDashboardPage />} />
        <Route path="scan-qr" element={<QrInput />} />
        <Route path="my-products" element={<MyProductsPage />} />
        <Route path="product/:productId" element={<ProductDetailsPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="chats/:threadId" element={<ChatThreadPage />} />
        <Route path="my-listings" element={<MyListingsPage />} />
        <Route path="create-listing" element={<CreateListingPage />} />
        <Route path="my-listings/:listingId/edit" element={<EditListingPage />} />
        <Route path="reviews" element={<UserReviewsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Optional standalone */}
      <Route path="/transaction-history" element={<TransactionHistory />} />

      {/* Shared*/}
      <Route path="/products/:productId/details" element={<ProductDetailsPage />} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
