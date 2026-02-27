// =============================================
// MULTI-SCREEN NAVIGATION
// =============================================
let currentScreen = 1;

function goToScreen(n) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((s, i) => {
    s.classList.remove("screen-active", "screen-left", "screen-right");
    const sNum = i + 1;
    if (sNum === n) {
      s.classList.add("screen-active");
    } else if (sNum < n) {
      s.classList.add("screen-left");
    } else {
      s.classList.add("screen-right");
    }
  });
  currentScreen = n;
  updateStepIndicator(n);
}

function updateStepIndicator(n) {
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`step-${i}-indicator`);
    const conn = document.querySelectorAll(".step-connector")[i - 1];
    if (!stepEl) continue;
    stepEl.classList.remove("active", "completed");
    if (i < n) stepEl.classList.add("completed");
    else if (i === n) stepEl.classList.add("active");
    if (conn) {
      conn.classList.toggle("completed", i < n);
    }
  }
}

// =============================================
// DOM REFERENCES  
// =============================================
const resumesContainer = document.getElementById("resumes-container");
const addCandidateBtn = document.getElementById("add-candidate");
const runButton = document.getElementById("run-button");
const jobDescriptionEl = document.getElementById("job-description");
const jdFileInput = document.getElementById("jd-file-input");
const errorBox = document.getElementById("error-box");
const resultsGrid = document.getElementById("results-grid");
const metricTotal = document.getElementById("metric-total");
const metricTop = document.getElementById("metric-top");
const metricAvg = document.getElementById("metric-avg");
const blindToggle = document.getElementById("blind-toggle");
const fairnessIndicator = document.getElementById("fairness-indicator");
const blindModeNotice = document.getElementById("blind-mode-notice");
const exportCsvBtn = document.getElementById("export-csv-btn");
const exportReportBtn = document.getElementById("export-report-btn");
const previewOverlay = document.getElementById("preview-overlay");
const previewClose = document.getElementById("preview-close");
const previewContent = document.getElementById("preview-content");
const previewTitle = document.getElementById("preview-title");
const shortlistSection = document.getElementById("shortlist-section");
const shortlistGrid = document.getElementById("shortlist-grid");
const viewShortlistBtn = document.getElementById("view-shortlist-btn");
const backToResultsBtn = document.getElementById("back-to-results-btn");
const shortlistCount = document.getElementById("shortlist-count");
const contactOverlay = document.getElementById("contact-overlay");
const contactClose = document.getElementById("contact-close");
const contactEmail = document.getElementById("contact-email");
const contactSubject = document.getElementById("contact-subject");

// Settings / theme
const themeToggle = document.getElementById("theme-toggle");
const themeToggleLabel = document.getElementById("theme-toggle-label");
const scoreThresholdSlider = document.getElementById("score-threshold-slider");
const thresholdValue = document.getElementById("threshold-value");
const genAIToggle = document.getElementById("genai-toggle");
const settingsToggle = document.getElementById("settings-toggle");
const settingsDrawer = document.getElementById("settings-drawer");
const settingsClose = document.getElementById("settings-close");
const settingsOverlay = document.getElementById("settings-overlay");

// Global state
let genAIEnabled = true;
let currentThreshold = 70;
const contactMessage = document.getElementById("contact-message");
const whatsappLink = document.getElementById("whatsapp-link");
const shortlistEmailBtn = document.getElementById("shortlist-email-btn");
const rejectionEmailBtn = document.getElementById("rejection-email-btn");
const interviewInviteBtn = document.getElementById("interview-invite-btn");
const contactNameDisplay = document.getElementById("contact-name-display");
const contactEmailDisplay = document.getElementById("contact-email-display");
const contactPhoneDisplay = document.getElementById("contact-phone-display");
const phoneInfoItem = document.getElementById("phone-info-item");
const contactAllBtn = document.getElementById("contact-all-btn");
const downloadContactsBtn = document.getElementById("download-contacts-btn");
let currentContactCandidate = null;
let currentPreviewCandidate = null;

let currentResults = [];
let currentJobDescription = "";
let shortlistedCandidates = [];

// Shortlist storage (using localStorage)
function loadShortlist() {
  const stored = localStorage.getItem("smarthire_shortlist");
  if (stored) {
    shortlistedCandidates = JSON.parse(stored);
    updateShortlistCount();
  }
}

function saveShortlist() {
  localStorage.setItem("smarthire_shortlist", JSON.stringify(shortlistedCandidates));
  updateShortlistCount();
}

function updateShortlistCount() {
  shortlistCount.textContent = shortlistedCandidates.length;
}

function isShortlisted(candidateId) {
  return shortlistedCandidates.some(c => c.id === candidateId);
}

function addToShortlist(candidate) {
  if (!isShortlisted(candidate.id)) {
    shortlistedCandidates.push(candidate);
    saveShortlist();
    updateShortlistCount();
    updateSidebarShortlistCount();
  }
}

function removeFromShortlist(candidateId) {
  shortlistedCandidates = shortlistedCandidates.filter(c => c.id !== candidateId);
  saveShortlist();
  updateShortlistCount();
  updateSidebarShortlistCount();
}

function createCandidateBox(index) {
  const wrapper = document.createElement("div");
  wrapper.className = "candidate-box";
  wrapper.dataset.index = String(index);

  const header = document.createElement("div");
  header.className = "candidate-header";

  const title = document.createElement("div");
  title.className = "candidate-title";
  title.textContent = `Candidate ${index + 1}`;

  const removeBtn = document.createElement("button");
  removeBtn.className = "chip chip-outline";
  removeBtn.textContent = "Remove";
  removeBtn.type = "button";
  removeBtn.addEventListener("click", () => {
    wrapper.remove();
    renumberCandidates();
  });

  header.appendChild(title);
  header.appendChild(removeBtn);

  const textarea = document.createElement("textarea");
  textarea.className = "textarea";
  textarea.placeholder = "Paste resume text here...";

  const uploadRow = document.createElement("div");
  uploadRow.className = "upload-row";
  const uploadLabel = document.createElement("div");
  uploadLabel.className = "helper";
  uploadLabel.textContent = "Upload (PDF, DOC, DOCX, TXT)";
  const uploadInput = document.createElement("input");
  uploadInput.type = "file";
  uploadInput.accept = ".pdf,.doc,.docx,.txt";
  uploadInput.className = "file-input";

  wrapper.appendChild(header);
  wrapper.appendChild(textarea);
  uploadRow.appendChild(uploadLabel);
  uploadRow.appendChild(uploadInput);
  wrapper.appendChild(uploadRow);
  return wrapper;
}

