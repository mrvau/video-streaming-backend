import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggle = async (resourceId, userId, resourceType) => {
  if (!isValidObjectId(resourceId))
    return { data: null, error: true, message: `Invalid ${resourceType} id!` };

  try {
    const [liked] = await Like.find({
      [resourceType]: resourceId,
      likedBy: userId,
    });

    if (liked) {
      const disliked = await Like.findByIdAndDelete(liked._id);

      return {
        data: disliked,
        message: `Successfully disliked the ${resourceType}`,
        error: false,
      };
    }

    const like = await Like.create({
      [resourceType]: new mongoose.Types.ObjectId(resourceId),
      likedBy: userId,
    });

    return {
      data: like,
      message: `Successfully liked the ${resourceType}`,
      error: false,
    };
  } catch (error) {
    return { data: null, error: true, message: error.message };
  }
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const result = await toggle(videoId, req.user._id, "video");

  if (result.error) throw new ApiError(400, result.message);

  return res
    .status(200)
    .json(new ApiResponse(200, result.data, result.message));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const result = await toggle(commentId, req.user._id, "comment");

  if (result.error) throw new ApiError(400, result.message);

  return res
    .status(200)
    .json(new ApiResponse(200, result.data, result.message));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const result = await toggle(tweetId, req.user._id, "tweet")

  if(result.error) throw new ApiError(400, result.message)

  return res
      .status(200)
      .json(new ApiResponse(200, result.data, result.message));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const videos = await Like.aggregate([
    {
      $match: {
        likedBy: req.user._id,
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
      },
    },
    {
      $addFields: {
        likedVideo: { $first: "$likedVideo" },
      },
    },
    {
      $project: { likedVideo: 1 },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ["$$ROOT", "$likedVideo"],
        },
      },
    },
    {
      $unset: "likedVideo",
    },
  ]);

  if (!videos.length) throw new ApiError(404, "Liked videos not found!");

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Fetched liked videos successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
