import multer from "multer";

// 使用内存存储，适合处理图像文件
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制文件大小为10MB
  },
  fileFilter: (_req, file, cb) => {
    // 允许图像文件和PDF文件
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("只允许上传图像文件或PDF文件"), false);
    }
  },
});