function renumberCandidates() {
  const boxes = resumesContainer.querySelectorAll(".candidate-box");
  boxes.forEach((box, idx) => {
    box.dataset.index = String(idx);
    const title = box.querySelector(".candidate-title");
    if (title) title.textContent = `Candidate ${idx + 1}`;
  });
}

function collectPayload() {
  const jobDescription = jobDescriptionEl.value.trim();
  const resumes = [];

  const boxes = resumesContainer.querySelectorAll(".candidate-box");
  boxes.forEach((box, idx) => {
    const textarea = box.querySelector("textarea");
    const text = (textarea && textarea.value.trim()) || "";
    if (text.length > 0) {
      resumes.push({ id: String(idx + 1), text });
    }
  });

  return { job_description: jobDescription, resumes };
}

async function runScreening() {
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
  resultsGrid.innerHTML = "";

  const payload = collectPayload();
  currentJobDescription = payload.job_description;

  if (!payload.job_description) {
    errorBox.textContent = "Please paste a job description first.";
    errorBox.classList.remove("hidden");
    return;
  }

  const boxes = resumesContainer.querySelectorAll(".candidate-box");
  let hasFiles = false;
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));

  boxes.forEach((box) => {
    const fi = box.querySelector(".file-input");
    if (fi && fi.files && fi.files.length) {
      hasFiles = true;
      Array.from(fi.files).forEach((file) => {
        formData.append("files", file);
      });
    }
  });

  if (!payload.resumes.length && !hasFiles) {
    errorBox.textContent =
      "Please add at least one candidate resume (text or upload).";
    errorBox.classList.remove("hidden");
    return;
  }

  runButton.disabled = true;
  runButton.innerHTML = `<span style="display:inline-flex;align-items:center;gap:0.5rem"><span class="ai-loader"></span> Screening...</span>`;

  try {
    const res = hasFiles
      ? await fetch("/api/screen_upload", {
        method: "POST",
        body: formData
      })
      : await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    if (!res.ok) {
      throw new Error("Request failed");
    }
    const data = await res.json();
    currentResults = data;
    renderResults(data);
    // Navigate to results screen
    goToScreen(3);
  } catch (e) {
    errorBox.textContent =
      "Something went wrong while screening candidates. Make sure the server is running.";
    errorBox.classList.remove("hidden");
  } finally {
    runButton.disabled = false;
    runButton.innerHTML = `Run Screening <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  }
}

function getMatchLabelClass(score) {
  if (score >= 90) return "strong";  // Green only for 90+
  if (score >= 50) return "moderate"; // Yellow for 50-89
  return "weak";  // Red for <50
}

function highlightText(text, matchedSkills, missingSkills) {
  let highlighted = text;
  const lowerText = text.toLowerCase();

  // Highlight matched skills in green
  matchedSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    highlighted = highlighted.replace(regex, match =>
      `<span class="highlight-match">${match}</span>`
    );
  });

  // Highlight missing skills in red (if mentioned in resume)
  missingSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (lowerText.includes(skill.toLowerCase())) {
      highlighted = highlighted.replace(regex, match =>
        `<span class="highlight-missing">${match}</span>`
      );
    }
  });

  return highlighted;
}

function blurSensitiveInfo(text, candidate) {
  const isBlindMode = blindToggle.checked;

  if (!isBlindMode) {
    return text; // No blurring if blind mode is off
  }

  // Use a temporary DOM element to parse HTML safely
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;

  // Extract candidate name from original resume text
  const originalText = candidate.resume_text || "";
  const candidateName = extractNameFromResume(originalText);

  // Function to blur text nodes
  function blurTextNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      let nodeText = node.textContent;

      // Blur candidate name parts
      if (candidateName && candidateName !== "Candidate") {
        const nameParts = candidateName.split(/\s+/).filter(part => part.length > 2);
        nameParts.forEach(part => {
          const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedPart}\\b`, 'gi');
          nodeText = nodeText.replace(regex, match =>
            `<span class="blur-sensitive">${match}</span>`
          );
        });
      }

      // Blur institution names
      const institutionPatterns = [
        /\b(University|College|Institute|School|Academy)\s+of\s+[A-Z][a-zA-Z\s]{2,}/gi,
        /\b[A-Z][a-zA-Z\s]{2,}(?:University|College|Institute|School|Academy)\b/gi,
        /\b(?:MIT|Harvard|Stanford|Yale|Princeton|Columbia|Cornell|Dartmouth|Brown|Penn|Duke|Northwestern|Johns\s+Hopkins|UC\s+Berkeley|UCLA|NYU|USC|Caltech|Carnegie\s+Mellon|Georgia\s+Tech)\b/gi,
      ];

      institutionPatterns.forEach(pattern => {
        nodeText = nodeText.replace(pattern, match =>
          `<span class="blur-sensitive">${match}</span>`
        );
      });

      // If we made changes, replace the text node
      if (nodeText !== node.textContent) {
        const wrapper = document.createElement('span');
        wrapper.innerHTML = nodeText;
        while (wrapper.firstChild) {
          node.parentNode.insertBefore(wrapper.firstChild, node);
        }
        node.parentNode.removeChild(node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Recursively process child nodes
      const children = Array.from(node.childNodes);
      children.forEach(child => blurTextNode(child));
    }
  }

  // Process all nodes
  Array.from(tempDiv.childNodes).forEach(node => blurTextNode(node));

  return tempDiv.innerHTML;
}

