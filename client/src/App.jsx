import { useEffect, useMemo, useRef, useState, useCallback } from "react";

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

/* ── Animated counter hook ── */
function useAnimatedValue(target, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = value;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/* ── Intersection-observer reveal hook ── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, visible];
}

/* ── Score Ring SVG ── */
function ScoreRing({ score, size = 76, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "var(--green)" : score >= 45 ? "var(--yellow)" : "var(--danger)";

  return (
    <svg width={size} height={size} className="score-ring-svg" role="img" aria-label={`Match score: ${score}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)", transform: "rotate(-90deg)", transformOrigin: "center" }}
      />
      <text x="50%" y="46%" dominantBaseline="central" textAnchor="middle" className="score-ring-value" fill="var(--ink)">
        {score}%
      </text>
      <text x="50%" y="64%" dominantBaseline="central" textAnchor="middle" className="score-ring-label" fill="var(--muted)">
        match
      </text>
    </svg>
  );
}

/* ── Skeleton loader ── */
function Skeleton({ width = "100%", height = 16, radius = 8, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

function SkeletonCard() {
  return (
    <div className="candidate-card skeleton-card" aria-hidden="true">
      <div className="candidate-main">
        <Skeleton width={40} height={40} radius={12} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton width={76} height={76} radius="50%" />
    </div>
  );
}

/* ── Alert component with auto-dismiss ── */
function AlertBanner({ message, error, onDismiss }) {
  useEffect(() => {
    if (!message && !error) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [message, error, onDismiss]);

  if (!message && !error) return null;

  return (
    <div className={`alert ${error ? "error" : "success"} alert-enter`} role="alert">
      <div className="alert-content">
        <span className="alert-icon">{error ? "⚠" : "✓"}</span>
        <span>{error || message}</span>
      </div>
      <button className="alert-dismiss" onClick={onDismiss} aria-label="Dismiss">&times;</button>
    </div>
  );
}

/* ── Mobile menu button ── */
function MobileMenuButton({ open, onClick }) {
  return (
    <button
      className={`mobile-menu-btn ${open ? "open" : ""}`}
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
    >
      <span /><span /><span />
    </button>
  );
}

/* ════════════ MAIN APP ════════════ */
function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [jobForm, setJobForm] = useState(initialJobForm);
  const [candidateForm, setCandidateForm] = useState(initialCandidateForm);

  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const clearAlerts = useCallback(() => { setMessage(""); setError(""); }, []);

  /* ── Data loading ── */
  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const response = await fetch("/api/jobs");
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setJobs(data.jobs);
      if (!selectedJob && data.jobs.length > 0) setSelectedJob(data.jobs[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadCandidates(jobId) {
    setLoadingCandidates(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/candidates`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setCandidates(data.candidates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCandidates(false);
    }
  }

  useEffect(() => { loadJobs(); }, []);

  useEffect(() => {
    if (selectedJob?._id) loadCandidates(selectedJob._id);
  }, [selectedJob?._id]);

  /* ── Form handlers ── */
  function updateJobForm(event) {
    const { name, value } = event.target;
    setJobForm((c) => ({ ...c, [name]: value }));
  }

  function updateCandidateForm(event) {
    const { name, value, files } = event.target;
    setCandidateForm((c) => ({ ...c, [name]: files ? files[0] : value }));
  }

  async function createJob(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsCreatingJob(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobForm)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
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
    if (!selectedJob) { setError("Select or create a job first."); return; }
    setError("");
    setMessage("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("name", candidateForm.name);
      formData.append("email", candidateForm.email);
      formData.append("phone", candidateForm.phone);
      formData.append("resume", candidateForm.resume);

      const response = await fetch(`/api/jobs/${selectedJob._id}/candidates`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setCandidates((current) => [data.candidate, ...current].sort((a, b) => b.score - a.score));
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
      const response = await fetch(`/api/candidates/${candidateId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setCandidates((current) =>
        current.map((c) => (c._id === candidateId ? data.candidate : c))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCandidate(candidateId) {
    if (!window.confirm("Delete this candidate from the shortlist?")) return;
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, { method: "DELETE" });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setCandidates((current) => current.filter((c) => c._id !== candidateId));
    } catch (err) {
      setError(err.message);
    }
  }

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const shortlisted = candidates.filter(
      (c) => c.status === "Shortlisted" || c.status === "Interview"
    ).length;
    const averageScore =
      candidates.length === 0
        ? 0
        : Math.round(candidates.reduce((t, c) => t + c.score, 0) / candidates.length);
    return { total: candidates.length, shortlisted, averageScore };
  }, [candidates]);

  const animTotal = useAnimatedValue(stats.total);
  const animShort = useAnimatedValue(stats.shortlisted);
  const animAvg = useAnimatedValue(stats.averageScore);

  /* ── Reveal refs ── */
  const [heroRef, heroVisible] = useReveal();
  const [uploadRef, uploadVisible] = useReveal();
  const [listRef, listVisible] = useReveal();

  return (
    <main className="app-shell">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div>
            <strong>ShortlistAI</strong>
            <span>Resume screening workspace</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-badge">
            <span className="live-dot" aria-hidden="true" />
            Screening dashboard
          </div>
          <MobileMenuButton open={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        </div>
      </header>

      {/* ── Hero ── */}
      <section className={`hero ${heroVisible ? "reveal" : ""}`} ref={heroRef}>
        <div className="hero-text">
          <p className="eyebrow">Recruiting operations</p>
          <h1>Find the strongest candidates before the first&nbsp;interview.</h1>
          <p className="hero-copy">
            Create a role, upload PDF resumes, and get transparent
            skill&#8209;match scores in&nbsp;seconds.
          </p>
        </div>

        <div className="hero-card glass">
          <span className="hero-card-label">Active role</span>
          <strong>{selectedJob?.title || "No job selected"}</strong>
          <span className="hero-card-skills">
            {selectedJob?.requiredSkills?.length || 0} tracked skills
          </span>
        </div>
      </section>

      {/* ── Alert ── */}
      <AlertBanner message={message} error={error} onDismiss={clearAlerts} />

      {/* ── Workspace ── */}
      <section className="workspace">
        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
        )}

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`} aria-label="Job roles">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Open roles</h2>
            </div>
            <span className="count-pill" aria-label={`${jobs.length} jobs`}>{jobs.length}</span>
          </div>

          <div className="job-list" role="listbox" aria-label="Job roles list">
            {loadingJobs ? (
              <>
                <Skeleton height={56} radius={10} />
                <Skeleton height={56} radius={10} />
                <Skeleton height={56} radius={10} />
              </>
            ) : (
              <>
                {jobs.map((job) => (
                  <button
                    className={selectedJob?._id === job._id ? "job-card active" : "job-card"}
                    key={job._id}
                    onClick={() => { setSelectedJob(job); setMobileMenuOpen(false); }}
                    role="option"
                    aria-selected={selectedJob?._id === job._id}
                  >
                    <span className="job-card-title">{job.title}</span>
                    <span className="job-card-meta">{job.requiredSkills.length} skills tracked</span>
                  </button>
                ))}
                {jobs.length === 0 && (
                  <div className="empty-state">
                    <span className="empty-state-icon" aria-hidden="true">📋</span>
                    Create your first role to begin screening.
                  </div>
                )}
              </>
            )}
          </div>

          <form className="panel compact-form" onSubmit={createJob} aria-label="Create a new role">
            <div className="form-heading">
              <span className="form-icon" aria-hidden="true">+</span>
              <div>
                <h3>Create a role</h3>
                <p>Define what a strong candidate looks like.</p>
              </div>
            </div>

            <label>
              <span className="label-text">Job title</span>
              <input
                name="title"
                value={jobForm.title}
                onChange={updateJobForm}
                placeholder="Frontend Engineer"
                required
                autoComplete="off"
              />
            </label>

            <label>
              <span className="label-text">Job description</span>
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
              <span className="label-text">Required skills</span>
              <input
                name="requiredSkills"
                value={jobForm.requiredSkills}
                onChange={updateJobForm}
                placeholder="React, JavaScript, CSS, Git"
                autoComplete="off"
              />
            </label>

            <button className="primary-button" type="submit" disabled={isCreatingJob}>
              {isCreatingJob ? (
                <><span className="btn-spinner" aria-hidden="true" /> Creating...</>
              ) : (
                "Create role"
              )}
            </button>
          </form>
        </aside>

        {/* ── Content ── */}
        <section className="content" aria-label="Candidate pipeline">
          <div className="content-header">
            <div>
              <p className="eyebrow">Candidate pipeline</p>
              <h2>{selectedJob?.title || "Select a job"}</h2>
              {selectedJob && (
                <div className="skill-row" aria-label="Required skills">
                  {selectedJob.requiredSkills.map((skill) => (
                    <span className="skill-chip" key={skill}>{skill}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="stats" aria-label="Pipeline statistics">
              <div className="stat">
                <span>Total candidates</span>
                <strong>{animTotal}</strong>
              </div>
              <div className="stat">
                <span>Shortlisted</span>
                <strong>{animShort}</strong>
              </div>
              <div className="stat">
                <span>Average match</span>
                <strong>{animAvg}%</strong>
              </div>
            </div>
          </div>

          {/* ── Upload panel ── */}
          <form
            className={`upload-panel glass-dark ${uploadVisible ? "reveal" : ""}`}
            onSubmit={uploadCandidate}
            ref={uploadRef}
            aria-label="Upload candidate resume"
          >
            <div className="upload-intro">
              <div className="upload-symbol" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 14V3M10 3L6 7M10 3l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3>Add candidate resume</h3>
                <p>Upload a PDF and the screening engine will compare it with this role.</p>
              </div>
            </div>

            <div className="upload-fields">
              <input
                name="name"
                value={candidateForm.name}
                onChange={updateCandidateForm}
                placeholder="Candidate name"
                required
                autoComplete="off"
                aria-label="Candidate name"
              />
              <input
                type="email"
                name="email"
                value={candidateForm.email}
                onChange={updateCandidateForm}
                placeholder="Email address"
                required
                autoComplete="off"
                aria-label="Email address"
              />
              <input
                name="phone"
                value={candidateForm.phone}
                onChange={updateCandidateForm}
                placeholder="Phone number"
                autoComplete="off"
                aria-label="Phone number"
              />
              <label className="file-input">
                <span className="file-input-text">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M11 5L8 2M8 2L5 5M8 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {candidateForm.resume ? candidateForm.resume.name : "Choose PDF resume"}
                </span>
                <input
                  type="file"
                  name="resume"
                  accept="application/pdf"
                  onChange={updateCandidateForm}
                  required
                  aria-label="Upload PDF resume"
                />
              </label>
              <button className="primary-button upload-submit" type="submit" disabled={isUploading || !selectedJob}>
                {isUploading ? (
                  <><span className="btn-spinner" aria-hidden="true" /> Screening...</>
                ) : (
                  "Screen resume"
                )}
              </button>
            </div>
          </form>

          {/* ── Candidate list ── */}
          <div className={`candidate-section ${listVisible ? "reveal" : ""}`} ref={listRef}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ranked results</p>
                <h2>Candidate shortlist</h2>
              </div>
              <span className="result-label">Sorted by match score</span>
            </div>

            <div className="candidate-list" role="list" aria-label="Candidates ranked by score">
              {loadingCandidates ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  {candidates.map((candidate, idx) => (
                    <article
                      className="candidate-card"
                      key={candidate._id}
                      role="listitem"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <div className="candidate-main">
                        <div className="avatar" aria-hidden="true">
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
                          <span className="resume-name" title={candidate.resumeFileName}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ marginRight: 4, verticalAlign: -1 }}>
                              <path d="M7 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V4L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {candidate.resumeFileName}
                          </span>
                        </div>
                      </div>

                      <div className="match-score">
                        <ScoreRing score={candidate.score} />
                      </div>

                      <div className="candidate-skills">
                        <div>
                          <span className="skill-label">Matched</span>
                          <div className="skill-row">
                            {candidate.matchedSkills.length > 0 ? (
                              candidate.matchedSkills.map((skill) => (
                                <span className="skill-chip matched" key={skill}>{skill}</span>
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
                                <span className="skill-chip missing" key={skill}>{skill}</span>
                              ))
                            ) : (
                              <span className="muted">No missing skills</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="candidate-actions">
                        <div className="select-wrapper">
                          <select
                            value={candidate.status}
                            onChange={(e) => updateStatus(candidate._id, e.target.value)}
                            aria-label={`Status for ${candidate.name}`}
                          >
                            <option>New</option>
                            <option>Shortlisted</option>
                            <option>Interview</option>
                            <option>Rejected</option>
                          </select>
                          <svg className="select-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>

                        <button
                          className="delete-button"
                          onClick={() => deleteCandidate(candidate._id)}
                          aria-label={`Delete ${candidate.name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}

                  {candidates.length === 0 && !loadingCandidates && (
                    <div className="large-empty-state">
                      <div className="empty-illustration" aria-hidden="true">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                          <rect x="6" y="4" width="20" height="24" rx="3" stroke="currentColor" strokeWidth="2"/>
                          <path d="M11 12h10M11 16h7M11 20h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <h3>No candidates yet</h3>
                      <p>Upload a resume above to see ranked screening results here.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </section>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>ShortlistAI</span>
        <span className="footer-dot" aria-hidden="true">·</span>
        <span>Resume screening workspace</span>
      </footer>
    </main>
  );
}

export default App;