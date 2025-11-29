const User = require('../entity/test.entity');

class UserController {
  async getAllUsers(req, res) {
    try {
      const users = await User.findAll();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Full error:', error); 
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        details: error.message
      });
    }
  }
}

module.exports = new UserController();