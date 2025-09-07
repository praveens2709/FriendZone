const cloudinary = require('../config/cloudinary');

const uploadImageToCloudinary = async (fileBuffer, folder = 'posts') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }
    ).end(fileBuffer);
  });
};

const deleteImageFromCloudinary = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

module.exports = {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
};
