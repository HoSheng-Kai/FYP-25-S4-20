import User from '../entities/User';

import { Request, Response } from "express";
import {generate_OTP, sendOTP} from '../utils/email_service';

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

class UserController {
  async createAccount(req: Request, res: Response){
    try{
      let key_pair = Keypair.generate();
      let public_key = key_pair.publicKey.toBase58();
      let private_key = bs58.encode(key_pair.secretKey);

      await User.createAccount(
        req.body.username,
        req.body.password,
        req.body.email,
        req.body.role_id,
        private_key,
        public_key
      );

      console.log('Creating account:', {
        username: req.body.username,
        email: req.body.email,
        role_id: req.body.role_id,
        publicKey: public_key,
        privateKey: private_key,
        hasPassword: !!req.body.password
      });


      res.json({
        success: true
      });

    } catch(error: any){
      res.status(500).json({
        success: false,
        error: 'Failed to create account',
        details: error.message
      })
    }
  }

  async loginAccount(req: Request, res: Response){
    try{
      let user = await User.loginAccount(
        req.body.username,
        req.body.password
      );

      // Send otp here
      let otp: number = generate_OTP();
      await sendOTP(user.email, otp);

      res.json({
        success: true,
        otp: otp
      });
    }catch(error: any){
      res.status(500).json({
        success: false,
        error: 'Failed to login account',
        details: error.message
      })
    } 
  }

  async logoutAccount(req: Request, res: Response){
    try{
      let response: Boolean = await User.logoutAccount();

      res.json({
        success: response
      });
    }catch(error: any){
      res.status(500).json({
        success: false,
        error: 'Failed to logout account',
        details: error.message
      })
    }
  }
}

export default new UserController();