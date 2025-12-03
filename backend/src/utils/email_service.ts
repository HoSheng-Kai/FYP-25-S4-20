import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import nodemailer from "nodemailer";

function generate_OTP(){
  let otp: number = crypto.randomInt(100000, 1000000);
  return otp;
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendOTP(email: string, otp: number) {
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>Login Verification</h2>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      `
    });

    console.log("OTP email sent to", email);
  } catch (err) {
    console.error("Failed to send OTP:", err);
    throw err;
  }
}

export {generate_OTP, sendOTP};