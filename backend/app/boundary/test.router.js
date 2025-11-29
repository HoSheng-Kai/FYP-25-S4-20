const express = require("express");
const router = express.Router();

const testController = require("../control/test.controller");

router.get('/test2', testController.getAllUsers);

module.exports = router;