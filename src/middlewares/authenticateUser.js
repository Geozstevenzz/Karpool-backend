const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
    const platform = req.headers['x-platform']; // Check for the custom header
  
    if (platform === 'mobile') {
        // Mobile: Check for the token in the Authorization header
        const authHeader = req.headers['authorization'];
        
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.sendStatus(401);
        
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user.id;

            next();
        });
    } else {
        // Web: Check for the token in the HTTP-only cookie
        const token = req.cookies.token;
        if (!token) return res.sendStatus(401);
    
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    }
  };

  module.exports = authenticateUser;