function showPreview(candidate) {
  currentPreviewCandidate = candidate;
  previewTitle.textContent = `${candidate.anonymized_name} - Resume Preview`;
  let highlighted = highlightText(
    candidate.resume_text || "",
    candidate.matched_skills || [],
    candidate.missing_skills || []
  );

  // Apply blurring if blind mode is enabled
  highlighted = blurSensitiveInfo(highlighted, candidate);

  previewContent.innerHTML = highlighted;
  previewOverlay.classList.remove("hidden");
}

function refreshPreviewIfOpen() {
  if (currentPreviewCandidate && !previewOverlay.classList.contains("hidden")) {
    showPreview(currentPreviewCandidate);
  }
}

// Update fairness indicator when blind mode toggles
blindToggle.addEventListener("change", () => {
  const isBlindMode = blindToggle.checked;

  // Update fairness indicator
  if (fairnessIndicator) {
    if (isBlindMode) {
      fairnessIndicator.classList.remove("hidden");
    } else {
      fairnessIndicator.classList.add("hidden");
    }
  }

  // Update blind mode notice - force update immediately
  if (blindModeNotice) {
    if (isBlindMode) {
      blindModeNotice.classList.remove("hidden");
      blindModeNotice.style.display = "inline-block";
    } else {
      blindModeNotice.classList.add("hidden");
      blindModeNotice.style.display = "none";
    }
  }

  // Re-render results if they exist to update blind mode display
  if (currentResults.length) {
    renderResults(currentResults);
  }
  // Refresh preview if it's open to update blurring
  refreshPreviewIfOpen();
});

