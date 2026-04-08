import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import "dotenv/config"

// ── Import all models ────────────────────────────────────────────────
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Subscription } from "../models/subscription.model.js";
import { DB_NAME } from "../constants.js";

const MONGO_URI = process.env.MONGODB_URI; // 👈 change this

// ── Config ───────────────────────────────────────────────────────────
const COUNT = {
  users: 10,
  videosPerUser: 3,
  tweetsPerUser: 4,
  commentsPerVideo: 5,
  playlistsPerUser: 2,
};

// ── Helpers ──────────────────────────────────────────────────────────

// picks n random items from an array
const pickRandom = (arr, n = 1) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return n === 1 ? shuffled[0] : shuffled.slice(0, n);
};

// picks a random id from an array of documents
const randomId = (docs) => pickRandom(docs)._id;

// ── Seeders ──────────────────────────────────────────────────────────

const seedUsers = async () => {
  console.log("  Seeding users...");

  // ⚠️ insertMany skips Mongoose pre-save hooks
  // So we hash passwords manually here
  const hashedPassword = await bcrypt.hash("Password@123", 10);

  const users = Array.from({ length: COUNT.users }, () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      username: faker.internet
        .username({ firstName, lastName })
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"), // ensure valid username
      fullName: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: hashedPassword,
      avatar: faker.image.avatar(),
      coverImage: faker.image.url({ width: 1280, height: 360 }),
    };
  });

  const inserted = await User.insertMany(users);
  console.log(`  ✓ ${inserted.length} users inserted`);
  return inserted;
};

const seedVideos = async (users) => {
  console.log("  Seeding videos...");

  const videos = users.flatMap((user) =>
    Array.from({ length: COUNT.videosPerUser }, () => ({
      title: faker.lorem.sentence({ min: 4, max: 8 }),
      description: faker.lorem.paragraph(),
      duration: faker.number.float({ min: 60, max: 3600, fractionDigits: 2 }),
      views: faker.number.int({ min: 0, max: 100000 }),
      videoFile: `https://sample-videos.com/video/${faker.string.uuid()}.mp4`,
      thumbnail: faker.image.url({ width: 1280, height: 720 }),
      isPublished: faker.datatype.boolean({ probability: 0.8 }), // 80% published
      owner: user._id,
    }))
  );

  const inserted = await Video.insertMany(videos);
  console.log(`  ✓ ${inserted.length} videos inserted`);
  return inserted;
};

const seedTweets = async (users) => {
  console.log("  Seeding tweets...");

  const tweets = users.flatMap((user) =>
    Array.from({ length: COUNT.tweetsPerUser }, () => ({
      owner: user._id,
      content: faker.lorem.sentence({ min: 5, max: 20 }),
    }))
  );

  const inserted = await Tweet.insertMany(tweets);
  console.log(`  ✓ ${inserted.length} tweets inserted`);
  return inserted;
};

const seedComments = async (users, videos) => {
  console.log("  Seeding comments...");

  const comments = videos.flatMap((video) =>
    Array.from({ length: COUNT.commentsPerVideo }, () => ({
      content: faker.lorem.sentences({ min: 1, max: 3 }),
      video: video._id,
      owner: randomId(users),
    }))
  );

  const inserted = await Comment.insertMany(comments);
  console.log(`  ✓ ${inserted.length} comments inserted`);
  return inserted;
};

const seedLikes = async (users, videos, comments, tweets) => {
  console.log("  Seeding likes...");

  const videoLikes = videos.map((video) => ({
    likedBy: randomId(users),
    video: video._id,
  }));

  const commentLikes = comments.map((comment) => ({
    likedBy: randomId(users),
    comment: comment._id,
  }));

  const tweetLikes = tweets.map((tweet) => ({
    likedBy: randomId(users),
    tweet: tweet._id,
  }));

  const allLikes = [...videoLikes, ...commentLikes, ...tweetLikes];
  const inserted = await Like.insertMany(allLikes);
  console.log(`  ✓ ${inserted.length} likes inserted`);
  return inserted;
};

const seedPlaylists = async (users, videos) => {
  console.log("  Seeding playlists...");

  const playlists = users.flatMap((user) =>
    Array.from({ length: COUNT.playlistsPerUser }, () => {
      // pick 2-5 random video ids for each playlist
      const pickedVideos = pickRandom(
        videos,
        faker.number.int({ min: 2, max: 5 })
      );

      return {
        name: faker.lorem.words({ min: 2, max: 4 }),
        description: faker.lorem.sentence(),
        videos: pickedVideos.map((v) => v._id),
        owner: user._id,
      };
    })
  );

  const inserted = await Playlist.insertMany(playlists);
  console.log(`  ✓ ${inserted.length} playlists inserted`);
  return inserted;
};

const seedSubscriptions = async (users) => {
  console.log("  Seeding subscriptions...");

  const subscriptions = [];

  // Each user subscribes to 3 other random users (not themselves)
  for (const user of users) {
    const others = users.filter((u) => !u._id.equals(user._id));
    const channels = pickRandom(others, 3);

    for (const channel of channels) {
      subscriptions.push({
        subscriber: user._id,
        channel: channel._id,
      });
    }
  }

  const inserted = await Subscription.insertMany(subscriptions);
  console.log(`  ✓ ${inserted.length} subscriptions inserted`);
  return inserted;
};

// ── Clear all collections ─────────────────────────────────────────────
const clearDatabase = async () => {
  console.log("  Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Video.deleteMany({}),
    Tweet.deleteMany({}),
    Comment.deleteMany({}),
    Like.deleteMany({}),
    Playlist.deleteMany({}),
    Subscription.deleteMany({}),
  ]);
  console.log("  ✓ All collections cleared");
};

// ── Main ──────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    console.log(MONGO_URI)
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`);
    console.log("✓ Connected to MongoDB\n");

    await clearDatabase();
    console.log();

    console.log("Seeding collections...");
    // Order matters — seed parents before dependents
    const users = await seedUsers();
    const videos = await seedVideos(users);
    const tweets = await seedTweets(users);
    const comments = await seedComments(users, videos);
    await seedLikes(users, videos, comments, tweets);
    await seedPlaylists(users, videos);
    await seedSubscriptions(users);

    console.log("\n✅ Database seeded successfully!");
    console.log("\n── Login with any seeded user ───────────────────────");
    console.log(`   Email   : ${users[0].email}`);
    console.log(`   Password: Password@123`);
  } catch (err) {
    console.error("\n❌ Seeding failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
  }
};

seed();
