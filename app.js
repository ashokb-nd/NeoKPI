import { VideoAnnotator } from "/markrEdge/video-annotator.js";
import { createTelemetryGraphs } from "./telemetry-graphs.js";

// 0.mp4 = outward (box 1), 1.mp4 = inward, 8.mp4 = DMS
const FIRST_VIDEO = "0.mp4";
const VIDEO_SECOND = { inward: "1.mp4", dms: "8.mp4" };

// DOM refs
const dataDirInputEl = document.querySelector("#data-dir-input");
const applyDataDirBtnEl = document.querySelector("#apply-data-dir-btn");
const alertIdInputEl = document.querySelector("#alert-id-input");
const secondVideoSelectEl = document.querySelector("#second-video-select");
const loadBtnEl = document.querySelector("#load-btn");
const copyAlertIdsBtnEl = document.querySelector("#copy-alert-ids-btn");
const alertIndexBadgeEl = document.querySelector("#alert-index-badge");
const annotationsToggleEl = document.querySelector("#annotations-toggle");

const box2LabelEl = document.querySelector("#box2-label");
const video1El = document.querySelector("#video-1");
const video2El = document.querySelector("#video-2");
const videoStageWrap1El = document.querySelector("#video-stage-wrap-1");
const videoStageWrap2El = document.querySelector("#video-stage-wrap-2");
const konvaHost1El = document.querySelector("#konva-host-1");
const konvaHost2El = document.querySelector("#konva-host-2");

const vcPlayPauseEl = document.querySelector("#vc-play-pause");
const vcSeekEl = document.querySelector("#vc-seek");
const vcCurrentEl = document.querySelector("#vc-current");
const vcDurationEl = document.querySelector("#vc-duration");
const vcMuteEl = document.querySelector("#vc-mute");

const telemetrySmoothSliderEl = document.querySelector("#telemetry-smooth-slider");

// State
let activeDetail = null;
let annotationsEnabled = Boolean(annotationsToggleEl?.checked);
let stage1 = null;
let stage2 = null;
let annotator1 = null;
let annotator2 = null;
let annotationInitToken = 0;
let availableAlertIds = [];
let currentAlertIndex = -1;
let copyIdsStatusTimer = null;

let controlsRafId = null;
const telemetryGraphs = createTelemetryGraphs({
  laneChartEl: document.querySelector("#telemetry-lane-chart"),
  inertialChartEl: document.querySelector("#telemetry-inertial-chart"),
  laneValueEl: document.querySelector("#telemetry-lane-value"),
  lateralValueEl: document.querySelector("#telemetry-lateral-value"),
  drivingValueEl: document.querySelector("#telemetry-driving-value"),
  smoothSliderEl: telemetrySmoothSliderEl,
  smoothValueEl: document.querySelector("#telemetry-smooth-value"),
});

function stopControlsLoop() {
  if (controlsRafId !== null) {
    cancelAnimationFrame(controlsRafId);
    controlsRafId = null;
  }
}

function runControlsLoop() {
  updateControlsUI();
  snapVideo2ToVideo1();

  if (!video1El.paused && !video1El.ended) {
    controlsRafId = requestAnimationFrame(runControlsLoop);
  } else {
    controlsRafId = null;
  }
}

function startControlsLoop() {
  if (controlsRafId !== null) return;
  controlsRafId = requestAnimationFrame(runControlsLoop);
}

function fmtTime(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function syncCurrentAlertIndex(alertId) {
  currentAlertIndex = availableAlertIds.indexOf(alertId);
}

function renderAlertIndexBadge() {
  if (!alertIndexBadgeEl) return;

  if (currentAlertIndex < 0 || availableAlertIds.length === 0) {
    alertIndexBadgeEl.textContent = "--/--";
    return;
  }

  alertIndexBadgeEl.textContent = `${currentAlertIndex + 1}/${availableAlertIds.length}`;
}

function setCopyIdsButtonStatus(label) {
  if (!copyAlertIdsBtnEl) return;
  copyAlertIdsBtnEl.textContent = label;

  if (copyIdsStatusTimer) clearTimeout(copyIdsStatusTimer);
  copyIdsStatusTimer = setTimeout(() => {
    copyAlertIdsBtnEl.textContent = "Copy IDs";
    copyIdsStatusTimer = null;
  }, 1400);
}

async function writeTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  scratch.style.position = "absolute";
  scratch.style.left = "-9999px";
  document.body.appendChild(scratch);
  scratch.select();

  const success = document.execCommand("copy");
  document.body.removeChild(scratch);
  if (!success) throw new Error("Clipboard copy failed");
}

