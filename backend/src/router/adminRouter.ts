import express from "express";
import userController from '../controller/AdminController';

const router = express.Router();

// Bind ensures `this` is correct if you ever use it in the controller
router.post('/create-accounts', userController.createAccounts.bind(userController));
router.get('/view-accounts', userController.viewAccounts.bind(userController));
router.post('/update-accounts', userController.updateAccounts.bind(userController));
router.delete('/delete-accounts', userController.deleteAccounts.bind(userController));
router.post('/ban-account', userController.banAccount.bind(userController));
router.get('/read-product-listings', userController.readProductListings.bind(userController));
router.delete('/delete-product-listings', userController.deleteProductListings.bind(userController));


export default router;
