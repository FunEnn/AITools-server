import axios from 'axios';
import sql from '../configs/db.js';
import {
    clerkClient
} from '@clerk/express';
import superbed from '../configs/superbed.js';
import fs from 'fs';
import pdf from 'pdf-parse';

export const generateArticle = async (req, res) => {
    try {
        const {
            userId
        } = req.auth();
        const {
            prompt,
            length
        } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({
                success: false,
                message: "您已达到免费使用次数限制（10次），请升级到高级账户以继续使用文章生成功能。"
            });
        }

        // 调用 SiliconFlow API 生成文章
        const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
            model: "Qwen/QwQ-32B",
            messages: [{
                role: "user",
                content: `请根据以下提示生成一篇${length || '中等长度'}的文章：${prompt}`
            }],
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
        await sql `INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'article')`;

        // 更新用户免费使用次数
        if (plan !== 'premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({
            success: true,
            content
        });

    } catch (error) {
        console.error('AI 文章生成错误:', error);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || 'AI 服务暂时不可用，请稍后重试'
        });
    }
};

export const generateBlogTitle = async (req, res) => {
    try {
        const {
            userId
        } = req.auth();
        const {
            prompt
        } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({
                success: false,
                message: "您已达到免费使用次数限制（10次），请升级到高级账户以继续使用博客标题生成功能。"
            });
        }

        // 调用 SiliconFlow API 生成博客标题
        const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
            model: "Qwen/QwQ-32B",
            messages: [{
                role: "user",
                content: `请根据以下主题生成吸引人的博客标题：${prompt}。要求标题简洁有力，能够吸引读者点击。`
            }],
            max_tokens: 500,
            temperature: 0.8,
            top_p: 0.9
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;

        // 保存到数据库
        await sql `INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;

        // 更新用户免费使用次数
        if (plan !== 'premium') {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({
            success: true,
            content
        });

    } catch (error) {
        console.error('AI 博客标题生成错误:', error);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || 'AI 服务暂时不可用，请稍后重试'
        });
    }
};


export const generateImage = async (req, res) => {
    try {
        const {
            userId
        } = req.auth();
        const {
            prompt,
            publish
        } = req.body;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "图像生成功能仅限高级用户使用，请升级您的账户以解锁此功能。"
            });
        }

        // 调用 SiliconFlow API 生成图像
        const response = await axios.post('https://api.siliconflow.cn/v1/images/generations', {
            model: "Kwai-Kolors/Kolors",
            prompt: prompt,
            image_size: "1024x1024",
            batch_size: 1,
            num_inference_steps: 20,
            guidance_scale: 7.5
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const imageUrl = response.data.images[0].url;

        // 下载生成的图像
        const downloadResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });
        const imageBuffer = Buffer.from(downloadResponse.data);

        // 使用封装的聚合图床服务上传图像
        const uploadedImageUrl = await superbed.uploadImage(imageBuffer, {
            filename: `ai-generated-${Date.now()}.png`,
            categories: 'ai-generated',
            watermark: false, // 关闭水印
            compress: true, // 开启压缩
            webp: false // 保持PNG格式
        });

        // 保存到数据库
        await sql `INSERT INTO creations (user_id, prompt, content, type, publish) VALUES (${userId}, ${prompt}, ${uploadedImageUrl}, 'image', ${publish || false})`;

        res.json({
            success: true,
            content: uploadedImageUrl
        });

    } catch (error) {
        console.error('AI 图像生成错误:', error);

        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
};

export const removeImageBackground = async (req, res) => {
    try {
        const {
            userId
        } = req.auth();
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "背景移除功能仅限高级用户使用，请升级您的账户以解锁此功能。"
            });
        }

        // 检查是否有上传的图像文件
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "请上传要处理的图像文件"
            });
        }

        // 将上传的图像转换为base64
        const imageBuffer = req.file.buffer;
        const base64Image = `data:image/${req.file.mimetype.split('/')[1]};base64,${imageBuffer.toString('base64')}`;

        // 调用 SiliconFlow API 进行背景移除
        const response = await axios.post('https://api.siliconflow.cn/v1/images/generations', {
            model: "Qwen/Qwen-Image-Edit-2509",
            prompt: "remove background, transparent background",
            image: base64Image,
            image_size: "1024x1024",
            num_inference_steps: 20,
            guidance_scale: 7.5
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const processedImageUrl = response.data.images[0].url;

        // 下载处理后的图像
        const downloadResponse = await axios.get(processedImageUrl, {
            responseType: 'arraybuffer'
        });
        const processedImageBuffer = Buffer.from(downloadResponse.data);

        // 使用封装的聚合图床服务上传处理后的图像
        const uploadedImageUrl = await superbed.uploadImage(processedImageBuffer, {
            filename: `background-removed-${Date.now()}.png`,
            categories: 'background-removed',
            watermark: false, // 关闭水印
            compress: true, // 开启压缩
            webp: false // 保持PNG格式以支持透明背景
        });

        // 保存到数据库
        await sql `INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, 'background_removal', ${uploadedImageUrl}, 'image')`;
        res.json({
            success: true,
            content: uploadedImageUrl
        });

    } catch (error) {
        console.error('背景移除错误:', error);

        res.status(500).json({
            success: false,
            message: error.response?.data?.message || '背景移除服务暂时不可用，请稍后重试'
        });
    }
};

export const removeImageObject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { object } = req.body;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "对象移除功能仅限高级用户使用，请升级您的账户以解锁此功能。"
            });
        }

        // 检查是否有上传的图像文件
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "请上传要处理的图像文件"
            });
        }

        // 检查是否指定了要移除的对象
        if (!object) {
            return res.status(400).json({
                success: false,
                message: "请指定要移除的对象"
            });
        }

        // 将上传的图像转换为base64
        const imageBuffer = req.file.buffer;
        const base64Image = `data:image/${req.file.mimetype.split('/')[1]};base64,${imageBuffer.toString('base64')}`;

        // 调用 SiliconFlow API 进行对象移除
        const response = await axios.post('https://api.siliconflow.cn/v1/images/generations', {
            model: "Qwen/Qwen-Image-Edit-2509",
            prompt: `remove ${object} from the image, keep the background and other objects intact`,
            image: base64Image,
            image_size: "1024x1024",
            num_inference_steps: 25,
            guidance_scale: 8.0
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const processedImageUrl = response.data.images[0].url;

        // 下载处理后的图像
        const downloadResponse = await axios.get(processedImageUrl, {
            responseType: 'arraybuffer'
        });
        const processedImageBuffer = Buffer.from(downloadResponse.data);

        // 使用封装的聚合图床服务上传处理后的图像
        const uploadedImageUrl = await superbed.uploadImage(processedImageBuffer, {
            filename: `object-removed-${Date.now()}.png`,
            categories: 'object-removed',
            watermark: false, // 关闭水印
            compress: true, // 开启压缩
            webp: false // 保持PNG格式
        });

        // 保存到数据库
        await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${`object_removal_${object}`}, ${uploadedImageUrl}, 'image')`;
        
        res.json({
            success: true,
            content: uploadedImageUrl,
            removedObject: object
        });

    } catch (error) {
        console.error('对象移除错误:', error);

        res.status(500).json({
            success: false,
            message: error.response?.data?.message || '对象移除服务暂时不可用，请稍后重试'
        });
    }
};


