const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    resumeFileName: {
      type: String,
      required: true
    },
    resumeText: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      default: 0
    },
    matchedSkills: {
      type: [String],
      default: []
    },
    missingSkills: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["New", "Shortlisted", "Interview", "Rejected"],
      default: "New"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Candidate", candidateSchema);