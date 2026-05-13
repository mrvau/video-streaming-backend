import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  
  if(!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID!")

  const video = await Video.findById(videoId)

  if(video.owner.toString() !== req.user._id.toString()) throw new ApiError(403, "You are not allowed to toggle like for this video!")

  
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const videos = await Video.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: "true" },
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

  if(!videos) throw new ApiError(404, "Liked videos not found!")

    console.log(videos)

  return res.status(200).json(new ApiResponse(200, videos, "Fetched liked videos successfully"))
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
