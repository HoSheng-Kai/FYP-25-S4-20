import express from "express";
import DistributorController from '../controller/DistributorController';

const router = express.Router();

// Bind ensures `this` is correct if you ever use it in the controller

router.post('/update-ownership', DistributorController.updateOwnership.bind(DistributorController));


export default router;
