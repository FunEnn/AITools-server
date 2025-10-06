import express from "express";
import { auth } from "../middlewares/auth.js";
import { 
    getUserCreations,
    getPublishedCreations,
    toggleLikeCreation
} from "../controllers/userController.js";

const userRouter = express.Router();

// 获取用户创作列表
userRouter.get('/get-user-creations', auth, getUserCreations);

// 获取已发布的创作列表（公开访问）
userRouter.get('/get-published-creations', auth, getPublishedCreations);

// 点赞/取消点赞创作
userRouter.post('/toggle-like-creation', auth, toggleLikeCreation);

export default userRouter;
