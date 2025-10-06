import express from "express";
import { auth } from "../middlewares/auth.js";
import { upload } from "../configs/multer.js";
import { 
    generateArticle, 
    generateBlogTitle, 
    generateImage,
    removeImageBackground,
    removeImageObject,
    resumeReview
} from "../controllers/aiController.js";

const aiRouter = express.Router();

// 文章生成路由
aiRouter.post('/generate-article', auth, generateArticle);

// 博客标题生成路由
aiRouter.post('/generate-blog-title', auth, generateBlogTitle);

// 图像生成路由
aiRouter.post('/generate-image', auth, generateImage);

// 背景移除路由
aiRouter.post('/remove-background', auth, upload.single('image'), removeImageBackground);

// 对象移除路由
aiRouter.post('/remove-object', auth, upload.single('image'), removeImageObject);

// 简历审查路由
aiRouter.post('/resume-review', auth, upload.single('resume'), resumeReview);

export default aiRouter;