function renderResults(results) {
  if (!Array.isArray(results) || !results.length) {
    errorBox.classList.add("hidden");
    resultsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-title">No candidates ranked yet</div>
        <div class="empty-state-body">
          Run a screening from Step 2 to see ranked candidates here.
        </div>
      </div>
    `;
    return;
  }

  const scores = results.map((r) => r.score || 0);
  const total = results.length;
  const top = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / total;

  metricTotal.textContent = `Total: ${total}`;
  metricTop.textContent = `Top score: ${top.toFixed(1)}`;
  metricAvg.textContent = `Average: ${avg.toFixed(1)}`;

  resultsGrid.innerHTML = "";
  const blind = blindToggle ? blindToggle.checked : false;

  // Show/hide blind mode notice - ensure it's always in sync
  if (blindModeNotice) {
    if (blind) {
      blindModeNotice.classList.remove("hidden");
      blindModeNotice.style.display = "inline-block";
    } else {
      blindModeNotice.classList.add("hidden");
      blindModeNotice.style.display = "none";
    }
  }

  // Auto-shortlist candidates above threshold (before rendering)
  const threshold = currentThreshold;
  results.forEach(r => {
    if (r.score >= threshold && !isShortlisted(r.id)) {
      addToShortlist(r);
    }
  });

  results.forEach((r, index) => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.candidateId = r.id;
    // Staggered animation delay for nicer entrance
    card.style.animationDelay = `${index * 40}ms`;

    const header = document.createElement("div");
    header.className = "card-header";

    const left = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = blind ? r.anonymized_name : r.anonymized_name;

    const matchLabel = document.createElement("span");
    matchLabel.className = `match-label ${getMatchLabelClass(r.score || 0)}`;
    matchLabel.textContent = r.match_label || "N/A";

    const sub = document.createElement("p");
    sub.className = "card-sub";
    sub.textContent = "Relevance score";
    left.appendChild(title);
    left.appendChild(matchLabel);
    left.appendChild(sub);

    const score = document.createElement("div");
    score.className = "score";
    const val = document.createElement("div");
    val.className = "score-value";
    val.textContent = (r.score || 0).toFixed(1);
    const bar = document.createElement("div");
    bar.className = "score-bar";
    const fill = document.createElement("div");
    fill.className = "score-fill";
    fill.style.width = `${Math.min(r.score || 0, 100)}%`;
    bar.appendChild(fill);
    score.appendChild(val);
    score.appendChild(bar);

    header.appendChild(left);
    header.appendChild(score);
    card.appendChild(header);

    // Component Breakdown
    if (r.component_scores) {
      const breakdown = document.createElement("div");
      breakdown.className = "component-breakdown";

      const skillsItem = document.createElement("div");
      skillsItem.className = "component-item";
      const skillsLabel = document.createElement("span");
      skillsLabel.className = "component-label";
      skillsLabel.textContent = "Skills";
      skillsLabel.setAttribute("data-tooltip", "Skill match: overlapping required skills");
      const skillsBar = document.createElement("div");
      skillsBar.className = "component-bar";
      const skillsFill = document.createElement("div");
      skillsFill.className = "component-fill skills";
      skillsFill.style.width = `${r.component_scores.skills || 0}%`;
      skillsBar.appendChild(skillsFill);
      const skillsValue = document.createElement("span");
      skillsValue.className = "component-value";
      skillsValue.textContent = `${r.component_scores.skills || 0}%`;
      skillsItem.appendChild(skillsLabel);
      skillsItem.appendChild(skillsBar);
      skillsItem.appendChild(skillsValue);

      const semanticItem = document.createElement("div");
      semanticItem.className = "component-item";
      const semanticLabel = document.createElement("span");
      semanticLabel.className = "component-label";
      semanticLabel.textContent = "Semantic";
      semanticLabel.setAttribute("data-tooltip", "Semantic match: based on resume & JD meaning similarity");
      const semanticBar = document.createElement("div");
      semanticBar.className = "component-bar";
      const semanticFill = document.createElement("div");
      semanticFill.className = "component-fill semantic";
      semanticFill.style.width = `${r.component_scores.semantic || 0}%`;
      semanticBar.appendChild(semanticFill);
      const semanticValue = document.createElement("span");
      semanticValue.className = "component-value";
      semanticValue.textContent = `${r.component_scores.semantic || 0}%`;
      semanticItem.appendChild(semanticLabel);
      semanticItem.appendChild(semanticBar);
      semanticItem.appendChild(semanticValue);

      const expItem = document.createElement("div");
      expItem.className = "component-item";
      const expLabel = document.createElement("span");
      expLabel.className = "component-label";
      expLabel.textContent = "Experience";
      expLabel.setAttribute("data-tooltip", "Experience match: years of experience alignment");
      const expBar = document.createElement("div");
      expBar.className = "component-bar";
      const expFill = document.createElement("div");
      expFill.className = "component-fill experience";
      expFill.style.width = `${r.component_scores.experience || 0}%`;
      expBar.appendChild(expFill);
      const expValue = document.createElement("span");
      expValue.className = "component-value";
      expValue.textContent = `${r.component_scores.experience || 0}%`;
      expItem.appendChild(expLabel);
      expItem.appendChild(expBar);
      expItem.appendChild(expValue);

      breakdown.appendChild(skillsItem);
      breakdown.appendChild(semanticItem);
      breakdown.appendChild(expItem);
      card.appendChild(breakdown);
    }

    const tagsMatchedRow = document.createElement("div");
    const labelMatched = document.createElement("div");
    labelMatched.className = "helper";
    labelMatched.textContent = "Matched skills";
    const tagsMatched = document.createElement("div");
    tagsMatched.className = "tags-row";
    if (!r.matched_skills || !r.matched_skills.length) {
      const none = document.createElement("span");
      none.className = "helper";
      none.textContent = "None detected";
      tagsMatched.appendChild(none);
    } else {
      r.matched_skills.forEach((s) => {
        const tag = document.createElement("span");
        tag.className = "tag green";
        tag.textContent = s;
        tagsMatched.appendChild(tag);
      });
    }
    tagsMatchedRow.appendChild(labelMatched);
    tagsMatchedRow.appendChild(tagsMatched);
    card.appendChild(tagsMatchedRow);

    const tagsMissingRow = document.createElement("div");
    const labelMissing = document.createElement("div");
    labelMissing.className = "helper";
    labelMissing.textContent = "Missing / desired skills";
    const tagsMissing = document.createElement("div");
    tagsMissing.className = "tags-row";
    if (!r.missing_skills || !r.missing_skills.length) {
      const none = document.createElement("span");
      none.className = "helper";
      none.textContent = "None";
      tagsMissing.appendChild(none);
    } else {
      r.missing_skills.forEach((s) => {
        const tag = document.createElement("span");
        tag.className = "tag red";
        tag.textContent = s;
        tagsMissing.appendChild(tag);
      });
    }
    tagsMissingRow.appendChild(labelMissing);
    tagsMissingRow.appendChild(tagsMissing);
    card.appendChild(tagsMissingRow);

    // Gap Message
    if (r.gap_message) {
      const gapDiv = document.createElement("div");
      gapDiv.className = "gap-message";
      gapDiv.textContent = r.gap_message;
      card.appendChild(gapDiv);
    }

    // Quality Score
    if (r.quality_score !== undefined) {
      const qualityDiv = document.createElement("div");
      qualityDiv.className = "quality-score";
      qualityDiv.innerHTML = `Resume completeness: <span class="quality-score-value">${r.quality_score}%</span>`;
      if (r.quality_issues && r.quality_issues.length) {
        qualityDiv.innerHTML += ` <span style="color: #9ca3af;">(${r.quality_issues.join(", ")})</span>`;
      }
      card.appendChild(qualityDiv);
    }

    // View Resume Button
    const viewBtn = document.createElement("button");
    viewBtn.className = "btn-view-resume";
    viewBtn.textContent = "👁️ View Resume";
    viewBtn.addEventListener("click", () => showPreview(r));
    card.appendChild(viewBtn);

    // AI Features Section
    const aiSection = document.createElement("div");
    aiSection.className = "ai-section";

    const aiSummaryBtn = document.createElement("button");
    aiSummaryBtn.className = "btn-ai";
    aiSummaryBtn.textContent = "🤖 AI Summary";
    aiSummaryBtn.addEventListener("click", () => {
      if (genAIEnabled) {
        generateAISummary(r, aiSummaryBtn);
      } else {
        alert("GenAI features are disabled. Enable them in the sidebar settings.");
      }
    });

    const aiFitBtn = document.createElement("button");
    aiFitBtn.className = "btn-ai";
    // Show "Why Not Good Fit" for weak matches (score < 50), otherwise "Why Good Fit"
    const isWeakMatch = (r.score || 0) < 50;
    aiFitBtn.textContent = isWeakMatch ? "❌ Why Not Good Fit" : "✨ Why Good Fit";
    aiFitBtn.dataset.isWeakMatch = isWeakMatch;
    aiFitBtn.addEventListener("click", () => {
      if (genAIEnabled) {
        generateAIFitExplanation(r, aiFitBtn);
      } else {
        alert("GenAI features are disabled. Enable them in the sidebar settings.");
      }
    });

    if (r.missing_skills && r.missing_skills.length) {
      const aiGapBtn = document.createElement("button");
      aiGapBtn.className = "btn-ai";
      aiGapBtn.textContent = "📊 Skill Gap Analysis";
      aiGapBtn.addEventListener("click", () => {
        if (genAIEnabled) {
          generateAISkillGap(r, aiGapBtn);
        } else {
          alert("GenAI features are disabled. Enable them in the sidebar settings.");
        }
      });
      aiSection.appendChild(aiGapBtn);
    }

    const aiImproveBtn = document.createElement("button");
    aiImproveBtn.className = "btn-ai";
    aiImproveBtn.textContent = "💡 Resume Tips";
    aiImproveBtn.addEventListener("click", () => {
      if (genAIEnabled) {
        generateAIResumeImprovements(r, aiImproveBtn);
      } else {
        alert("GenAI features are disabled. Enable them in the sidebar settings.");
      }
    });

    aiSection.appendChild(aiSummaryBtn);
    aiSection.appendChild(aiFitBtn);
    aiSection.appendChild(aiImproveBtn);
    card.appendChild(aiSection);

    // Shortlist/Reject Actions
    const cardActions = document.createElement("div");
    cardActions.className = "card-actions";

    const shortlistBtn = document.createElement("button");
    shortlistBtn.className = `btn-shortlist ${isShortlisted(r.id) ? "shortlisted" : ""}`;
    shortlistBtn.textContent = isShortlisted(r.id) ? "⭐ Shortlisted" : "⭐ Shortlist";
    shortlistBtn.addEventListener("click", () => {
      if (isShortlisted(r.id)) {
        removeFromShortlist(r.id);
        shortlistBtn.textContent = "⭐ Shortlist";
        shortlistBtn.classList.remove("shortlisted");
      } else {
        addToShortlist(r);
        shortlistBtn.textContent = "⭐ Shortlisted";
        shortlistBtn.classList.add("shortlisted");
      }
    });

    const rejectBtn = document.createElement("button");
    rejectBtn.className = "btn-reject";
    rejectBtn.textContent = "Reject";
    rejectBtn.addEventListener("click", async () => {
      if (confirm(`Generate rejection email for ${r.anonymized_name}?`)) {
        try {
          const candidateName = extractNameFromResume(r.resume_text || "");
          const jobTitle = extractJobTitle(currentJobDescription);
          const res = await fetch("/api/ai/rejection_email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidate_name: candidateName,
              job_title: jobTitle
            })
          });
          if (res.ok) {
            const emailData = await res.json();
            const candidateEmail = extractEmailFromResume(r.resume_text || "");
            const mailtoUrl = `mailto:${candidateEmail}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
            window.location.href = mailtoUrl;
          } else {
            // Fallback: just remove
            card.remove();
            currentResults = currentResults.filter(c => c.id !== r.id);
          }
        } catch (e) {
          // Fallback: just remove
          card.remove();
          currentResults = currentResults.filter(c => c.id !== r.id);
        }
      }
    });

    cardActions.appendChild(shortlistBtn);
    cardActions.appendChild(rejectBtn);
    card.appendChild(cardActions);

    const expl = document.createElement("p");
    expl.className = "explanation";
    expl.textContent = r.explanation || "";
    card.appendChild(expl);

    resultsGrid.appendChild(card);
  });

  // Update AI button states
  if (genAIToggle && !genAIEnabled) {
    const aiButtons = document.querySelectorAll(".btn-ai");
    aiButtons.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
    });
  }

  updateSidebarShortlistCount();
  // Results are shown by navigating to screen 3 via goToScreen(3)
}

