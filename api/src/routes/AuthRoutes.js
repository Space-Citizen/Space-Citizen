const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthControllers');

//Sign in
router.post('/signin', AuthController.signIn);

//Sign up
router.post('/signup', AuthController.signUp);

module.exports = router;
