const views = {
  dashboard: document.getElementById("dashboardView"),
  analyzer: document.getElementById("analyzerView"),
  practice: document.getElementById("practiceView"),
  progress: document.getElementById("progressView")
};
const pageNames = { dashboard: "Overview", analyzer: "Resume analyzer", practice: "Interview practice", progress: "My progress" };
const navItems = document.querySelectorAll(".nav-item");
const sidebar = document.getElementById("sidebar");
const toast = document.getElementById("toast");
let toastTimeout;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 3200);
}
function navigateTo(viewName) {
  if (!views[viewName]) return;
  Object.entries(views).forEach(([name, view]) => view.classList.toggle("active", name === viewName));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  document.getElementById("breadcrumbCurrent").textContent = pageNames[viewName];
  sidebar.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll("[data-view]").forEach((item) => item.addEventListener("click", () => navigateTo(item.dataset.view)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => navigateTo(button.dataset.go)));
document.getElementById("menuButton").addEventListener("click", () => sidebar.classList.toggle("open"));
document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date());

const nameScreen = document.getElementById("nameScreen");
const nameForm = document.getElementById("nameForm");
const userNameInput = document.getElementById("userNameInput");
function updateUserName(name) {
  const safeName = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!safeName) return false;
  document.getElementById("welcomeName").textContent = safeName;
  document.getElementById("profileName").textContent = safeName;
  const initials = safeName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  document.getElementById("profileInitials").textContent = initials;
  document.getElementById("topbarInitials").textContent = initials;
  try { localStorage.setItem("careerlyUserName", safeName); } catch (_error) { /* Keep the name for this page view if storage is unavailable. */ }
  nameScreen.hidden = true;
  return true;
}
let savedUserName = "";
let activeProfileId = "";
try {
  savedUserName = localStorage.getItem("careerlyUserName") || "";
  activeProfileId = localStorage.getItem("careerlyProfileId") || "";
  if (!activeProfileId) {
    activeProfileId = crypto.randomUUID();
    localStorage.setItem("careerlyProfileId", activeProfileId);
  }
} catch (_error) { /* The name can still be entered for this visit. */ }
if (!savedUserName || !updateUserName(savedUserName)) {
  nameScreen.hidden = false;
  requestAnimationFrame(() => userNameInput.focus());
}
async function loadRemoteProfile() {
  if (!activeProfileId) return;
  try {
    const response = await fetch(`/api/profile/${encodeURIComponent(activeProfileId)}`);
    if (!response.ok) return;
    const profile = await response.json();
    if (profile.name) updateUserName(profile.name);
  } catch (_error) { /* Local name remains available if MongoDB is not configured. */ }
}
async function saveRemoteProfile(name) {
  if (!activeProfileId) return;
  try {
    const healthResponse = await fetch("/api/health");
    const health = healthResponse.ok ? await healthResponse.json() : null;
    if (!health?.databaseConnected) return;
    const response = await fetch(`/api/profile/${encodeURIComponent(activeProfileId)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "Could not save the profile to MongoDB.");
    }
    showToast("Name saved to your MongoDB profile.");
  } catch (error) { showToast(error.message); }
}
loadRemoteProfile();
nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = userNameInput.value;
  if (!updateUserName(name)) userNameInput.focus();
  else saveRemoteProfile(name.trim().replace(/\s+/g, " ").slice(0, 60));
});
document.getElementById("profileButton").addEventListener("click", () => {
  userNameInput.value = document.getElementById("profileName").textContent;
  nameScreen.hidden = false;
  userNameInput.focus();
});

const resumeFile = document.getElementById("resumeFile");
const uploadBox = document.getElementById("uploadBox");
const uploadTitle = document.getElementById("uploadTitle");
const uploadSub = document.getElementById("uploadSub");
let selectedResume = null;
let activeRole = "Frontend Developer";
let questions = [];
let questionIndex = 0;
let answeredCount = 0;
let feedbackShown = false;
const answerInput = document.getElementById("answerInput");
const wordCount = document.getElementById("wordCount");

function setResume(file) {
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["pdf", "docx"].includes(ext)) return showToast("Please choose a PDF or DOCX resume.");
  if (file.size > 5 * 1024 * 1024) return showToast("That file is over 5 MB. Please choose a smaller one.");
  selectedResume = file;
  uploadTitle.textContent = file.name;
  uploadSub.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze`;
  uploadBox.classList.add("has-file");
}
resumeFile.addEventListener("change", (event) => setResume(event.target.files[0]));
["dragenter", "dragover"].forEach((name) => uploadBox.addEventListener(name, (event) => { event.preventDefault(); uploadBox.classList.add("dragover"); }));
["dragleave", "drop"].forEach((name) => uploadBox.addEventListener(name, (event) => { event.preventDefault(); uploadBox.classList.remove("dragover"); }));
uploadBox.addEventListener("drop", (event) => setResume(event.dataTransfer.files[0]));

function renderTags(id, values) {
  const container = document.getElementById(id);
  container.replaceChildren();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const tag = document.createElement("span");
    tag.textContent = value;
    container.appendChild(tag);
  });
}
function setBusy(button, busy, label) {
  button.disabled = busy;
  if (busy) {
    button.dataset.originalText = button.innerHTML;
    button.textContent = label;
  } else if (button.dataset.originalText) {
    button.innerHTML = button.dataset.originalText;
  }
}
async function responseError(response) {
  const text = await response.text().catch(() => "");
  if (text) {
    try {
      const body = JSON.parse(text);
      if (body.error) return body.error;
    } catch (_error) {
      const message = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (message) return `${response.status}: ${message.slice(0, 300)}`;
    }
  }
  return `Request failed (${response.status}). Check that the app server is running at the same address as this page.`;
}

