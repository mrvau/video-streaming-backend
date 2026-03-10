import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { username, fullName, email, password } = req.body;

  // validation - not empty fields
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  // check if user already exist: username, email
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with same Email or Username already exists!");
  }

  // check for images, avatar
  let avatarLocalPath;
  let coverImageLocalPath;

  if (req.files) {
    const {avatar, coverImage} = req.files;

    if (Array.isArray(avatar) && avatar.length > 0) {
      avatarLocalPath = avatar[0].path;
    }

    if (Array.isArray(coverImage) && coverImage.length > 0) {
      coverImageLocalPath = coverImage[0].path;
    }
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // upload images to cloudinary, avatar
  const avatar = await uploadToCloudinary(avatarLocalPath);
  const coverImage = await uploadToCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // create user object - create entry in db
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // check for user creation
  // remove password & refresh token from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user!");
  }

  // return response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered Successfully."));
});

export { registerUser };
