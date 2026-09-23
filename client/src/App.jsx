import { useEffect, useMemo, useState } from "react";

const initialJobForm = {
  title: "",
  description: "",
  requiredSkills: ""
};

const initialCandidateForm = {
  name: "",
  email: "",
  phone: "",
  resume: null
};

function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);

  const [jobForm, setJobForm] = useState(initialJobForm);
  const [candidateForm, setCandidateForm] = useState(
    initialCandidateForm
  );

  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadJobs() {
    try {
      const response = await fetch("/api/jobs");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setJobs(data.jobs);

      if (!selectedJob && data.jobs.length > 0) {
        setSelectedJob(data.jobs[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadCandidates(jobId) {
    try {
      const response = await fetch(`/api/jobs/${jobId}/candidates`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setCandidates(data.candidates);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (selectedJob?._id) {
      loadCandidates(selectedJob._id);
    }
  }, [selectedJob?._id]);

  function updateJobForm(event) {
    const { name, value } = event.target;

    setJobForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updateCandidateForm(event) {
    const { name, value, files } = event.target;

    setCandidateForm((current) => ({
      ...current,
      [name]: files ? files[0] : value
    }));
  }

  async function createJob(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsCreatingJob(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(jobForm)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setJobs((current) => [data.job, ...current]);
      setSelectedJob(data.job);
      setJobForm(initialJobForm);
      setMessage("Job created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreatingJob(false);
    }
  }

  async function uploadCandidate(event) {
    event.preventDefault();

    if (!selectedJob) {
      setError("Select or create a job first.");
      return;
    }

    setError("");
    setMessage("");
    setIsUploading(true);

    try {
      const formData = new FormData();

      formData.append("name", candidateForm.name);
      formData.append("email", candidateForm.email);
      formData.append("phone", candidateForm.phone);
      formData.append("resume", candidateForm.resume);

      const response = await fetch(
        `/api/jobs/${selectedJob._id}/candidates`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setCandidates((current) =>
        [data.candidate, ...current].sort(
          (a, b) => b.score - a.score
        )
      );

      setCandidateForm(initialCandidateForm);
      event.target.reset();

      setMessage("Resume screened and candidate added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function updateStatus(candidateId, status) {
    try {
      const response = await fetch(
        `/api/candidates/${candidateId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setCandidates((current) =>
        current.map((candidate) =>
          candidate._id === candidateId
            ? data.candidate
            : candidate
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCandidate(candidateId) {
    const shouldDelete = window.confirm(
      "Delete this candidate from the shortlist?"
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(
        `/api/candidates/${candidateId}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      setCandidates((current) =>
        current.filter((candidate) => candidate._id !== candidateId)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  const stats = useMemo(() => {
    const shortlisted = candidates.filter(
      (candidate) =>
        candidate.status === "Shortlisted" ||
        candidate.status === "Interview"
    ).length;

    const averageScore =
      candidates.length === 0
        ? 0
        : Math.round(
            candidates.reduce(
              (total, candidate) => total + candidate.score,
              0
            ) / candidates.length
          );

    return {
      total: candidates.length,
      shortlisted,
      averageScore
    };
  }, [candidates]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>ShortlistAI</strong>
            <span>Resume screening workspace</span>
          </div>
        </div>

        <div className="topbar-badge">
          <span className="live-dot"></span>
          Screening dashboard
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Recruiting operations</p>
          <h1>Find the strongest candidates before the first interview.</h1>
          <p className="hero-copy">
            Create a role, upload PDF resumes, and get transparent
            skill-match scores in seconds.
          </p>
        </div>

        <div className="hero-card">
          <span className="hero-card-label">Active role</span>
          <strong>
            {selectedJob?.title || "No job selected"}
          </strong>
          <span>
            {selectedJob?.requiredSkills?.length || 0} tracked skills
          </span>
        </div>
      </section>

      {(message || error) && (
        <div className={error ? "alert error" : "alert success"}>
          {error || message}
        </div>
      )}

      <section className="workspace">
        <aside className="sidebar">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Open roles</h2>
            </div>
            <span className="count-pill">{jobs.length}</span>
          </div>

          <div className="job-list">
            {jobs.map((job) => (
              <button
                className={
                  selectedJob?._id === job._id
                    ? "job-card active"
                    : "job-card"
                }
                key={job._id}
                onClick={() => setSelectedJob(job)}
              >
                <span className="job-card-title">{job.title}</span>
                <span className="job-card-meta">
                  {job.requiredSkills.length} skills tracked
                </span>
              </button>
            ))}

            {jobs.length === 0 && (
              <div className="empty-state">
                Create your first role to begin screening.
              </div>
            )}
          </div>

          <form className="panel compact-form" onSubmit={createJob}>
            <div className="form-heading">
              <span className="form-icon">+</span>
              <div>
                <h3>Create a role</h3>
                <p>Define what a strong candidate looks like.</p>
              </div>
            </div>

            <label>
              Job title
              <input
                name="title"
                value={jobForm.title}
                onChange={updateJobForm}
                placeholder="Frontend Engineer"
                required
              />
            </label>

            <label>
              Job description
              <textarea
                name="description"
                value={jobForm.description}
                onChange={updateJobForm}
                placeholder="Describe responsibilities, experience, and requirements..."
                rows="5"
                required
              />
            </label>

            <label>
              Required skills
              <input
                name="requiredSkills"
                value={jobForm.requiredSkills}
                onChange={updateJobForm}
                placeholder="React, JavaScript, CSS, Git"
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={isCreatingJob}
            >
              {isCreatingJob ? "Creating..." : "Create role"}
            </button>
          </form>
        </aside>

        <section className="content">
          <div className="content-header">
            <div>
              <p className="eyebrow">Candidate pipeline</p>
              <h2>{selectedJob?.title || "Select a job"}</h2>
              {selectedJob && (
                <div className="skill-row">
                  {selectedJob.requiredSkills.map((skill) => (
                    <span className="skill-chip" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="stats">
              <div className="stat">
                <span>Total candidates</span>
                <strong>{stats.total}</strong>
              </div>
              <div className="stat">
                <span>Shortlisted</span>
                <strong>{stats.shortlisted}</strong>
              </div>
              <div className="stat">
                <span>Average match</span>
                <strong>{stats.averageScore}%</strong>
              </div>
            </div>
          </div>

          <form className="upload-panel" onSubmit={uploadCandidate}>
            <div className="upload-intro">
              <div className="upload-symbol">↑</div>
              <div>
                <h3>Add candidate resume</h3>
                <p>
                  Upload a PDF and the screening engine will compare it
                  with this role.
                </p>
              </div>
            </div>

            <div className="upload-fields">
              <input
                name="name"
                value={candidateForm.name}
                onChange={updateCandidateForm}
                placeholder="Candidate name"
                required
              />

              <input
                type="email"
                name="email"
                value={candidateForm.email}
                onChange={updateCandidateForm}
                placeholder="Email address"
                required
              />

              <input
                name="phone"
                value={candidateForm.phone}
                onChange={updateCandidateForm}
                placeholder="Phone number"
              />

              <label className="file-input">
                <span>
                  {candidateForm.resume
                    ? candidateForm.resume.name
                    : "Choose PDF resume"}
                </span>
                <input
                  type="file"
                  name="resume"
                  accept="application/pdf"
                  onChange={updateCandidateForm}
                  required
                />
              </label>

              <button
                className="primary-button"
                type="submit"
                disabled={isUploading || !selectedJob}
              >
                {isUploading ? "Screening..." : "Screen resume"}
              </button>
            </div>
          </form>

          <div className="candidate-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ranked results</p>
                <h2>Candidate shortlist</h2>
              </div>

              <span className="result-label">
                Sorted by match score
              </span>
            </div>

            <div className="candidate-list">
              {candidates.map((candidate) => (
                <article className="candidate-card" key={candidate._id}>
                  <div className="candidate-main">
                    <div className="avatar">
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="candidate-info">
                      <div className="candidate-title-row">
                        <h3>{candidate.name}</h3>
                        <span className={`status ${candidate.status.toLowerCase()}`}>
                          {candidate.status}
                        </span>
                      </div>

                      <p>{candidate.email}</p>

                      {candidate.phone && <p>{candidate.phone}</p>}

                      <span className="resume-name">
                        {candidate.resumeFileName}
                      </span>
                    </div>
                  </div>

                  <div className="match-score">
                    <div
                      className={
                        candidate.score >= 75
                          ? "score-ring strong"
                          : candidate.score >= 45
                            ? "score-ring medium"
                            : "score-ring weak"
                      }
                    >
                      <strong>{candidate.score}%</strong>
                      <span>match</span>
                    </div>
                  </div>

                  <div className="candidate-skills">
                    <div>
                      <span className="skill-label">Matched</span>
                      <div className="skill-row">
                        {candidate.matchedSkills.length > 0 ? (
                          candidate.matchedSkills.map((skill) => (
                            <span
                              className="skill-chip matched"
                              key={skill}
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="muted">None detected</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="skill-label">Missing</span>
                      <div className="skill-row">
                        {candidate.missingSkills.length > 0 ? (
                          candidate.missingSkills.map((skill) => (
                            <span
                              className="skill-chip missing"
                              key={skill}
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="muted">No missing skills</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="candidate-actions">
                    <select
                      value={candidate.status}
                      onChange={(event) =>
                        updateStatus(
                          candidate._id,
                          event.target.value
                        )
                      }
                    >
                      <option>New</option>
                      <option>Shortlisted</option>
                      <option>Interview</option>
                      <option>Rejected</option>
                    </select>

                    <button
                      className="delete-button"
                      onClick={() => deleteCandidate(candidate._id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}

              {candidates.length === 0 && (
                <div className="large-empty-state">
                  <div className="empty-illustration">◎</div>
                  <h3>No candidates yet</h3>
                  <p>
                    Upload a resume above to see ranked screening
                    results here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;