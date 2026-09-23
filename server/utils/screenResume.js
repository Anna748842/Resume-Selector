const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "have",
  "has",
  "will",
  "your",
  "our",
  "are",
  "you",
  "job",
  "role",
  "work",
  "years",
  "year",
  "about",
  "into",
  "using",
  "used",
  "their",
  "they",
  "them",
  "who",
  "what",
  "where",
  "when",
  "how",
  "must",
  "should",
  "can",
  "all",
  "any",
  "not",
  "but",
  "also"
]);

const COMMON_SKILLS = [
  "javascript",
  "typescript",
  "react",
  "angular",
  "vue",
  "node.js",
  "nodejs",
  "express",
  "express.js",
  "mongodb",
  "mysql",
  "postgresql",
  "sql",
  "python",
  "java",
  "c++",
  "c#",
  ".net",
  "php",
  "ruby",
  "go",
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "git",
  "github",
  "rest api",
  "graphql",
  "html",
  "css",
  "tailwind",
  "figma",
  "jest",
  "cypress",
  "selenium",
  "machine learning",
  "data analysis",
  "communication",
  "leadership",
  "project management"
];

function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/[^\w\s.+#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSkill(skill = "") {
  return normalizeText(skill)
    .replace(/node\.js/g, "nodejs")
    .replace(/express\.js/g, "express")
    .trim();
}

function extractKeywords(text = "") {
  const words = normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 2)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word) => !/^\d+$/.test(word));

  const counts = {};

  for (const word of words) {
    counts[word] = (counts[word] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function extractSkills(text = "") {
  const normalizedText = normalizeText(text);

  const matchedSkills = COMMON_SKILLS.filter((skill) => {
    return normalizedText.includes(normalizeSkill(skill));
  });

  if (matchedSkills.length > 0) {
    return [...new Set(matchedSkills)];
  }

  return extractKeywords(text).slice(0, 12);
}

function hasSkill(resumeText, skill) {
  return normalizeText(resumeText).includes(normalizeSkill(skill));
}

function screenResume(resumeText, requiredSkills, jobDescription) {
  const skills =
    requiredSkills && requiredSkills.length > 0
      ? requiredSkills
      : extractSkills(jobDescription);

  const normalizedSkills = [...new Set(skills.map(normalizeSkill))];

  const matchedSkills = normalizedSkills.filter((skill) =>
    hasSkill(resumeText, skill)
  );

  const missingSkills = normalizedSkills.filter(
    (skill) => !matchedSkills.includes(skill)
  );

  const score =
    normalizedSkills.length === 0
      ? 0
      : Math.round((matchedSkills.length / normalizedSkills.length) * 100);

  return {
    score,
    matchedSkills,
    missingSkills,
    detectedSkills: extractSkills(resumeText)
  };
}

module.exports = {
  extractSkills,
  screenResume
};