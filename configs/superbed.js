import axios from 'axios';
import FormData from 'form-data';

class SuperbedService {
    constructor() {
        this.apiUrl = 'https://api.superbed.cn/upload';
        this.token = process.env.SUPERBED_TOKEN;
    }

    /**
     * 上传图片到聚合图床
     * @param {Buffer} imageBuffer - 图片缓冲区
     * @param {Object} options - 上传选项
     * @param {string} options.filename - 文件名
     * @param {string} options.categories - 相册分类
     * @param {boolean} options.watermark - 是否添加水印
     * @param {boolean} options.compress - 是否压缩
     * @param {boolean} options.webp - 是否转换为webp
     * @returns {Promise<string>} 返回图片URL
     */
    async uploadImage(imageBuffer, options = {}) {
        try {
            const {
                filename = `upload-${Date.now()}.png`,
                categories = 'default',
                watermark = false,
                compress = true,
                webp = false
            } = options;

            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: filename,
                contentType: 'image/png'
            });
            formData.append('token', this.token);
            formData.append('categories', categories);
            formData.append('filename', filename);
            formData.append('watermark', watermark.toString());
            formData.append('compress', compress.toString());
            formData.append('webp', webp.toString());

            const response = await axios.post(this.apiUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // 检查上传结果
            if (response.data.err !== 0) {
                throw new Error(`聚合图床上传失败: ${response.data.msg}`);
            }

            return response.data.url;
        } catch (error) {
            console.error('聚合图床上传错误:', error);
            throw error;
        }
    }

    /**
     * 通过URL上传图片
     * @param {string} imageUrl - 图片URL
     * @param {Object} options - 上传选项
     * @returns {Promise<string>} 返回图片URL
     */
    async uploadFromUrl(imageUrl, options = {}) {
        try {
            const {
                categories = 'default',
                watermark = false,
                compress = true,
                webp = false
            } = options;

            const formData = new FormData();
            formData.append('src', imageUrl);
            formData.append('token', this.token);
            formData.append('categories', categories);
            formData.append('watermark', watermark.toString());
            formData.append('compress', compress.toString());
            formData.append('webp', webp.toString());

            const response = await axios.post(this.apiUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.err !== 0) {
                throw new Error(`聚合图床上传失败: ${response.data.msg}`);
            }

            return response.data.url;
        } catch (error) {
            console.error('聚合图床URL上传错误:', error);
            throw error;
        }
    }

    /**
     * 通过Base64上传图片
     * @param {string} base64Data - Base64编码的图片数据
     * @param {Object} options - 上传选项
     * @returns {Promise<string>} 返回图片URL
     */
    async uploadFromBase64(base64Data, options = {}) {
        try {
            const {
                filename = `base64-${Date.now()}.png`,
                categories = 'default',
                watermark = false,
                compress = true,
                webp = false
            } = options;

            const formData = new FormData();
            formData.append('base64', base64Data);
            formData.append('token', this.token);
            formData.append('categories', categories);
            formData.append('filename', filename);
            formData.append('watermark', watermark.toString());
            formData.append('compress', compress.toString());
            formData.append('webp', webp.toString());

            const response = await axios.post(this.apiUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.err !== 0) {
                throw new Error(`聚合图床上传失败: ${response.data.msg}`);
            }

            return response.data.url;
        } catch (error) {
            console.error('聚合图床Base64上传错误:', error);
            throw error;
        }
    }

    /**
     * 生成二维码
     * @param {string} content - 二维码内容
     * @param {Object} options - 上传选项
     * @returns {Promise<string>} 返回二维码图片URL
     */
    async generateQRCode(content, options = {}) {
        try {
            const {
                categories = 'qrcode',
                watermark = false,
                compress = true,
                webp = false
            } = options;

            const formData = new FormData();
            formData.append('qrcode', content);
            formData.append('token', this.token);
            formData.append('categories', categories);
            formData.append('watermark', watermark.toString());
            formData.append('compress', compress.toString());
            formData.append('webp', webp.toString());

            const response = await axios.post(this.apiUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.err !== 0) {
                throw new Error(`聚合图床二维码生成失败: ${response.data.msg}`);
            }

            return response.data.url;
        } catch (error) {
            console.error('聚合图床二维码生成错误:', error);
            throw error;
        }
    }
}

export default new SuperbedService();
