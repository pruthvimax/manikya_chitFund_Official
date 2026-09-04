import mongoose from "mongoose";

const getMongoUri = () => {
  return process.env.MONGO_URI || process.env.MONGODB_URI || process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/manikya";
};

const connectDB = async (retries = 3) => {
  const uri = getMongoUri();

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: "majority",
    });
    console.log("MongoDB Connected Successfully!");
    return true;
  } catch (err) {
    if (retries > 0) {
      console.warn(`MongoDB connection attempt failed. Retrying (${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return connectDB(retries - 1);
    }

    console.error("MongoDB Error:", err);
    console.warn("MongoDB is unavailable. The server will continue to start, but database-backed features will not work until a reachable MongoDB instance is available.");
    return false;
  }
};

export default connectDB;
