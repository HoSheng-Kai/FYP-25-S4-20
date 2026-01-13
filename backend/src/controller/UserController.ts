import User from '../entities/User';

import { Request, Response } from "express";
import {generate_OTP, sendOTP} from '../utils/email_service';

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

import { encrypt, decrypt } from '../utils/encryption';

class UserController {
  // ============================================================
  // ⚠️ DEPRECATED - USES PRIVATE KEYS - DELETE AFTER TESTING ⚠️
  // ============================================================
  async createAccount(req: Request, res: Response){
    try{
      let key_pair = Keypair.generate();
      let public_key = key_pair.publicKey.toBase58();
      let private_key = bs58.encode(key_pair.secretKey);

      // // TODO: Encryption
      // let encrypted_email = await encrypt(req.body.email);
      // let encrypted_password = await encrypt(req.body.password);
      // let encrypted_private_key = await encrypt(private_key);

      // await User.createAccount(
      //   req.body.username,
      //   encrypted_password,
      //   encrypted_email,
      //   req.body.role_id,
      //   encrypted_private_key,
      //   public_key
      // );

      // Prefer any explicitly provided public_key, else use generated one
      const resolvedPublicKey = req.body.public_key ?? public_key;

      await User.createAccount(
        req.body.username,
        req.body.password,
        req.body.email,
        req.body.role_id,
        private_key,
        resolvedPublicKey
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
  // ============================================================
  // ✅ UNCOMMENT BELOW WHEN DEPLOYING (no private key)
  // ============================================================
  // async createAccount(req: Request, res: Response){
  //   try{
  //
  //     // // TODO: Encryption
  //     // let encrypted_email = await encrypt(req.body.email);
  //     // let encrypted_password = await encrypt(req.body.password);
  //
  //     // await User.createAccount(
  //     //   req.body.username,
  //     //   encrypted_password,
  //     //   encrypted_email,
  //     //   req.body.role_id,
  //     //   publicKey
  //     // );
  //
  //     await User.createAccount(
  //       req.body.username,
  //       req.body.password,
  //       req.body.email,
  //       req.body.role_id,
  //       req.body.public_key
  //     );
  //
  //     res.json({
  //       success: true
  //     });
  //
  //   } catch(error: any){
  //     res.status(500).json({
  //       success: false,
  //       error: 'Failed to create account',
  //       details: error.message
  //     })
  //   }
  // }

  async loginAccount(req: Request, res: Response){
    try{
      let user = await User.loginAccount(
        req.body.username
      );

      // // TODO: Decryption
      // if(req.body.password != await decrypt(user.password)){
      //   res.json({
      //   success: false,
      //   error: 'User entered wrong password'
      //   });
      //   return;
      // }

      if(req.body.password != user.password){
        res.json({
        success: false,
        error: 'User entered wrong password'
        });
        return;
      }

      // If not verified
      if(!user.verified){
        res.json({
        success: false,
        error: 'User is not verified',
        verified: user.verified
        });
        return;
      }

      // If banned
      if(user.banned){
        res.json({
        success: false,
        error: 'User is banned',
        banned: user.banned
        });
        return;
      }

      // // TODO: Decryption
      // let email = await decrypt(user.email);
      
      let otp: number = generate_OTP();
      await sendOTP(user.email, otp);

      res.json({
        success: true,
        otp: otp,
        role: user.role,
        userId: user.userId,
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
  async listUsers(req: Request, res: Response) {
    try {
      const users = await User.listUsers();

      res.json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to list users",
        details: error.message,
      });
    }
  }

  async updatePassword(req: Request, res: Response) {
    try {
      const { userId, newPassword } = req.body;

      await User.updatePassword(userId, newPassword);

      res.json({
        success: true,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update password",
        details: error.message,
      });
    }
  }

  async updateEmail(req: Request, res: Response) {
    try {
      const { userId, newEmail } = req.body;

      await User.updateEmail(userId, newEmail);

      res.json({
        success: true,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update email",
        details: error.message,
      });
    }
  }
}

export default new UserController();
