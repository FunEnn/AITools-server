import { clerkClient } from "@clerk/express";

// Middleware to check userId and hasPremiumPlan
export const auth = async (req, res, next) => {
    try {
        // 检查认证状态
        if (!req.auth) {
            return res.status(401).json({ 
                success: false, 
                message: "认证中间件未初始化" 
            });
        }

        const authResult = await req.auth();
        
        if (!authResult || !authResult.userId) {
            return res.status(401).json({ 
                success: false, 
                message: "用户未认证，请先登录" 
            });
        }

        const { userId, has } = authResult;
        const hasPremiumPlan = await has({ plan: 'premium' });
        const user = await clerkClient.users.getUser(userId);

        if (!hasPremiumPlan && user.privateMetadata.free_usage) {
            req.free_usage = user.privateMetadata.free_usage;
        } else {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: 0
                }
            });
            req.free_usage = 0;
        }
        
        req.plan = hasPremiumPlan ? 'premium' : 'free';
        next();
    } catch (error) {
        console.error('认证中间件错误:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || "认证失败，请稍后重试" 
        });
    }
};