document.getElementById("analyzeButton").addEventListener("click", async (event) => {
  const role = document.getElementById("jobRole").value.trim();
  if (!selectedResume) return showToast("Upload your resume to get started.");
  if (!role) { document.getElementById("jobRole").focus(); return showToast("Add your target job title to continue."); }
  const button = event.currentTarget;
  const form = new FormData();
  form.append("resume", selectedResume);
  form.append("role", role);
  form.append("jobDescription", document.getElementById("jobDescription").value);
  form.append("profileId", activeProfileId);
  setBusy(button, true, "Analyzing resume…");
  try {
    const response = await fetch("/api/analyze", { method: "POST", body: form });
    if (!response.ok) throw new Error(await responseError(response));
    const result = await response.json();
    activeRole = role;
    document.getElementById("resultRole").textContent = `For ${role}`;
    document.getElementById("matchScore").textContent = result.score;
    document.getElementById("analysisSummary").textContent = result.summary || "";
    renderTags("strengthList", result.strengths);
    renderTags("improvementList", result.improvements);
    renderTags("keywordList", result.missingKeywords);
    document.getElementById("analysisNotice").textContent = result.saved
      ? "Analysis generated from your resume and saved to your history."
      : "Analysis generated from your resume. Connect MongoDB to save it to your history.";
    document.getElementById("analysisResult").classList.remove("hidden");
    questions = Array.isArray(result.questions) && result.questions.length
      ? result.questions.map((text) => ({ type: "PERSONALIZED", text, hint: "Use a specific example and explain the impact of your actions." }))
      : defaultQuestions;
    questionIndex = 0;
    document.querySelector(".session-settings h3").textContent = activeRole;
    loadQuestion();
    document.getElementById("analysisResult").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) { showToast(error.message); }
  finally { setBusy(button, false); }
});

const defaultQuestions = [
  { type: "BEHAVIORAL", text: "Tell me about a time you had to solve a challenging problem. How did you approach it?", hint: "Structure your story with Situation, Task, Action, and Result." },
  { type: "TECHNICAL", text: "How would you improve the performance of a web page that takes too long to load?", hint: "Explain how you would investigate before choosing a solution." },
  { type: "REFLECTION", text: "Tell me about a piece of feedback that changed how you work.", hint: "Show what you learned and how you applied it afterward." }
];
questions = defaultQuestions;
function loadQuestion() {
  const question = questions[questionIndex];
  document.getElementById("questionType").textContent = question.type || "INTERVIEW";
  document.getElementById("questionText").textContent = question.text || question;
  document.querySelector(".question-hint").textContent = question.hint || "Use a specific example and explain the impact of your actions.";
  document.getElementById("questionCount").textContent = `QUESTION ${questionIndex + 1} OF ${questions.length}`;
  document.getElementById("questionProgress").style.width = `${((questionIndex + 1) / questions.length) * 100}%`;
  answerInput.value = "";
  wordCount.textContent = "0 words";
  feedbackShown = false;
  document.getElementById("feedbackBox").classList.add("hidden");
  document.getElementById("submitAnswer").innerHTML = "Get feedback <span>→</span>";
}
answerInput.addEventListener("input", () => {
  const words = answerInput.value.trim().split(/\s+/).filter(Boolean).length;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
});
document.getElementById("submitAnswer").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (feedbackShown) {
    answeredCount += 1;
    document.getElementById("questionsAnswered").textContent = 36 + answeredCount;
    if (questionIndex === questions.length - 1) { showToast("Practice session complete — great work!"); navigateTo("progress"); return; }
    questionIndex += 1;
    loadQuestion();
    return;
  }
  const answer = answerInput.value.trim();
  if (answer.split(/\s+/).filter(Boolean).length < 8) { showToast("Add a little more detail before getting feedback."); answerInput.focus(); return; }
  setBusy(button, true, "Reviewing answer…");
  try {
    const response = await fetch("/api/interview-feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: activeProfileId, role: activeRole, question: document.getElementById("questionText").textContent, answer })
    });
    if (!response.ok) throw new Error(await responseError(response));
    const result = await response.json();
    const feedback = document.getElementById("feedbackBox");
    feedback.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = `Feedback · ${result.score}/100`;
    feedback.appendChild(title);
    [...(result.strengths || []).map((x) => `Strength: ${x}`), ...(result.improvements || []).map((x) => `Try: ${x}`), result.suggestion]
      .filter(Boolean).forEach((line) => { const row = document.createElement("p"); row.textContent = line; feedback.appendChild(row); });
    if (!result.saved) {
      const note = document.createElement("p");
      note.textContent = "Feedback is ready, but MongoDB is not connected, so it was not saved to your history.";
      feedback.appendChild(note);
    }
    feedback.classList.remove("hidden");
    feedbackShown = true;
    button.innerHTML = questionIndex === questions.length - 1 ? "Finish session <span>→</span>" : "Next question <span>→</span>";
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
});
loadQuestion();
document.querySelectorAll(".row-arrow").forEach((button) => button.addEventListener("click", () => showToast("Session history will be saved when accounts are added.")));