async function copyAlertIds() {
  if (!availableAlertIds.length) {
    setCopyIdsButtonStatus("No IDs");
    return;
  }

  const payload = availableAlertIds.join("\n");
  try {
    await writeTextToClipboard(payload);
    setCopyIdsButtonStatus("Copied");
  } catch (err) {
    console.error("Copy IDs failed:", err);
    setCopyIdsButtonStatus("Copy failed");
  }
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

function projectedHeight(videoEl, boxWidth) {
  if (!(videoEl.videoWidth > 0 && videoEl.videoHeight > 0 && boxWidth > 0)) return null;
  return boxWidth * (videoEl.videoHeight / videoEl.videoWidth);
}

function updateRigidVideoFrameHeight() {
  const boxWidth = videoStageWrap1El.clientWidth || videoStageWrap2El.clientWidth;
  if (!boxWidth) return;

  const h1 = projectedHeight(video1El, boxWidth);
  const h2 = projectedHeight(video2El, boxWidth);

  let target = null;
  if (h1 && h2) target = Math.min(h1, h2);
  else if (h1 || h2) target = h1 || h2;
  if (!target) return;

  const rigid = `${Math.max(200, Math.round(target))}px`;
  videoStageWrap1El.style.height = rigid;
  videoStageWrap2El.style.height = rigid;
}

// Annotation helpers
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
  annotator2 = new VideoAnnotator(video2El, stage2, metadata, ["Header"]); // "InertialBar"
}

// Stage setup
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

  window.stage1 = stage1;
  window.stage2 = stage2;

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

// Video sync and controls
function snapVideo2ToVideo1() {
  if (video2El.readyState < 1) return;
  const drift = Math.abs(video2El.currentTime - video1El.currentTime);
  if (drift > 0.3) video2El.currentTime = video1El.currentTime;
}

function togglePlayback() {
  if (!video1El.src) return;
  if (video1El.paused) video1El.play().catch(() => {});
  else video1El.pause();
}

function seekToTime(nextTimeSec) {
  if (!video1El.src) return;

  const duration = Number.isFinite(video1El.duration) ? video1El.duration : 0;
  const clampedTime = Math.max(0, Math.min(nextTimeSec, duration || nextTimeSec));
  video1El.currentTime = clampedTime;
  if (video2El.readyState >= 1) video2El.currentTime = clampedTime;
  updateControlsUI();
  telemetryGraphs.updateForTime(clampedTime, true);
}

function seekBy(deltaSec) {
  seekToTime((video1El.currentTime || 0) + deltaSec);
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "BUTTON";
}

async function moveAlertSelection(direction) {
  if (!availableAlertIds.length) return false;

  if (currentAlertIndex === -1 && activeDetail?.alertId) {
    syncCurrentAlertIndex(activeDetail.alertId);
  }

  const step = direction === "previous" ? -1 : 1;
  const baseIndex = currentAlertIndex === -1 ? 0 : currentAlertIndex;
  const nextIndex = Math.max(0, Math.min(availableAlertIds.length - 1, baseIndex + step));
  if (nextIndex === baseIndex) return true;
  await loadAlert(availableAlertIds[nextIndex]);
  return true;
}

async function submitAlertInput() {
  const inputValue = alertIdInputEl.value.trim();
  if (!inputValue) return;

  await loadAlert(inputValue);
}

function wireKeyboardShortcuts() {
  document.addEventListener("keydown", async e => {
    const hasNavigationModifier = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;

    if (hasNavigationModifier && e.key === "ArrowDown") {
      e.preventDefault();
      await moveAlertSelection("next");
      return;
    }

    if (hasNavigationModifier && e.key === "ArrowUp") {
      e.preventDefault();
      await moveAlertSelection("previous");
      return;
    }

    if (isTypingTarget(e.target)) return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlayback();
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      seekBy(-5);
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      seekBy(5);
    }
  });
}

function updateControlsUI() {
  vcPlayPauseEl.innerHTML = video1El.paused ? "&#9654;" : "&#9646;&#9646;";
  vcCurrentEl.textContent = fmtTime(video1El.currentTime);
  if (isFinite(video1El.duration)) vcSeekEl.value = video1El.currentTime;
  telemetryGraphs.updateForTime(video1El.currentTime);
}

