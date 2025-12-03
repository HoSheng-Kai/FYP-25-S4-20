import User from '../entities/User';

import { Request, Response } from "express";
import {generate_OTP, sendOTP} from '../utils/email_service';

class UserController {
  async createAccount(req: Request, res: Response){
    try{
      await User.createAccount(
        req.body.username,
        req.body.password,
        req.body.email,
        req.body.role_id);

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