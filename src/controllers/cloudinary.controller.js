const cloudinary = require('cloudinary').v2;

exports.getCloudinarySignature = (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: 'practitioner_licenses',
    },
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
  });
};