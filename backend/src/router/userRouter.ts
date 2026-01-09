import express from "express";
import userController from '../controller/UserController';

const router = express.Router();

// Bind ensures `this` is correct if you ever use it in the controller
router.post('/create-account', userController.createAccount.bind(userController));
router.post('/login-account', userController.loginAccount.bind(userController));
router.post('/logout-account', userController.logoutAccount.bind(userController));
router.get("/list", userController.listUsers.bind(userController));

export default router;
