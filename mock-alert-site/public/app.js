import { VideoAnnotator } from "/repo/src/markrEdge/annotations/video-annotator.js";

// ─── Video channel mapping ────────────────────────────────────────────────────
// 0.mp4 = outward (road-facing, always shown in box 1)
// 1.mp4 = inward  (cabin-facing)
// 8.mp4 = DMS     (driver monitoring system)
const FIRST_VIDEO  = "0.mp4";
const VIDEO_SECOND = { inward: "1.mp4", dms: "8.mp4" };

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const dataDirInputEl      = document.querySelector("#data-dir-input");
const applyDataDirBtnEl   = document.querySelector("#apply-data-dir-btn");
const alertIdInputEl      = document.querySelector("#alert-id-input");
const secondVideoSelectEl = document.querySelector("#second-video-select");
const loadBtnEl           = document.querySelector("#load-btn");
const annotationsToggleEl = document.querySelector("#annotations-toggle");
const box2LabelEl         = document.querySelector("#box2-label");
const video1El            = document.querySelector("#video-1");
const video2El            = document.querySelector("#video-2");
const videoStageWrap1El   = document.querySelector("#video-stage-wrap-1");
const videoStageWrap2El   = document.querySelector("#video-stage-wrap-2");
const konvaHost1El        = document.querySelector("#konva-host-1");
const konvaHost2El        = document.querySelector("#konva-host-2");
const vcPlayPauseEl       = document.querySelector("#vc-play-pause");
const vcSeekEl            = document.querySelector("#vc-seek");
const vcCurrentEl         = document.querySelector("#vc-current");
const vcDurationEl        = document.querySelector("#vc-duration");
const vcMuteEl            = document.querySelector("#vc-mute");
// ─── Video sync / controls state ────────────────────────────────────────────
function fmtTime(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function updateControlsUI() {
  vcPlayPauseEl.innerHTML = video1El.paused ? "&#9654;" : "&#9646;&#9646;";
  vcCurrentEl.textContent = fmtTime(video1El.currentTime);
  if (isFinite(video1El.duration)) vcSeekEl.value = video1El.currentTime;
}

function snapVideo2ToVideo1() {
  if (video2El.readyState < 1) return;
  const drift = Math.abs(video2El.currentTime - video1El.currentTime);
  if (drift > 0.3) video2El.currentTime = video1El.currentTime;
}

function wireVideoSync() {
  // video1 is the master — its events drive the UI and keep video2 in sync
  video1El.addEventListener("timeupdate", () => {
    updateControlsUI();
    snapVideo2ToVideo1();
  });

  video1El.addEventListener("loadedmetadata", () => {
    vcSeekEl.max = video1El.duration;
    vcSeekEl.value = 0;
    vcDurationEl.textContent = fmtTime(video1El.duration);
    vcCurrentEl.textContent = "0:00";
  });

  // When video2 loads its source, snap it to video1's playhead
  video2El.addEventListener("loadedmetadata", () => {
    video2El.currentTime = video1El.currentTime;
    if (!video1El.paused) video2El.play().catch(() => {});
  });

  // Let video1 events propagate to video2 — no duplication in the click handler
  video1El.addEventListener("play",  () => { updateControlsUI(); if (video2El.readyState >= 1) video2El.play().catch(() => {}); });
  video1El.addEventListener("pause", () => { updateControlsUI(); if (video2El.readyState >= 1) video2El.pause(); });
  video1El.addEventListener("ended", () => { updateControlsUI(); if (video2El.readyState >= 1) video2El.pause(); });

  // Play/pause button only needs to control video1 — events above handle video2
  vcPlayPauseEl.addEventListener("click", () => {
    if (video1El.paused) video1El.play().catch(() => {});
    else video1El.pause();
  });

  // Live seek on drag — no isSeeking flag needed
  vcSeekEl.addEventListener("input", () => {
    const t = parseFloat(vcSeekEl.value);
    vcCurrentEl.textContent = fmtTime(t);
    video1El.currentTime = t;
    if (video2El.readyState >= 1) video2El.currentTime = t;
  });

  vcMuteEl.addEventListener("click", () => {
    video1El.muted = !video1El.muted;
    video2El.muted = video1El.muted;
    vcMuteEl.innerHTML = video1El.muted ? "&#128263;" : "&#128266;";
  });
}

// ─── State ────────────────────────────────────────────────────────────────────
let activeDetail       = null;
let annotationsEnabled = false;
/** @type {import('konva')|null} */ let stage1 = null;
/** @type {import('konva')|null} */ let stage2 = null;
let annotator1 = null;
let annotator2 = null;
let annotationInitToken = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getVideoUrl(detail, filename) {
  const idx = detail.videos.indexOf(filename);
  return idx !== -1 ? detail.videoUrls[idx] : null;
}

function setVideo(videoEl, url) {
  if (url) {
    videoEl.src = url;
    videoEl.load();
    videoEl.style.opacity = "1";
  } else {
    videoEl.removeAttribute("src");
    videoEl.load();
    videoEl.style.opacity = "0.2";
  }
}

function destroyAnnotators() {
  if (annotator1) {
    annotator1.destroy();
    annotator1 = null;
  }
  if (annotator2) {
    annotator2.destroy();
    annotator2 = null;
  }
}

function parseMetadataText(metadataText) {
  if (!metadataText || !metadataText.trim()) return null;
  try {
    return JSON.parse(metadataText);
  } catch (err) {
    console.warn("Metadata is not valid JSON, skipping annotations", err);
    return null;
  }
}

function waitForVideoMetadata(videoEl) {
  if (videoEl.readyState >= 1) return Promise.resolve();
  return new Promise(resolve => {
    videoEl.addEventListener("loadedmetadata", resolve, { once: true });
  });
}

async function refreshAnnotators() {
  const token = ++annotationInitToken;
  destroyAnnotators();

  if (!annotationsEnabled || !activeDetail || !stage1 || !stage2) return;

  const metadata = parseMetadataText(activeDetail.metadataText || "");
  if (!metadata) return;

  await Promise.all([waitForVideoMetadata(video1El), waitForVideoMetadata(video2El)]);
  if (token !== annotationInitToken || !annotationsEnabled) return;

  annotator1 = new VideoAnnotator(video1El, stage1, metadata, ["Dsf", "Multilane"]);
  annotator2 = new VideoAnnotator(video2El, stage2, metadata, ["Header", "InertialBar"]);
}

function projectedHeight(videoEl, boxWidth) {
  if (!(videoEl.videoWidth > 0 && videoEl.videoHeight > 0 && boxWidth > 0)) return null;
  return boxWidth * (videoEl.videoHeight / videoEl.videoWidth);
}

function updateRigidVideoFrameHeight() {
  const boxWidth = videoStageWrap1El.clientWidth || videoStageWrap2El.clientWidth;
  if (!boxWidth) return;

  const h1 = projectedHeight(video1El, boxWidth);
  const h2 = projectedHeight(video2El, boxWidth);

  // Rule requested: rigid shared height = min of both videos at half-width.
  let target = null;
  if (h1 && h2) target = Math.min(h1, h2);
  else if (h1 || h2) target = h1 || h2;
  if (!target) return;

  const rigid = `${Math.max(200, Math.round(target))}px`;
  videoStageWrap1El.style.height = rigid;
  videoStageWrap2El.style.height = rigid;
}

// ─── Konva stage setup ────────────────────────────────────────────────────────
function syncStageToVideo(stage, videoEl) {
  const w = videoEl.offsetWidth;
  const h = videoEl.offsetHeight;
  if (w > 0 && h > 0) {
    stage.width(w);
    stage.height(h);
  }
}

function initStages() {
  if (!window.Konva) {
    console.warn("Konva not loaded — annotation overlays unavailable.");
    return;
  }

  stage1 = new window.Konva.Stage({ container: konvaHost1El, width: 1, height: 1 });
  stage2 = new window.Konva.Stage({ container: konvaHost2El, width: 1, height: 1 });

  // Expose globally so annotation system can reach them
  window.stage1 = stage1;
  window.stage2 = stage2;

  // Keep each stage sized to its video via ResizeObserver + loadedmetadata
  for (const [videoEl, stage] of [[video1El, stage1], [video2El, stage2]]) {
    const sync = () => syncStageToVideo(stage, videoEl);
    new ResizeObserver(sync).observe(videoEl);
    videoEl.addEventListener("loadedmetadata", () => {
      updateRigidVideoFrameHeight();
      sync();
    });
  }

  window.addEventListener("resize", updateRigidVideoFrameHeight);
}

// ─── Load selected alert ──────────────────────────────────────────────────────
function applySecondVideo(detail) {
  const channel   = secondVideoSelectEl.value;           // "inward" | "dms"
  const filename  = VIDEO_SECOND[channel];
  const url       = getVideoUrl(detail, filename);
  setVideo(video2El, url);
  box2LabelEl.textContent = capitalize(channel);
}

async function loadAlert(alertId) {
  const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`);
  if (!res.ok) throw new Error(`Failed to load alert: ${alertId}`);
  activeDetail = await res.json();
  alertIdInputEl.value = activeDetail.alertId;
  setVideo(video1El, getVideoUrl(activeDetail, FIRST_VIDEO));
  applySecondVideo(activeDetail);
  updateRigidVideoFrameHeight();
  await refreshAnnotators();
}

async function refreshAlerts() {
  const res = await fetch("/api/alerts");
  if (!res.ok) throw new Error("Failed to load alert list");
  const payload = await res.json();
  dataDirInputEl.value = payload.dataDir || "";
  return payload;
}

async function applyDataDir() {
  const nextDataDir = dataDirInputEl.value.trim();
  if (!nextDataDir) return;

  const res = await fetch("/api/data-dir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataDir: nextDataDir }),
  });
  if (!res.ok) throw new Error("Failed to update data directory");

  const payload = await refreshAlerts();
  if ((payload.alerts || []).length > 0) {
    await loadAlert(payload.alerts[0].alertId);
  } else {
    setVideo(video1El, null);
    setVideo(video2El, null);
    destroyAnnotators();
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  initStages();
  wireVideoSync();

  const payload = await refreshAlerts();

  if ((payload.alerts || []).length > 0) {
    await loadAlert(payload.alerts[0].alertId);
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────
loadBtnEl.addEventListener("click", async () => {
  const id = alertIdInputEl.value.trim();
  if (id) await loadAlert(id).catch(err => console.error(err));
});

applyDataDirBtnEl.addEventListener("click", () => {
  applyDataDir().catch(err => console.error(err));
});

dataDirInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") applyDataDir().catch(err => console.error(err));
});

alertIdInputEl.addEventListener("keydown", e => { if (e.key === "Enter") loadBtnEl.click(); });

secondVideoSelectEl.addEventListener("change", () => {
  if (!activeDetail) return;
  applySecondVideo(activeDetail);
  refreshAnnotators().catch(err => console.error(err));
});

annotationsToggleEl.addEventListener("change", () => {
  annotationsEnabled = annotationsToggleEl.checked;
  refreshAnnotators().catch(err => console.error(err));
});

init().catch(err => console.error("Init failed:", err));
