import axios from 'axios';
import sql from '../configs/db.js';
import { clerkClient } from '@clerk/express';

export const generateArticle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({ success: false, message: "Limit reached. Upgrade to continue."});
        }

        // 调用 SiliconFlow API 生成文章
        const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
            model: "Qwen/QwQ-32B",
            messages: [
                {
                    role: "user",
                    content: `请根据以下提示生成一篇${length || '中等长度'}的文章：${prompt}`
                }
            ],
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;

        // 保存到数据库
        await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'article')`;

        // 更新用户免费使用次数
        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success: true, content });

    } catch (error) {
        console.error('AI 文章生成错误:', error);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || 'AI 服务暂时不可用，请稍后重试'
        });
    }
};
