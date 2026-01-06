import { Router } from 'express';
import productController from '../controller/ProductController';
// import pool from '../schema/database';

const router = Router();

// ===========================
// Manufacturer
// ===========================

// Example:
// GET /api/products/verify?serial=NIKE-AIR-001
router.get('/verify', productController.verifyProductBySerial.bind(productController));

// Example:
// GET /api/products/history?serial=NIKE-AIR-001
router.get('/history', productController.getTransactionHistory.bind(productController));

// READ product listings for a manufacturer (includes products without listing)
router.get('/manufacturer/:manufacturerId/listings', productController.getManufacturerProductListings.bind(productController));

// ============================================
// DRAFT FLOW (REGISTER PRODUCT)
// ============================================
router.post('/draft', productController.createDraft.bind(productController));

// PUT /api/products/:productId/draft
router.put('/:productId/draft', productController.updateDraft.bind(productController));

// DELETE /api/products/:productId/draft
router.delete('/:productId/draft', productController.deleteDraft.bind(productController));

// POST /api/products/:productId/confirm-draft
router.post('/:productId/confirm-draft', productController.confirmDraft.bind(productController));

// router.post("/metadata", productController.storeMetadata.bind(productController));
router.post("/:productId/metadata-final", productController.storeMetadataAfterConfirm.bind(productController));

// POST /api/products/:productId/confirm
router.post("/:productId/confirm", productController.confirmProductOnChain.bind(productController));


// =============================================
// QR Code & Product Edit
// =============================================
// Example:
// GET /api/products/9/qrcode
router.get('/:productId/qrcode',productController.getProductQrCode.bind(productController));

// Example:
// GET /api/products/9/edit?manufacturerId=2
router.get('/:productId/edit', productController.getProductForEdit.bind(productController));

// Example:
// PUT /api/products/9
// Update product + regenerate QR
router.put('/:productId', productController.updateProduct.bind(productController));


// =============================================
// User
// =============================================

// Marketplace Page (Buyer View) – available products for sale
router.get('/marketplace/listings', productController.getMarketplaceListings.bind(productController));

// Get products owned by user (for creating listings)
router.get('/owned', productController.getOwnedProducts.bind(productController));

// Get user's own listings
router.get('/my-listings', productController.getMyListings.bind(productController));

// Create listing (sell product)
router.post("/listings", productController.createListing.bind(productController));

// Edit Listing Page – pre-fill data
// GET /api/products/listings/:listingId/edit?userId=6
router.get('/listings/:listingId/edit',productController.getListingForEdit.bind(productController));

// Save Changes – update listing
// PUT /api/products/listings/:listingId
router.put('/listings/:listingId',productController.updateListing.bind(productController));

// DELETE listing (user must be seller & current owner)
// DELETE /api/products/listings/:listingId?userId=6
router.delete('/listings/:listingId',productController.deleteListing.bind(productController));

// Toggle availability (My Listings switch/button)
router.patch('/listings/:listingId/availability',productController.updateListingAvailability.bind(productController));



export default router;
