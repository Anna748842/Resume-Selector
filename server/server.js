const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env")
});

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const pdfModule = require("pdf-parse");

const Job = require("./models/job");
const Candidate = require("./models/Candidate");
const { extractSkills, screenResume } = require("./utils/screenResume");

const pdfParse = pdfModule.default || pdfModule;

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL
  })
);

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF resumes are supported."));
    }

    cb(null, true);
  }
});

function parseSkills(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Resume screening API is running"
  });
});

app.get("/api/jobs", async (req, res, next) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/jobs", async (req, res, next) => {
  try {
    const { title, description, requiredSkills } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Job title and description are required."
      });
    }

    const manualSkills = parseSkills(requiredSkills);
    const detectedSkills =
      manualSkills.length > 0
        ? manualSkills
        : extractSkills(description);

    const job = await Job.create({
      title,
      description,
      requiredSkills: detectedSkills
    });

    res.status(201).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs/:jobId/candidates", async (req, res, next) => {
  try {
    const candidates = await Candidate.find({
      job: req.params.jobId
    }).sort({
      score: -1,
      createdAt: -1
    });

    res.json({
      success: true,
      candidates
    });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/jobs/:jobId/candidates",
  upload.single("resume"),
  async (req, res, next) => {
    try {
      const { name, email, phone } = req.body;

      if (!name || !email || !req.file) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and a PDF resume are required."
        });
      }

      const job = await Job.findById(req.params.jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found."
        });
      }

      const parsedPdf = await pdfParse(req.file.buffer);
      const resumeText = parsedPdf.text || "";

      const screening = screenResume(
        resumeText,
        job.requiredSkills,
        job.description
      );

      const candidate = await Candidate.create({
        job: job._id,
        name,
        email,
        phone,
        resumeFileName: req.file.originalname,
        resumeText,
        score: screening.score,
        matchedSkills: screening.matchedSkills,
        missingSkills: screening.missingSkills
      });

      res.status(201).json({
        success: true,
        candidate
      });
    } catch (error) {
      next(error);
    }
  }
);

app.patch("/api/candidates/:candidateId/status", async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "New",
      "Shortlisted",
      "Interview",
      "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid candidate status."
      });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.candidateId,
      { status },
      { new: true }
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found."
      });
    }

    res.json({
      success: true,
      candidate
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/candidates/:candidateId", async (req, res, next) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(
      req.params.candidateId
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found."
      });
    }

    res.json({
      success: true,
      message: "Candidate deleted."
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error."
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();