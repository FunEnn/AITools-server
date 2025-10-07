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
        
        // 获取用户权限信息
        const hasPremiumPlan = await has({ plan: 'premium' });
        const user = await clerkClient.users.getUser(userId);

        let freeUsage = 0;
        if (!hasPremiumPlan && user.privateMetadata?.free_usage) {
            freeUsage = user.privateMetadata.free_usage;
        } else if (!hasPremiumPlan) {
            // 初始化免费用户使用次数
            try {
                await clerkClient.users.updateUserMetadata(userId, {
                    privateMetadata: {
                        free_usage: 0
                    }
                });
            } catch (error) {
                console.warn('更新用户元数据失败，继续处理:', error.message);
            }
        }
        
        req.plan = hasPremiumPlan ? 'premium' : 'free';
        req.free_usage = freeUsage;
        next();
    } catch (error) {
        console.error('认证中间件错误:', error);
        
        // 处理特定的Clerk错误
        if (error.status === 429) {
            return res.status(429).json({ 
                success: false, 
                message: "请求过于频繁，请稍后重试" 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: error.message || "认证失败，请稍后重试" 
        });
    }
};
