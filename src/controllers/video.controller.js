import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const match = { isPublished: true };

  if (query) match.$text = { $search: query };
  if (userId) match.owner = new mongoose.Types.ObjectId(userId);

  const pipeline = [
    {
      $match: match,
    },
    "__PREPAGINATE__",
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "publisher",
        pipeline: [
          {
            $project: {
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        publisher: {
          $first: "$publisher",
        },
      },
    },
    {
      $project: {
        title: 1,
        duration: 1,
        views: 1,
        thumbnail: 1,
        createdAt: 1,
        "publisher._id": 1,
        "publisher.fullName": 1,
        "publisher.avatar": 1,
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ];

  const options = {
    page: Number(page),
    limit: Number(limit),
    customLabels: {
      docs: "videos",
      totalDocs: "totalVideos",
      totalPages: "pages",
      meta: "pagination",
    },
    allowDiskUse: true,
  };

  const result = await Video.aggregatePaginate(pipeline, options);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "All videos fetched successfully!"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
