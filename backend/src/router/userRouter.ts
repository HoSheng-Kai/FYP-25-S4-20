import { Router } from 'express';
import userController from '../controller/UserController';

const router = Router();

// Bind ensures `this` is correct if you ever use it in the controller
router.get('/test2', userController.getAllUsers.bind(userController));

export default router;
