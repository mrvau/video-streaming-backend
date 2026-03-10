import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { configureCloudinary } from "./utils/cloudinary.js";

dotenv.config({ path: "./.env" });

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.error(`ERROR: ${error}`);
      process.exit(1);
    });

    configureCloudinary();

    const PORT = process.env.PORT || 8000;

    app.listen(PORT, () => {
      console.log(`Server is running on port : ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection FAILED !!!");
  });

/*
import express from "express";

const app = express();

;(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("ERROR: ", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("ERROR: ", error);
    throw error;
  }
})();

*/
