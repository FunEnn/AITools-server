import axios from 'axios';
import FormData from 'form-data';

class SMMSService {
    constructor() {
        this.apiUrl = 'https://sm.ms/api/v2/upload';
        this.token = process.env.SM_MS_TOKEN;
    }

    /**
     * 上传图片到SM.MS图床
     * @param {Buffer} imageBuffer - 图片缓冲区
     * @param {Object} options - 上传选项
     * @param {string} options.filename - 文件名
     * @returns {Promise<string>} 返回图片URL
     */
    async uploadImage(imageBuffer, options = {}) {
        try {
            const {
                filename = `upload-${Date.now()}.png`
            } = options;

            // 检查token
            if (!this.token) {
                throw new Error('SM.MS Token 未配置，请设置 SM_MS_TOKEN 环境变量');
            }

            const formData = new FormData();
            formData.append('smfile', imageBuffer, {
                filename: filename,
                contentType: 'image/png'
            });

            const response = await axios.post(this.apiUrl, formData, {
                headers: {
                    'Authorization': this.token,
                    'Content-Type': 'multipart/form-data',
                    ...formData.getHeaders()
                }
            });

            // 检查上传结果
            if (!response.data.success) {
                throw new Error(`SM.MS上传失败: ${response.data.message}`);
            }

            return response.data.data.url;
        } catch (error) {
            console.error('SM.MS上传错误:', error);
            throw error;
        }
    }

    /**
     * 通过URL上传图片到SM.MS
     * @param {string} imageUrl - 图片URL
     * @param {Object} options - 上传选项
     * @returns {Promise<string>} 返回图片URL
     */
    async uploadFromUrl(imageUrl, options = {}) {
        try {
            // 先下载图片
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer'
            });
            
            const imageBuffer = Buffer.from(imageResponse.data);
            const filename = imageUrl.split('/').pop() || `url-${Date.now()}.png`;
            
            return await this.uploadImage(imageBuffer, { filename });
        } catch (error) {
            console.error('SM.MS URL上传错误:', error);
            throw error;
        }
    }

    /**
     * 通过Base64上传图片到SM.MS
     * @param {string} base64Data - Base64编码的图片数据
     * @param {Object} options - 上传选项
     * @returns {Promise<string>} 返回图片URL
     */
    async uploadFromBase64(base64Data, options = {}) {
        try {
            const {
                filename = `base64-${Date.now()}.png`
            } = options;

            // 移除data:image前缀（如果存在）
            const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
            
            // 将Base64转换为Buffer
            const imageBuffer = Buffer.from(base64String, 'base64');
            
            return await this.uploadImage(imageBuffer, { filename });
        } catch (error) {
            console.error('SM.MS Base64上传错误:', error);
            throw error;
        }
    }

    /**
     * 获取上传历史记录
     * @param {number} page - 页码，默认为1
     * @returns {Promise<Array>} 返回上传历史记录
     */
    async getUploadHistory(page = 1) {
        try {
            const response = await axios.get('https://sm.ms/api/v2/upload_history', {
                headers: {
                    'Authorization': this.token
                },
                params: {
                    page: page
                }
            });

            if (!response.data.success) {
                throw new Error(`获取上传历史失败: ${response.data.message}`);
            }

            return response.data.data;
        } catch (error) {
            console.error('SM.MS获取上传历史错误:', error);
            throw error;
        }
    }

    /**
     * 删除图片
     * @param {string} hash - 图片删除哈希
     * @returns {Promise<boolean>} 返回删除结果
     */
    async deleteImage(hash) {
        try {
            const response = await axios.get(`https://sm.ms/api/v2/delete/${hash}`, {
                headers: {
                    'Authorization': this.token
                }
            });

            return response.data.success;
        } catch (error) {
            console.error('SM.MS删除图片错误:', error);
            throw error;
        }
    }
}

export default new SMMSService();
