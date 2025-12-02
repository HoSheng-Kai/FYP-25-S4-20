import { Request, Response } from 'express';
import { User } from '../entities/User';

class UserController {
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await User.findAll();
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Full error:', error);

      const message =
        error instanceof Error ? error.message : 'Unknown error';

      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        details: message,
      });
    }
  }
}

export default new UserController();