// Export Functions
async function exportCSV() {
  if (!currentResults.length) {
    alert("No results to export. Please run screening first.");
    return;
  }

  try {
    const res = await fetch("/api/export_csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: currentResults })
    });
    if (!res.ok) throw new Error("Export failed");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smarthire_results_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (e) {
    alert("Failed to export CSV. Please try again.");
  }
}

async function exportReport() {
  if (!currentResults.length) {
    alert("No results to export. Please run screening first.");
    return;
  }

  try {
    const res = await fetch("/api/export_report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        results: currentResults,
        job_description: currentJobDescription
      })
    });
    if (!res.ok) throw new Error("Export failed");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smarthire_report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (e) {
    alert("Failed to export report. Please try again.");
  }
}

// Initial setup
jdFileInput.addEventListener("change", async () => {
  if (!jdFileInput.files || !jdFileInput.files.length) return;
  const file = jdFileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch("/api/extract_text", {
      method: "POST",
      body: formData
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.text) {
      jobDescriptionEl.value = data.text;
    }
  } catch (e) {
    // silently fail; user can still paste manually
  }
});

// Autosave job description so recruiter can resume later
if (jobDescriptionEl) {
  const savedJD = localStorage.getItem("lastJobDescription");
  if (savedJD && !jobDescriptionEl.value) {
    jobDescriptionEl.value = savedJD;
  }

  jobDescriptionEl.addEventListener("input", () => {
    localStorage.setItem("lastJobDescription", jobDescriptionEl.value);
  });
}