export const resumeReview = async (req, res) => {
    try {
        const { userId } = req.auth();
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "简历审查功能仅限高级用户使用，请升级您的账户以解锁此功能。"
            });
        }

        // 检查是否有上传的简历文件
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "请上传要审查的简历文件（PDF格式）"
            });
        }

        // 读取PDF文件内容
        const dataBuffer = req.file.buffer;
        const pdfData = await pdf(dataBuffer);

        // 构建简历审查提示词
        const prompt = `请仔细审查以下简历，并提供建设性的反馈意见，包括：

1. 简历的优势和亮点
2. 需要改进的地方
3. 格式和结构建议
4. 内容完整性评估
5. 关键词优化建议
6. 整体评分（1-10分）

简历内容：
${pdfData.text}

请用中文回复，并提供具体、实用的建议。`;

        // 调用 SiliconFlow API 进行简历审查
        const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
            model: "Qwen/QwQ-32B",
            messages: [{
                role: "user",
                content: prompt
            }],
            max_tokens: 2000,
            temperature: 0.7,
            top_p: 0.9
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const reviewContent = response.data.choices[0].message.content;

        // 保存到数据库
        await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, 'resume_review', ${reviewContent}, 'resume-review')`;
        
        res.json({
            success: true,
            content: reviewContent,
            reviewType: 'resume'
        });

    } catch (error) {
        console.error('简历审查错误:', error);

        res.status(500).json({
            success: false,
            message: error.response?.data?.message || '简历审查服务暂时不可用，请稍后重试'
        });
    }
};