import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("File is uploaded on Cloudinary", response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("Cloudinary failed to upload: ", error.message);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (file) => {
  try {
    if(!file) return null

    const [public_id, type] = file;

    const response = await cloudinary.uploader.destroy(public_id, {resource_type: type === "jpg" ? "image" : "video"})

    console.log("File is deleted from Cloudinary.")
    return response;
  } catch (error) {
    console.error("Cloudinary failed to delete: ", error.message)
    return null
  }
}

export { uploadOnCloudinary, deleteFromCloudinary, configureCloudinary };