// Shortlist Dashboard Functions
function renderShortlist() {
  if (!shortlistedCandidates.length) {
    shortlistGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⭐</div>
        <div class="empty-state-title">No shortlisted candidates yet</div>
        <div class="empty-state-body">
          From the results screen, use the “⭐ Shortlist” button on a candidate to add them here.
        </div>
      </div>
    `;
    return;
  }

  shortlistGrid.innerHTML = "";
  shortlistedCandidates.forEach((candidate) => {
    const card = document.createElement("article");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";

    const left = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = candidate.anonymized_name || `Candidate ${candidate.id}`;

    const matchLabel = document.createElement("span");
    matchLabel.className = `match-label ${getMatchLabelClass(candidate.score || 0)}`;
    matchLabel.textContent = candidate.match_label || "N/A";

    const sub = document.createElement("p");
    sub.className = "card-sub";
    sub.textContent = `Score: ${(candidate.score || 0).toFixed(1)}`;
    left.appendChild(title);
    left.appendChild(matchLabel);
    left.appendChild(sub);

    const score = document.createElement("div");
    score.className = "score";
    const val = document.createElement("div");
    val.className = "score-value";
    val.textContent = (candidate.score || 0).toFixed(1);
    score.appendChild(val);

    header.appendChild(left);
    header.appendChild(score);
    card.appendChild(header);

    // Matched Skills
    if (candidate.matched_skills && candidate.matched_skills.length) {
      const skillsRow = document.createElement("div");
      const skillsLabel = document.createElement("div");
      skillsLabel.className = "helper";
      skillsLabel.textContent = "Matched Skills:";
      const skillsTags = document.createElement("div");
      skillsTags.className = "tags-row";
      candidate.matched_skills.forEach(s => {
        const tag = document.createElement("span");
        tag.className = "tag green";
        tag.textContent = s;
        skillsTags.appendChild(tag);
      });
      skillsRow.appendChild(skillsLabel);
      skillsRow.appendChild(skillsTags);
      card.appendChild(skillsRow);
    }

    // Action Buttons
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const emailBtn = document.createElement("button");
    emailBtn.className = "btn-contact-card";
    emailBtn.textContent = "✉️ Email";
    emailBtn.addEventListener("click", () => showContactModal(candidate, true));

    const phone = extractPhoneFromResume(candidate.resume_text || "");
    let phoneBtn = null;
    if (phone) {
      phoneBtn = document.createElement("button");
      phoneBtn.className = "btn-contact-card";
      phoneBtn.textContent = "💬 WhatsApp";
      phoneBtn.addEventListener("click", () => {
        const candidateName = extractNameFromResume(candidate.resume_text || "");
        const whatsappMessage = `Hello ${candidateName}, you have been shortlisted for an interview. Please reply to schedule a convenient time.`;
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, "_blank");
      });
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-reject";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      removeFromShortlist(candidate.id);
      renderShortlist();
      renderResults(currentResults);
    });

    actions.appendChild(emailBtn);
    if (phoneBtn) {
      actions.appendChild(phoneBtn);
    }
    actions.appendChild(removeBtn);
    card.appendChild(actions);

    shortlistGrid.appendChild(card);
  });
}

// Contact Functions
function extractEmailFromResume(text) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : "candidate@example.com";
}

function extractNameFromResume(text) {
  // Try to find name in first few lines
  const lines = text.split("\n").slice(0, 5);
  for (const line of lines) {
    let trimmed = line.trim();
    // Remove common prefixes like "Name:", "Full Name:", etc.
    trimmed = trimmed.replace(/^(name|full name|applicant|candidate)[:\s]+/i, "");
    // Remove extra whitespace
    trimmed = trimmed.trim();
    if (trimmed && trimmed.length < 50 && !trimmed.includes("@") && !trimmed.match(/\d{10,}/)) {
      // Split by common separators and take first part
      const nameParts = trimmed.split(/[,\|]/)[0].trim();
      return nameParts || "Candidate";
    }
  }
  return "Candidate";
}

function extractPhoneFromResume(text) {
  // Common phone number patterns
  const patterns = [
    /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // US format
    /\b\+?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g, // International
    /\b\d{10,}\b/g // 10+ digits
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Clean up the phone number
      let phone = matches[0].replace(/[-.\s()]/g, "");
      // Remove country code if it's just +1 for US
      if (phone.startsWith("1") && phone.length === 11) {
        phone = phone.substring(1);
      }
      return phone;
    }
  }
  return null;
}

function extractJobTitle(jobDescription) {
  const jdLines = jobDescription.split("\n").slice(0, 3).join(" ");
  const jobTitleMatch = jdLines.match(/(?:looking for|seeking|hiring|position|role)[\s\w]+?(?:engineer|developer|manager|analyst|specialist)/i);
  if (jobTitleMatch) {
    return jobTitleMatch[0].replace(/^(looking for|seeking|hiring|position|role)\s+/i, "");
  }
  // Try to find job title without the prefix
  const simpleMatch = jdLines.match(/\b(?:engineer|developer|manager|analyst|specialist|designer|architect)\b/i);
  return simpleMatch ? simpleMatch[0] : "";
}

async function generateEmailTemplate(candidate, jobDescription, useAI = false) {
  const candidateName = extractNameFromResume(candidate.resume_text || "");
  const candidateEmail = extractEmailFromResume(candidate.resume_text || "");
  const jobTitle = extractJobTitle(jobDescription);

  if (useAI) {
    try {
      const res = await fetch("/api/ai/shortlist_email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName,
          job_title: jobTitle,
          matched_skills: candidate.matched_skills || []
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { candidateName, candidateEmail, subject: data.subject, message: data.body };
      }
    } catch (e) {
      console.error("AI email generation failed, using template", e);
    }
  }

  // Fallback template
  const subject = `Interview Invitation – ${jobTitle}`;
  const message = `Dear ${candidateName},

You have been shortlisted for the ${jobTitle} role based on your skills and experience.

Your profile shows strong alignment with our requirements:
${candidate.matched_skills ? `- ${candidate.matched_skills.join("\n- ")}` : "- Relevant experience"}

Please reply to this email to schedule an interview at your earliest convenience.

We look forward to hearing from you.

Best regards,
HR Team
SmartHire`;

  return { candidateName, candidateEmail, subject, message };
}

// Loader helper function
function showButtonLoader(button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.dataset.originalText = originalText;
  button.innerHTML = '<span class="ai-loader"></span> Generating...';
}

function hideButtonLoader(button) {
  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
}

// AI Generation Functions
async function generateAISummary(candidate, button) {
  showButtonLoader(button);
  const candidateName = extractNameFromResume(candidate.resume_text || "");
  const jobTitle = extractJobTitle(currentJobDescription);

  try {
    // Add a small delay to make it feel real
    await new Promise(resolve => setTimeout(resolve, 800));

    const res = await fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_name: candidateName,
        resume_text: candidate.resume_text || "",
        matched_skills: candidate.matched_skills || [],
        experience_years: candidate.resume_exp || 0,
        job_title: jobTitle
      })
    });
    if (res.ok) {
      const data = await res.json();
      hideButtonLoader(button);
      showAIModal("AI Candidate Summary", data.summary);
    } else {
      hideButtonLoader(button);
      alert("Failed to generate AI summary. Please try again.");
    }
  } catch (e) {
    hideButtonLoader(button);
    alert("Error generating AI summary. Please check your API key.");
  }
}

async function generateAIFitExplanation(candidate, button) {
  showButtonLoader(button);
  const candidateName = extractNameFromResume(candidate.resume_text || "");
  const jobTitle = extractJobTitle(currentJobDescription);
  const isWeakMatch = button.dataset.isWeakMatch === "true";

  try {
    // Add a small delay to make it feel real
    await new Promise(resolve => setTimeout(resolve, 800));

    const res = await fetch("/api/ai/fit_explanation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_name: candidateName,
        matched_skills: candidate.matched_skills || [],
        score: candidate.score || 0,
        component_scores: candidate.component_scores || {},
        job_title: jobTitle,
        is_weak_match: isWeakMatch
      })
    });
    if (res.ok) {
      const data = await res.json();
      hideButtonLoader(button);
      const title = isWeakMatch ? "Why This Candidate is Not a Good Fit" : "Why This Candidate is a Good Fit";
      showAIModal(title, data.explanation);
    } else {
      hideButtonLoader(button);
      alert("Failed to generate fit explanation.");
    }
  } catch (e) {
    hideButtonLoader(button);
    alert("Error generating fit explanation.");
  }
}

async function generateAISkillGap(candidate, button) {
  showButtonLoader(button);
  const candidateName = extractNameFromResume(candidate.resume_text || "");

  try {
    // Add a small delay to make it feel real
    await new Promise(resolve => setTimeout(resolve, 800));

    const res = await fetch("/api/ai/skill_gap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        missing_skills: candidate.missing_skills || [],
        candidate_name: candidateName
      })
    });
    if (res.ok) {
      const data = await res.json();
      hideButtonLoader(button);
      showAIModal("Skill Gap Analysis", data.explanation);
    } else {
      hideButtonLoader(button);
      alert("Failed to generate skill gap analysis.");
    }
  } catch (e) {
    hideButtonLoader(button);
    alert("Error generating skill gap analysis.");
  }
}

async function generateAIResumeImprovements(candidate, button) {
  showButtonLoader(button);

  try {
    // Add a small delay to make it feel real
    await new Promise(resolve => setTimeout(resolve, 800));

    const res = await fetch("/api/ai/resume_improvements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume_text: candidate.resume_text || "",
        job_description: currentJobDescription,
        missing_skills: candidate.missing_skills || []
      })
    });
    if (res.ok) {
      const data = await res.json();
      hideButtonLoader(button);
      showAIModal("Resume Improvement Suggestions", data.suggestions);
    } else {
      hideButtonLoader(button);
      alert("Failed to generate improvement suggestions.");
    }
  } catch (e) {
    hideButtonLoader(button);
    alert("Error generating improvement suggestions.");
  }
}

function showAIModal(title, content) {
  // Reuse preview overlay for AI content
  previewTitle.textContent = title;
  previewContent.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.6;">${content}</div>`;
  previewOverlay.classList.remove("hidden");
}

async function showContactModal(candidate, isFromShortlist = false) {
  currentContactCandidate = candidate;
  const candidateName = extractNameFromResume(candidate.resume_text || "");
  const candidateEmail = extractEmailFromResume(candidate.resume_text || "");
  const candidatePhone = extractPhoneFromResume(candidate.resume_text || "");

  // Display contact info
  contactNameDisplay.textContent = candidateName;
  contactEmailDisplay.textContent = candidateEmail;

  // Hide rejection email button if from shortlist section
  if (isFromShortlist && rejectionEmailBtn) {
    rejectionEmailBtn.style.display = "none";
  } else if (rejectionEmailBtn) {
    rejectionEmailBtn.style.display = "inline-block";
  }

  // Handle phone/WhatsApp
  if (candidatePhone) {
    contactPhoneDisplay.textContent = candidatePhone;
    phoneInfoItem.classList.remove("hidden");
    whatsappLink.classList.remove("hidden");

    // Create WhatsApp link (opens WhatsApp with pre-filled message)
    const whatsappMessage = `Hello ${candidateName}, you have been shortlisted for an interview. Please reply to schedule a convenient time.`;
    const whatsappUrl = `https://wa.me/${candidatePhone}?text=${encodeURIComponent(whatsappMessage)}`;
    whatsappLink.href = whatsappUrl;
  } else {
    contactPhoneDisplay.textContent = "Not available";
    phoneInfoItem.classList.add("hidden");
    whatsappLink.classList.add("hidden");
  }

  // Clear email fields initially
  contactEmail.value = candidateEmail;
  contactSubject.value = "";
  contactMessage.value = "";

  contactOverlay.classList.remove("hidden");
}

async function generateAndSendEmail(emailType) {
  if (!currentContactCandidate) return;

  const candidateName = extractNameFromResume(currentContactCandidate.resume_text || "");
  const candidateEmail = extractEmailFromResume(currentContactCandidate.resume_text || "");
  const jobTitle = extractJobTitle(currentJobDescription);

  try {
    let endpoint = "";
    let requestBody = {};

    if (emailType === "shortlist") {
      endpoint = "/api/ai/shortlist_email";
      requestBody = {
        candidate_name: candidateName,
        job_title: jobTitle,
        matched_skills: currentContactCandidate.matched_skills || []
      };
    } else if (emailType === "rejection") {
      endpoint = "/api/ai/rejection_email";
      requestBody = {
        candidate_name: candidateName,
        job_title: jobTitle
      };
    } else if (emailType === "interview") {
      endpoint = "/api/ai/interview_invite";
      requestBody = {
        candidate_name: candidateName,
        job_title: jobTitle,
        matched_skills: currentContactCandidate.matched_skills || []
      };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (res.ok) {
      const data = await res.json();
      const cleanJobTitle = jobTitle && jobTitle !== "the position" ? jobTitle : "this role";
      let subject = data.subject || `Interview Invitation – ${cleanJobTitle}`;
      let body = data.body || data.message || "";

      // Clean up any "position position" duplicates in subject and body
      subject = subject.replace(/\bthe position position\b/gi, "this role");
      subject = subject.replace(/\bposition position\b/gi, "position");
      body = body.replace(/\bthe position position\b/gi, "this role");
      body = body.replace(/\bposition position\b/gi, "position");

      // Update email fields
      contactSubject.value = subject;
      contactMessage.value = body;

      // Create mailto link and open it
      const mailtoUrl = `mailto:${candidateEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    } else {
      const errorData = await res.json();
      alert(errorData.error || "Failed to generate email. Please try again.");
    }
  } catch (e) {
    alert("Error generating email. Please try again.");
  }
}

function downloadContactList() {
  if (!shortlistedCandidates.length) {
    alert("No shortlisted candidates to download.");
    return;
  }

  const csvLines = ["Name,Email,Score,Matched Skills"];
  shortlistedCandidates.forEach(c => {
    const email = extractEmailFromResume(c.resume_text || "");
    const name = extractNameFromResume(c.resume_text || "");
    const skills = (c.matched_skills || []).join("; ");
    csvLines.push(`"${name}","${email}",${c.score || 0},"${skills}"`);
  });

  const csvContent = csvLines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smarthire_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Email button event listeners
if (shortlistEmailBtn) {
  shortlistEmailBtn.addEventListener("click", () => {
    generateAndSendEmail("shortlist");
  });
}

if (rejectionEmailBtn) {
  rejectionEmailBtn.addEventListener("click", () => {
    generateAndSendEmail("rejection");
  });
}

if (interviewInviteBtn) {
  interviewInviteBtn.addEventListener("click", () => {
    generateAndSendEmail("interview");
  });
}
previewClose.addEventListener("click", () => {
  previewOverlay.classList.add("hidden");
});
previewOverlay.addEventListener("click", (e) => {
  if (e.target === previewOverlay) {
    previewOverlay.classList.add("hidden");
  }
});

// Contact modal close handlers
if (contactClose) {
  contactClose.addEventListener("click", () => {
    contactOverlay.classList.add("hidden");
  });
}

if (contactOverlay) {
  contactOverlay.addEventListener("click", (e) => {
    if (e.target === contactOverlay) {
      contactOverlay.classList.add("hidden");
    }
  });
}

// Add Candidate button
if (addCandidateBtn) {
  addCandidateBtn.addEventListener("click", () => {
    const boxes = resumesContainer.querySelectorAll(".candidate-box");
    resumesContainer.appendChild(createCandidateBox(boxes.length));
  });
}

// Run Screening button
if (runButton) {
  runButton.addEventListener("click", runScreening);
}

function updateThemeLabel(theme) {
  if (!themeToggleLabel) return;
  themeToggleLabel.textContent = theme === "light" ? "Light Theme" : "Dark Theme";
}

// Theme Toggle
if (themeToggle) {
  // Load saved theme preference
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");
    themeToggle.checked = true;
  } else {
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme");
    themeToggle.checked = false;
  }
  updateThemeLabel(savedTheme);

  themeToggle.addEventListener("change", () => {
    if (themeToggle.checked) {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
      updateThemeLabel("light");
    } else {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
      localStorage.setItem("theme", "dark");
      updateThemeLabel("dark");
    }
  });
}

// Score Threshold Slider
if (scoreThresholdSlider && thresholdValue) {
  scoreThresholdSlider.addEventListener("input", (e) => {
    currentThreshold = parseInt(e.target.value);
    thresholdValue.textContent = currentThreshold;
    localStorage.setItem("scoreThreshold", currentThreshold);
  });

  // Load saved threshold
  const savedThreshold = localStorage.getItem("scoreThreshold");
  if (savedThreshold) {
    currentThreshold = parseInt(savedThreshold);
    scoreThresholdSlider.value = currentThreshold;
    thresholdValue.textContent = currentThreshold;
  }
}

// GenAI Toggle
if (genAIToggle) {
  // Load saved preference
  const savedGenAI = localStorage.getItem("genAIEnabled");
  if (savedGenAI !== null) {
    genAIEnabled = savedGenAI === "true";
    genAIToggle.checked = genAIEnabled;
  }

  function updateAIButtonsState() {
    const aiButtons = document.querySelectorAll(".btn-ai");
    aiButtons.forEach(btn => {
      if (!genAIEnabled) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
      } else {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
      }
    });
  }

  genAIToggle.addEventListener("change", () => {
    genAIEnabled = genAIToggle.checked;
    localStorage.setItem("genAIEnabled", genAIEnabled);
    updateAIButtonsState();
  });

  // Update on initial load
  updateAIButtonsState();
}

// =============================================
// MULTI-SCREEN BUTTON WIRING
// =============================================

// Screen 1 → 2
const step1Next = document.getElementById("step1-next");
if (step1Next) {
  step1Next.addEventListener("click", () => {
    const jd = jobDescriptionEl ? jobDescriptionEl.value.trim() : "";
    if (!jd) {
      jobDescriptionEl.style.outline = "2px solid rgba(248,113,113,0.6)";
      jobDescriptionEl.focus();
      setTimeout(() => { jobDescriptionEl.style.outline = ""; }, 2000);
      return;
    }
    goToScreen(2);
  });
}

// Screen 2 → 1 (back)
const step2Back = document.getElementById("step2-back");
if (step2Back) {
  step2Back.addEventListener("click", () => goToScreen(1));
}

// Screen 3 → 2 (new screening)
const step3Back = document.getElementById("step3-back");
if (step3Back) {
  step3Back.addEventListener("click", () => {
    if (confirm("Start a new screening? Current results will be cleared.")) {
      resultsGrid.innerHTML = "";
      currentResults = [];
      goToScreen(1);
    }
  });
}

// Results screen: quick back to Step 2 (candidates) without clearing results
const resultsBackStep2 = document.getElementById("results-back-step2");
if (resultsBackStep2) {
  resultsBackStep2.addEventListener("click", () => {
    goToScreen(2);
  });
}

// Settings Drawer
if (settingsToggle && settingsDrawer) {
  settingsToggle.addEventListener("click", () => {
    settingsDrawer.classList.toggle("open");
    settingsOverlay.classList.toggle("hidden");
  });
}

if (settingsClose) {
  settingsClose.addEventListener("click", () => {
    settingsDrawer.classList.remove("open");
    settingsOverlay.classList.add("hidden");
  });
}

if (settingsOverlay) {
  settingsOverlay.addEventListener("click", () => {
    settingsDrawer.classList.remove("open");
    settingsOverlay.classList.add("hidden");
  });
}

// Shortlist screen navigation
if (viewShortlistBtn) {
  viewShortlistBtn.addEventListener("click", () => {
    renderShortlist();
    goToScreen(4);
  });
}

if (backToResultsBtn) {
  backToResultsBtn.addEventListener("click", () => {
    goToScreen(3);
  });
}

// No-op stub for updateSidebarShortlistCount (no second sidebar count)
function updateSidebarShortlistCount() {
  updateShortlistCount();
}

// Start with two candidate boxes by default
resumesContainer.appendChild(createCandidateBox(0));
resumesContainer.appendChild(createCandidateBox(1));

// Initialize: ensure fairness indicator and blind mode notice are hidden on page load
if (fairnessIndicator) {
  fairnessIndicator.classList.add("hidden");
}
if (blindModeNotice) {
  blindModeNotice.classList.add("hidden");
  blindModeNotice.style.display = "none";
}

// Load shortlist from storage
loadShortlist();

