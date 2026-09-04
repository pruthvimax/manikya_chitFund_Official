import ChitScheme from "../models/ChitScheme.js";

// ADD SCHEME
export const addScheme = async (req, res) => {
  try {
    const {
      chitId,
      chitAmount,
      durationMonths,
      dailyAmount,
      weeklyAmount,
      monthlyAmount,
    } = req.body;

    if (
      !chitId ||
      !chitAmount ||
      !durationMonths ||
      !dailyAmount ||
      !weeklyAmount ||
      !monthlyAmount
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await ChitScheme.findOne({ chitId });
    if (exists) {
      return res.status(400).json({ message: "Chit ID already exists" });
    }

    const scheme = new ChitScheme({
      chitId,
      chitAmount,
      durationMonths,
      dailyAmount,
      weeklyAmount,
      monthlyAmount,
    });

    await scheme.save();
    res.status(201).json({ message: "Chit Scheme Added", scheme });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

// GET ALL SCHEMES
export const getSchemes = async (req, res) => {
  try {
    const schemes = await ChitScheme.find();
    res.json(schemes);
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE SCHEME ✅
export const deleteScheme = async (req, res) => {
  try {
    await ChitScheme.findByIdAndDelete(req.params.id);
    res.json({ message: "Scheme Deleted" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};
