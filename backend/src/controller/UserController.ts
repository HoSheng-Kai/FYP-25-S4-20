import User from '../entities/User';

import { Request, Response } from "express";
import {generate_OTP, sendOTP} from '../utils/email_service';

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

import { encrypt, decrypt } from '../utils/encryption';
import { setAuthCookie, clearAuthCookie } from "../auth/auth";
import { createPendingOtp, consumePendingOtp } from "../auth/otpStore";

class UserController {

  async createAccount(req: Request, res: Response){
    try{
      // Encrypt email and password
      let encrypted_email = await encrypt(req.body.email);
      let encrypted_password = await encrypt(req.body.password);

      await User.createAccount(
        req.body.username,
        encrypted_password,
        encrypted_email,
        req.body.role_id,
        req.body.public_key
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
        req.body.username
      );

      // Decrypt password and compare
      let decrypted_password = await decrypt(user.password);
      if(req.body.password != decrypted_password){
        res.json({
          success: false,
          error: 'Invalid password'
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
          error: 'Your account is banned. Please email admin@blocktrace.com for any queries',
          banned: user.banned
        });
        return;
      }

      // Decrypt email
      let decrypted_email = await decrypt(user.email);
      // Generate OTP
      const otpNumber: number = generate_OTP();
      await sendOTP(decrypted_email, otpNumber);

      // Store OTP server-side (as string for hashing)
      const tempAuthId = createPendingOtp(
        {
          userId: user.userId,
          role: user.role,
          username: user.username,
        },
        String(otpNumber)
      );

      res.json({ success: true, tempAuthId });
      return;
      
    }catch(error: any){
      res.status(500).json({
        success: false,
        error: 'Invalid username',
        details: error.message
      })
    }
  }
  async verifyOtp(req: Request, res: Response) {
    try {
      const { tempAuthId, otp } = req.body as { tempAuthId?: string; otp?: string };

      if (!tempAuthId || !otp) {
        res.status(400).json({ success: false, error: "Missing tempAuthId or otp" });
        return;
      }

      const userPayload = consumePendingOtp(tempAuthId, String(otp));
      if (!userPayload) {
        res.status(401).json({ success: false, error: "Invalid or expired OTP" });
        return;
      }

      // OTP passed → now set HttpOnly cookie session
      setAuthCookie(res, userPayload);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "OTP verification failed", details: err.message });
    }
  }

  async logoutAccount(req: Request, res: Response) {
    try {
      clearAuthCookie(res);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to logout account",
        details: error.message,
      });
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

      // Encrypt new password before saving
      const encrypted_password = await encrypt(newPassword);
      await User.updatePassword(userId, encrypted_password);

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

      // Encrypt new email before saving
      const encrypted_email = await encrypt(newEmail);
      await User.updateEmail(userId, encrypted_email);

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

  async forgotPassword(req: Request, res: Response) {
    try {
      const { username } = req.body;

      let user = await User.loginAccount(username);

      if (!user) {
        res.json({
          success: false,
          error: 'User not found'
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

      // Decrypt email and send OTP
      let decrypted_email = await decrypt(user.email);
      let otp: number = generate_OTP();
      await sendOTP(decrypted_email, otp);

      res.json({
        success: true,
        otp: otp,
        userId: user.userId,
        userid: user.userId
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to process forgot password request",
        details: error.message,
      });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId || isNaN(Number(userId))) {
        res.status(400).json({
          success: false,
          error: "Invalid userId",
        });
        return;
      }

      await User.deleteUser(Number(userId));

      res.json({
        success: true,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to delete user",
        details: error.message,
      });
    }
  }

  async updatePublicKey(req: Request, res: Response) {
    try {
      const { userId, newPublicKey } = req.body;

      await User.updatePublicKey(userId, newPublicKey);

      res.json({
        success: true,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to update public key",
        details: error.message,
      });
    }
  }
  async me(req: Request, res: Response) {
    if (!req.auth) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    res.json({
      success: true,
      user: req.auth,
    });
  }

}

export default new UserController();
