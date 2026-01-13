import AdminEntity from '../entities/Admin';

import { Request, Response } from "express";


class AdminController{
    // Need to change create-users for this one
    async createAccounts(req: Request, res: Response){
        try{
            await AdminEntity.createAccounts(
                req.body.usernames,
                
            );

            res.json({
                success: true,
            });

            }catch(error: any){
            res.status(500).json({
                success: false,
                error: 'Failed to create accounts',
                details: error.message
            })
        }
    }

    async viewAccounts(req: Request, res: Response){
        try{
            let accounts = await AdminEntity.viewAccounts(
                req.query.username as string,
                req.query.role_id as string,
                req.query.verified ? req.query.verified === 'true' : null
            );

            res.json({
                success: true,
                data: accounts,
            });

            }catch(error: any){
            res.status(500).json({
                success: false,
                error: 'Failed to view accounts',
                details: error.message
            })
        } 
    }

    async updateAccounts(req: Request, res: Response){
        try{
            await AdminEntity.updateAccounts(
                req.body.username,
                req.body.role_id
            );

            res.json({
                success: true,
            });

            }catch(error: any){
            res.status(500).json({
                success: false,
                error: 'Failed to update accounts',
                details: error.message
            })
        } 
    }

    async deleteAccounts(req: Request, res: Response){
        try{
            await AdminEntity.deleteAccounts(
                req.body.usernames,
            );

            res.json({
                success: true,
            });

            }catch(error: any){
            res.status(500).json({
                success: false,
                error: 'Failed to delete accounts',
                details: error.message
            })
        } 
    }

    async banAccount(req: Request, res: Response){
        try{
            const userId = Number(req.body.userId);
            const banned = req.body.banned !== false; // default to true
            if (!userId) {
                return res.status(400).json({ success: false, error: 'Missing userId' });
            }
            await AdminEntity.banAccount(userId, banned);
            res.json({ success: true });
        }catch(error: any){
            res.status(500).json({
                success: false,
                error: 'Failed to update ban status',
                details: error.message
            })
        }
    }

    async readProductListings(req: Request, res: Response){
        try{
            let listings = await AdminEntity.readProductListings();

            res.json({
                success: true,
                listings: listings
            });

            }catch(error: any){
            res.status(500).json({
                success: false,
                error: 'Failed to delete accounts',
                details: error.message
            })
        }
    }

    async deleteProductListings(req: Request, res: Response){
        try{
            await AdminEntity.deleteProductListings(
                req.body.listing_id
            );

            res.json({
                success: true
            });

            }catch(error: any){
            res.status(500).json({
                success: false,
                error: 'Failed to delete accounts',
                details: error.message
            })
        }
    }
}

export default new AdminController();