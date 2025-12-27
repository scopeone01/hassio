import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authenticate JWT token
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

// Generate JWT token
export const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.roleName
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

// Generate refresh token
export const generateRefreshToken = (user) => {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production';
    return jwt.sign(
        { id: user.id },
        refreshSecret,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production';
    try {
        return jwt.verify(token, refreshSecret);
    } catch (error) {
        return null;
    }
};








