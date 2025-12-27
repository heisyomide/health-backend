const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// 1. Configure Cloudinary with your credentials
// These should be in your .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file from local storage to Cloudinary
 * @param {string} localFilePath - Path to the file stored by Multer
 * @param {string} folder - The folder name in Cloudinary (e.g., 'practitioner_licenses')
 */
const uploadToCloudinary = async (localFilePath, folder) => {
  try {
    if (!localFilePath) return null;

    // 2. Upload the file
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      resource_type: "auto", // Automatically detect if it's a PDF or Image
    });

    // 3. File has been uploaded successfully, remove it from local 'temp' storage
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response; // Contains .secure_url and .public_id
  } catch (error) {
    // If the upload fails, still remove the local file to prevent storage bloat
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary Upload Error:", error);
    return null;
  }
};

module.exports = { uploadToCloudinary };