function wireVideoSync() {
  video1El.addEventListener("timeupdate", () => {
    // Keep a fallback update path for browsers that throttle rAF heavily.
    updateControlsUI();
    snapVideo2ToVideo1();
  });

  video1El.addEventListener("loadedmetadata", () => {
    vcSeekEl.max = video1El.duration;
    vcSeekEl.value = 0;
    vcDurationEl.textContent = fmtTime(video1El.duration);
    vcCurrentEl.textContent = "0:00";
  });

  video2El.addEventListener("loadedmetadata", () => {
    video2El.currentTime = video1El.currentTime;
    if (!video1El.paused) video2El.play().catch(() => {});
  });

  video1El.addEventListener("play", () => {
    updateControlsUI();
    startControlsLoop();
    if (video2El.readyState >= 1) video2El.play().catch(() => {});
  });

  video1El.addEventListener("pause", () => {
    updateControlsUI();
    stopControlsLoop();
    if (video2El.readyState >= 1) video2El.pause();
  });

  video1El.addEventListener("ended", () => {
    updateControlsUI();
    stopControlsLoop();
    if (video2El.readyState >= 1) video2El.pause();
  });

  vcPlayPauseEl.addEventListener("click", () => {
    togglePlayback();
  });

  vcSeekEl.addEventListener("input", () => {
    seekToTime(parseFloat(vcSeekEl.value));
  });

  vcMuteEl.addEventListener("click", () => {
    video1El.muted = !video1El.muted;
    video2El.muted = video1El.muted;
    vcMuteEl.innerHTML = video1El.muted ? "&#128263;" : "&#128266;";
  });
}

// Alert loading
function applySecondVideo(detail) {
  const channel = secondVideoSelectEl.value;
  const filename = VIDEO_SECOND[channel];
  const url = getVideoUrl(detail, filename);
  setVideo(video2El, url);
  box2LabelEl.textContent = capitalize(channel);
}

async function loadAlert(alertId) {
  const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`);
  if (!res.ok) throw new Error(`Failed to load alert: ${alertId}`);

  activeDetail = await res.json();
  syncCurrentAlertIndex(activeDetail.alertId);
  renderAlertIndexBadge();
  alertIdInputEl.value = activeDetail.alertId;

  setVideo(video1El, getVideoUrl(activeDetail, FIRST_VIDEO));
  applySecondVideo(activeDetail);
  updateRigidVideoFrameHeight();
  telemetryGraphs.initFromMetadata(parseMetadataText(activeDetail.metadataText || ""), video1El.currentTime || 0);
  await refreshAnnotators();
}

async function refreshAlerts() {
  const res = await fetch("/api/alerts");
  if (!res.ok) throw new Error("Failed to load alert list");

  const payload = await res.json();
  dataDirInputEl.value = payload.dataDir || "";
  availableAlertIds = Array.isArray(payload.alerts)
    ? payload.alerts.map(alert => alert.alertId).filter(Boolean)
    : [];
  if (activeDetail?.alertId) syncCurrentAlertIndex(activeDetail.alertId);
  else currentAlertIndex = -1;
  renderAlertIndexBadge();
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
    availableAlertIds = [];
    currentAlertIndex = -1;
    renderAlertIndexBadge();
    setVideo(video1El, null);
    setVideo(video2El, null);
    destroyAnnotators();
    telemetryGraphs.destroy();
  }
}

async function init() {
  initStages();
  wireVideoSync();
  wireKeyboardShortcuts();

  const payload = await refreshAlerts();
  if ((payload.alerts || []).length > 0) {
    await loadAlert(payload.alerts[0].alertId);
  }
}

// Events
loadBtnEl.addEventListener("click", async () => {
  await submitAlertInput().catch(err => console.error(err));
});

if (copyAlertIdsBtnEl) {
  copyAlertIdsBtnEl.addEventListener("click", () => {
    copyAlertIds();
  });
}

applyDataDirBtnEl.addEventListener("click", () => {
  applyDataDir().catch(err => console.error(err));
});

dataDirInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") applyDataDir().catch(err => console.error(err));
});

alertIdInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitAlertInput().catch(err => console.error(err));
  }
});

secondVideoSelectEl.addEventListener("change", () => {
  if (!activeDetail) return;
  applySecondVideo(activeDetail);
  refreshAnnotators().catch(err => console.error(err));
});

annotationsToggleEl.addEventListener("change", () => {
  annotationsEnabled = annotationsToggleEl.checked;
  refreshAnnotators().catch(err => console.error(err));
});

if (telemetrySmoothSliderEl) {
  telemetrySmoothSliderEl.addEventListener("input", e => {
    telemetryGraphs.applySmoothingByIndex(e.target.value);
  });
}

init().catch(err => console.error("Init failed:", err));
