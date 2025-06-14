// backend/services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a single image buffer to Cloudinary.
 * @param {Buffer} fileBuffer The image file as a buffer.
 * @param {string} folder The folder in Cloudinary to upload to (e.g., 'profile_images').
 * @returns {Promise<{ public_id: string, url: string }>} Object with public_id and URL.
 */
const uploadImageToCloudinary = async (fileBuffer, folder = 'uploads') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: 'auto' }, // resource_type: 'auto' means it detects image/video
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(new Error('Failed to upload image to Cloudinary'));
        }
        resolve({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }
    ).end(fileBuffer); // End the stream with the file buffer
  });
};

/**
 * Deletes an image from Cloudinary using its public_id.
 * @param {string} publicId The public_id of the image to delete.
 * @returns {Promise<any>} Cloudinary deletion response.
 */
const deleteImageFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary deletion result for ${publicId}:`, result);
    return result;
  } catch (error) {
    console.error(`Error deleting image ${publicId} from Cloudinary:`, error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

module.exports = {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
};