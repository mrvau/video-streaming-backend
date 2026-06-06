import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const match = { isPublished: true };

  if (query) match.$text = { $search: query };
  if (userId) {
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid user id!")
    match.owner = new mongoose.Types.ObjectId(userId);
  }

  const ALLOWED_SORT_FIELDS = ["createdAt", "views", "title", "duration"]
  const ALLOWED_SORT_TYPES = ["asc", "desc"]

  const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt"
  const safeSortType = ALLOWED_SORT_TYPES.includes(sortType) ? sortType : "asc"

  const pipeline = [
    {
      $match: match,
    },
    {
      $sort: {
        [safeSortBy]: safeSortType === "asc" ? 1 : -1,
      },
    },
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

  const aggregate = Video.aggregate(pipeline);

  const result = await Video.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "All videos fetched successfully."));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description)
    throw new ApiError(400, "Title and Description is required!");

  let videoFileLocalPath;
  let thumbnailFileLocalPath;

  if (req.files) {
    const { videoFile, thumbnailFile } = req.files;

    if (Array.isArray(videoFile) && videoFile.length > 0) {
      videoFileLocalPath = videoFile[0].path;
    }

    if (Array.isArray(thumbnailFile) && thumbnailFile.length > 0) {
      thumbnailFileLocalPath = thumbnailFile[0].path;
    }
  }

  if (!thumbnailFileLocalPath)
    throw new ApiError(400, "Thumbnail file is required!");

  if (!videoFileLocalPath) throw new ApiError(400, "Video file is required!");

  const video = await uploadOnCloudinary(videoFileLocalPath);

  if (!video)
    throw new ApiError(500, "Error while uploading the video on cloud");

  const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath);

  if (!thumbnail) {
    await deleteFromCloudinary(video.public_id);

    throw new ApiError(500, "Error while uploading the thumbnail on cloud!");
  }

  const newVideo = await Video.create({
    title,
    description,
    duration: video.duration.toFixed(2),
    videoFile: video.url,
    thumbnail: thumbnail.url,
    isPublished: true,
    owner: new mongoose.Types.ObjectId(req.user._id),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newVideo, "Video was published successfully."));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID!");

  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "Video not found!");

  if(!video.isPublished && video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "This video is not published!")
  }

  const result = await User.updateOne(
    { _id: req.user._id, watchHistory: { $ne: video._id } },
    { $push: { watchHistory: video._id } }
  );

  const updatedVideo =
    result.modifiedCount > 0
      ? await Video.findByIdAndUpdate(
          videoId,
          { $inc: { views: 1 } },
          { returnDocument: "after" }
        )
      : video;

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Successfully found the video."));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID!");

  const video = await Video.findById(videoId)

  if(!video) throw new ApiError(404, "Video not found!")

  if(video.owner.toString() !== req.user._id.toString()) throw new ApiError(403, "You are not allowed to update this video")

  const fieldsToUpdate = {};

  const { title, description } = req.body;

  const thumbnailLocalPath = req.file?.path;

  if (title?.trim()) fieldsToUpdate.title = title;

  if (description?.trim()) fieldsToUpdate.description = description;

  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail)
      throw new ApiError(500, "Error while uploading on the cloud!");

    await deleteFromCloudinary(video.thumbnail)

    fieldsToUpdate.thumbnail = thumbnail.url
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: fieldsToUpdate,
    },
    { returnDocument: "after" }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully."));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID!");

  const deletedVideo = await Video.findOneAndDelete({
    _id: videoId,
    owner: req.user._id,
  });

  if (!deletedVideo) throw new ApiError(404, "Video not found or you are not the owner!");

  const commentIds = await Comment.find({video: videoId}).distinct('_id');

  await Promise.all([
    deleteFromCloudinary(deletedVideo.videoFile),
    deleteFromCloudinary(deletedVideo.thumbnail),
    Comment.deleteMany({video: videoId}),
    Like.deleteMany({ $or: [{video: videoId}, {comment: {$in: commentIds}}] }),
    Playlist.updateMany({videos: videoId}, {$pull: {videos: videoId}})
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully."));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID!");

  const video = await Video.findById(videoId);

  if(!video) throw new ApiError(404, "This video is not found!")

  if(video.owner.toString() !== req.user._id.toString()) throw new ApiError(403, "You are not allowed to update video information!")

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    [
      {
        $set: {
          isPublished: {
            $cond: [{ $eq: ["$isPublished", true] }, false, true],
          },
        },
      },
    ],
    { returnDocument: "after", updatePipeline: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video publish status updated successfully.")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
