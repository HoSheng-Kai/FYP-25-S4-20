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

      // If verified, send otp?
      if(user.verified){
        // Send otp here
        let otp: number = generate_OTP();
        await sendOTP(user.email, otp);

        res.json({
          success: true,
          otp: otp,
          role: user.role,
          verified: user.verified
        });
      }
      
      res.json({
        success: false,
        verified: user.verified
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
