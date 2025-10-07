import sql from "../configs/db.js";

export const getUserCreations = async (req, res) => {
    try {
        const { userId } = req.auth();
        const creations = await sql`SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC`;
        res.json({ success: true, data: creations });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取创作内容失败' });
    }
};

export const getPublishedCreations = async (req, res) => {
    try {
        const creations = await sql`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;
        res.json({ success: true, data: creations });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取已发布创作内容失败' });
    }
};

export const toggleLikeCreation = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { id } = req.params;
        const [creation] = await sql`SELECT * FROM creations WHERE id = ${id}`;
        
        if (!creation) {
            return res.status(404).json({ success: false, message: "创作内容未找到" });
        }
        
        const currentLikes = creation.likes || [];
        const userIdStr = userId.toString();
        let updatedLikes;
        let message;
        
        if (currentLikes.includes(userIdStr)) {
            updatedLikes = currentLikes.filter((user) => user !== userIdStr);
            message = '取消点赞成功';
        } else {
            updatedLikes = [...currentLikes, userIdStr];
            message = '点赞成功';
        }
        
        const formattedArray = `{${updatedLikes.join(',')}}`;
        
        await sql`UPDATE creations SET likes = ${formattedArray}::text[] WHERE id = ${id}`;
        
        res.json({ success: true, message, data: { likes: updatedLikes } });
    } catch (error) {
        res.status(500).json({ success: false, message: '点赞操作失败' });
    }
};

