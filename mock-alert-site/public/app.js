import { VideoAnnotator } from "/repo/src/markrEdge/annotations/video-annotator.js";

// 0.mp4 = outward (box 1), 1.mp4 = inward, 8.mp4 = DMS
const FIRST_VIDEO = "0.mp4";
const VIDEO_SECOND = { inward: "1.mp4", dms: "8.mp4" };

const TELEMETRY_MAX_POINTS = 1200;
const TELEMETRY_PLAYHEAD_FPS = 24;

// DOM refs
const dataDirInputEl = document.querySelector("#data-dir-input");
const applyDataDirBtnEl = document.querySelector("#apply-data-dir-btn");
const alertIdInputEl = document.querySelector("#alert-id-input");
const secondVideoSelectEl = document.querySelector("#second-video-select");
const loadBtnEl = document.querySelector("#load-btn");
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

const telemetryLaneChartEl = document.querySelector("#telemetry-lane-chart");
const telemetryInertialChartEl = document.querySelector("#telemetry-inertial-chart");
const telemetryLaneValueEl = document.querySelector("#telemetry-lane-value");
const telemetryLateralValueEl = document.querySelector("#telemetry-lateral-value");
const telemetryDrivingValueEl = document.querySelector("#telemetry-driving-value");
const telemetrySmoothSliderEl = document.querySelector("#telemetry-smooth-slider");
const telemetrySmoothValueEl = document.querySelector("#telemetry-smooth-value");

// State
let activeDetail = null;
let annotationsEnabled = false;
let stage1 = null;
let stage2 = null;
let annotator1 = null;
let annotator2 = null;
let annotationInitToken = 0;

let telemetryModel = null;
let laneChart = null;
let inertialChart = null;
let lastTelemetryDrawMs = 0;
let playheadRafId = null;
let pendingPlayheadTime = 0;
let controlsRafId = null;
const SMOOTHING_WINDOWS = [1, 3, 5, 9, 15, 25];
let smoothedAccYByWindow = null;
let smoothedAccZByWindow = null;

function drawPlayhead(t) {
  if (laneChart && window.Plotly) {
    window.Plotly.relayout(telemetryLaneChartEl, {
      "shapes[0].x0": t,
      "shapes[0].x1": t,
    });
  }
  if (inertialChart && window.Plotly) {
    window.Plotly.relayout(telemetryInertialChartEl, {
      "shapes[0].x0": t,
      "shapes[0].x1": t,
    });
  }
}

function schedulePlayheadDraw(t) {
  pendingPlayheadTime = t;
  if (playheadRafId !== null) return;
  playheadRafId = requestAnimationFrame(() => {
    playheadRafId = null;
    drawPlayhead(pendingPlayheadTime);
  });
}

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

function fmtSigned(value, digits = 3) {
  if (!Number.isFinite(value)) return "--";
  const normalized = Math.abs(value) < 1e-6 ? 0 : value;
  const sign = normalized < 0 ? "-" : "+";
  return `${sign}${Math.abs(normalized).toFixed(digits)}`;
}

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

// Telemetry helpers
function normalizeSeries(points, startEpochMs) {
  if (!Array.isArray(points)) return [];
  return points
    .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map(([t, v]) => ({ x: (t - startEpochMs) / 1000, y: v }));
}

function downsampleSeries(series, maxPoints = TELEMETRY_MAX_POINTS) {
  if (!Array.isArray(series) || series.length <= maxPoints) return series || [];
  const step = Math.ceil(series.length / maxPoints);
  const out = [];
  for (let i = 0; i < series.length; i += step) out.push(series[i]);
  if (out[out.length - 1] !== series[series.length - 1]) out.push(series[series.length - 1]);
  return out;
}

function smoothSeriesY(series, windowSize) {
  if (!Array.isArray(series) || !series.length || windowSize <= 1) {
    return (series || []).map(p => p.y);
  }

  const size = Math.max(1, Math.floor(windowSize));
  const half = Math.floor(size / 2);
  const y = series.map(p => p.y);
  const out = new Array(y.length);

  for (let i = 0; i < y.length; i += 1) {
    const start = Math.max(0, i - half);
    const end = Math.min(y.length - 1, i + half);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= end; j += 1) {
      sum += y[j];
      count += 1;
    }
    out[i] = count > 0 ? sum / count : y[i];
  }

  return out;
}

function parseAccelerometerSeries(sensorMetaData, startEpochMs) {
  if (!Array.isArray(sensorMetaData)) return { accY: [], accZ: [] };

  const accY = [];
  const accZ = [];
  for (const entry of sensorMetaData) {
    if (!entry?.accelerometer) continue;
    const values = String(entry.accelerometer).trim().split(/\s+/);
    if (values.length < 4) continue;

    const y = parseFloat(values[1]);
    const z = parseFloat(values[2]);
    const t = parseInt(values[3], 10);
    if (!Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(t)) continue;

    const x = (t - startEpochMs) / 1000;
    accY.push({ x, y });
    accZ.push({ x, y: z });
  }

  return { accY, accZ };
}

function getPilOffset(metadata) {
  const laneCalParams = metadata?.inference_data?.observations_data?.laneCalibrationParams;
  if (!Array.isArray(laneCalParams) || laneCalParams.length < 4) return 0;

  const CANONICAL_OUTWARD_IMAGE_WIDTH = 1920;
  const CANONICAL_OUTWARD_IMAGE_HEIGHT = 1080;

  let [vanishingPointEstimate, _unused, xInt, imageHeight] = laneCalParams;
  if (!Array.isArray(vanishingPointEstimate) || !Array.isArray(xInt) || !imageHeight) return 0;

  const scale = CANONICAL_OUTWARD_IMAGE_HEIGHT / imageHeight;
  vanishingPointEstimate = vanishingPointEstimate.map(x => x * scale);
  xInt = xInt.map(x => x * scale);

  const laneLeft = xInt[0] / CANONICAL_OUTWARD_IMAGE_WIDTH;
  const laneRight = xInt[1] / CANONICAL_OUTWARD_IMAGE_WIDTH;
  const vpX = vanishingPointEstimate[0] / CANONICAL_OUTWARD_IMAGE_WIDTH;
  const laneWidth = laneRight - laneLeft;
  if (!Number.isFinite(laneWidth) || laneWidth === 0) return 0;

  const laneMid = (laneLeft + laneRight) / 2;
  return (laneMid - vpX) / laneWidth;
}

function extractMinEpochMs(metadata, positionsInLane) {
  const candidates = [];

  if (Array.isArray(positionsInLane)) {
    for (const row of positionsInLane) {
      if (Array.isArray(row) && Number.isFinite(row[0])) candidates.push(row[0]);
    }
  }

  const sensorMetaData = metadata?.sensorMetaData;
  if (Array.isArray(sensorMetaData)) {
    for (const entry of sensorMetaData) {
      if (!entry?.accelerometer) continue;
      const values = String(entry.accelerometer).trim().split(/\s+/);
      if (values.length < 4) continue;
      const t = parseInt(values[3], 10);
      if (Number.isFinite(t)) candidates.push(t);
    }
  }

  return candidates.length ? Math.min(...candidates) : null;
}

function computeMaxX(model) {
  const allSeries = [model.laneSeries, model.accY, model.accZ];
  let maxX = 0;
  for (const series of allSeries) {
    if (!Array.isArray(series) || !series.length) continue;
    const last = series[series.length - 1];
    if (Number.isFinite(last?.x) && last.x > maxX) maxX = last.x;
  }
  return Math.max(1, Math.round(maxX));
}

function buildTelemetryModel(metadata) {
  if (!metadata || typeof metadata !== "object") return null;

  const positionsInLane = metadata?.inference_data?.observations_data?.positionsInLane || [];
  const metadataStart = Number(metadata.startTime);
  const startEpochMs = Number.isFinite(metadataStart)
    ? metadataStart
    : (extractMinEpochMs(metadata, positionsInLane) ?? Date.now());
  const pilOffset = getPilOffset(metadata);

  const laneSeries = downsampleSeries(
    normalizeSeries(
      positionsInLane.map(([t, v]) => [t, (Number(v) || 0) + pilOffset]),
      startEpochMs,
    ),
  );

  const rawInertial = parseAccelerometerSeries(metadata?.sensorMetaData, startEpochMs);
  const accY = downsampleSeries(rawInertial.accY);
  const accZ = downsampleSeries(rawInertial.accZ);

  if (!laneSeries.length && !accY.length && !accZ.length) return null;

  const model = { laneSeries, accY, accZ };
  model.xMax = computeMaxX(model);
  return model;
}

function destroyTelemetryCharts() {
  if (playheadRafId !== null) {
    cancelAnimationFrame(playheadRafId);
    playheadRafId = null;
  }
  if (window.Plotly) {
    if (laneChart) window.Plotly.purge(telemetryLaneChartEl);
    if (inertialChart) window.Plotly.purge(telemetryInertialChartEl);
  }
  laneChart = null;
  inertialChart = null;
}

function computeRobustYRange(seriesList, fallbackMin, fallbackMax) {
  const values = [];
  for (const series of seriesList) {
    if (!Array.isArray(series)) continue;
    for (const p of series) {
      if (Number.isFinite(p?.y)) values.push(p.y);
    }
  }

  if (!values.length) return { min: fallbackMin, max: fallbackMax };

  values.sort((a, b) => a - b);
  const p = q => values[Math.min(values.length - 1, Math.max(0, Math.floor((values.length - 1) * q)))];
  const q02 = p(0.02);
  const q98 = p(0.98);

  const span = Math.max(0.1, q98 - q02);
  const pad = span * 0.15;
  let min = q02 - pad;
  let max = q98 + pad;

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return { min: fallbackMin, max: fallbackMax };
  }

  // Keep range sane even with weird spikes.
  min = Math.max(min, fallbackMin * 4);
  max = Math.min(max, fallbackMax * 4);
  if (min >= max) return { min: fallbackMin, max: fallbackMax };

  return { min, max };
}

function plotLayout(yLabel, xMax = 1, yMin = undefined, yMax = undefined) {
  return {
    paper_bgcolor: "#171b28",
    plot_bgcolor: "#171b28",
    margin: { l: 48, r: 14, t: 8, b: 34 },
    showlegend: true,
    legend: {
      orientation: "h",
      x: 0,
      y: 1.12,
      font: { color: "#dde1ef", size: 10 },
    },
    xaxis: {
      title: { text: "Time (s)", font: { color: "#8b92b8", size: 11 } },
      range: [0, xMax],
      color: "#8b92b8",
      gridcolor: "rgba(255,255,255,0.05)",
      zeroline: false,
    },
    yaxis: {
      title: { text: yLabel, font: { color: "#8b92b8", size: 11 } },
      range: [yMin, yMax],
      color: "#8b92b8",
      gridcolor: "rgba(255,255,255,0.05)",
      zeroline: false,
    },
    shapes: [{
      type: "line",
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 1,
      yref: "paper",
      line: { color: "#f39c12", width: 1 },
    }],
  };
}

function initTelemetryCharts(metadata) {
  destroyTelemetryCharts();
  telemetryModel = buildTelemetryModel(metadata);
  smoothedAccYByWindow = null;
  smoothedAccZByWindow = null;

  telemetryLaneValueEl.textContent = "PIL: --";
  telemetryLateralValueEl.textContent = "Acc Y: --";
  telemetryDrivingValueEl.textContent = "Acc Z: --";
  if (telemetrySmoothSliderEl) {
    telemetrySmoothSliderEl.disabled = true;
    telemetrySmoothSliderEl.value = "0";
  }
  if (telemetrySmoothValueEl) telemetrySmoothValueEl.textContent = "1";

  if (!telemetryModel || !window.Plotly) return;

  const laneRange = computeRobustYRange([telemetryModel.laneSeries], -1.5, 1.5);
  const inertialRange = computeRobustYRange([telemetryModel.accY, telemetryModel.accZ], -10, 10);

  const laneTrace = {
    type: "scattergl",
    mode: "lines",
    name: "PIL Corrected",
    x: telemetryModel.laneSeries.map(p => p.x),
    y: telemetryModel.laneSeries.map(p => p.y),
    line: { color: "#d59a7c", width: 2 },
    hovertemplate: "t=%{x:.2f}s<br>PIL=%{y:.4f}<extra></extra>",
  };

  const accYTrace = {
    type: "scattergl",
    mode: "lines",
    name: "Acc Y (Lateral)",
    x: telemetryModel.accY.map(p => p.x),
    y: telemetryModel.accY.map(p => p.y),
    line: { color: "#2ecc71", width: 1.8 },
    hovertemplate: "t=%{x:.2f}s<br>AccY=%{y:.4f}<extra></extra>",
  };

  const accZTrace = {
    type: "scattergl",
    mode: "lines",
    name: "Acc Z (Driving)",
    x: telemetryModel.accZ.map(p => p.x),
    y: telemetryModel.accZ.map(p => p.y),
    line: { color: "#e74c3c", width: 1.8 },
    hovertemplate: "t=%{x:.2f}s<br>AccZ=%{y:.4f}<extra></extra>",
  };

  smoothedAccYByWindow = Object.fromEntries(
    SMOOTHING_WINDOWS.map(w => [w, smoothSeriesY(telemetryModel.accY, w)]),
  );
  smoothedAccZByWindow = Object.fromEntries(
    SMOOTHING_WINDOWS.map(w => [w, smoothSeriesY(telemetryModel.accZ, w)]),
  );
  const inertialLayout = plotLayout("Acceleration", telemetryModel.xMax, inertialRange.min, inertialRange.max);

  const cfg = { displayModeBar: false, responsive: true, staticPlot: false };
  window.Plotly.react(
    telemetryLaneChartEl,
    [laneTrace],
    plotLayout("Lane Offset", telemetryModel.xMax, laneRange.min, laneRange.max),
    cfg,
  );
  window.Plotly.react(
    telemetryInertialChartEl,
    [accYTrace, accZTrace],
    inertialLayout,
    cfg,
  );

  laneChart = true;
  inertialChart = true;

  if (telemetrySmoothSliderEl) {
    telemetrySmoothSliderEl.max = String(SMOOTHING_WINDOWS.length - 1);
    telemetrySmoothSliderEl.value = "0";
    telemetrySmoothSliderEl.disabled = false;
  }
  if (telemetrySmoothValueEl) telemetrySmoothValueEl.textContent = String(SMOOTHING_WINDOWS[0]);

  updateTelemetryAtCurrentTime(true);
}

function applyInertialSmoothingByIndex(index) {
  if (!inertialChart || !window.Plotly || !smoothedAccYByWindow || !smoothedAccZByWindow) return;

  const idx = Math.max(0, Math.min(SMOOTHING_WINDOWS.length - 1, Number(index) || 0));
  const w = SMOOTHING_WINDOWS[idx];
  if (telemetrySmoothValueEl) telemetrySmoothValueEl.textContent = String(w);

  window.Plotly.restyle(
    telemetryInertialChartEl,
    { y: [smoothedAccYByWindow[w], smoothedAccZByWindow[w]] },
    [0, 1],
  );
}

function interpolateSeries(series, tSec) {
  if (!Array.isArray(series) || !series.length || !Number.isFinite(tSec)) return null;
  if (tSec <= series[0].x) return series[0].y;
  if (tSec >= series[series.length - 1].x) return series[series.length - 1].y;

  let lo = 0;
  let hi = series.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (series[mid].x < tSec) lo = mid + 1;
    else hi = mid - 1;
  }

  const right = series[Math.max(1, lo)];
  const left = series[Math.max(0, lo - 1)];
  const span = right.x - left.x;
  if (span <= 0) return right.y;
  const ratio = (tSec - left.x) / span;
  return left.y + ratio * (right.y - left.y);
}

function updateTelemetryAtCurrentTime(forceDraw = false) {
  if (!telemetryModel) return;
  const t = video1El.currentTime || 0;

  const lane = interpolateSeries(telemetryModel.laneSeries, t);
  const accY = interpolateSeries(telemetryModel.accY, t);
  const accZ = interpolateSeries(telemetryModel.accZ, t);

  telemetryLaneValueEl.textContent = `PIL: ${fmtSigned(lane, 3)}`;
  telemetryLateralValueEl.textContent = `Acc Y: ${fmtSigned(accY, 3)}`;
  telemetryDrivingValueEl.textContent = `Acc Z: ${fmtSigned(accZ, 3)}`;

  const now = performance.now();
  if (!forceDraw && now - lastTelemetryDrawMs < (1000 / TELEMETRY_PLAYHEAD_FPS)) return;
  lastTelemetryDrawMs = now;

  if (forceDraw) drawPlayhead(t);
  else schedulePlayheadDraw(t);
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

function updateControlsUI() {
  vcPlayPauseEl.innerHTML = video1El.paused ? "&#9654;" : "&#9646;&#9646;";
  vcCurrentEl.textContent = fmtTime(video1El.currentTime);
  if (isFinite(video1El.duration)) vcSeekEl.value = video1El.currentTime;
  updateTelemetryAtCurrentTime();
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
    if (video1El.paused) video1El.play().catch(() => {});
    else video1El.pause();
  });

  vcSeekEl.addEventListener("input", () => {
    const t = parseFloat(vcSeekEl.value);
    video1El.currentTime = t;
    if (video2El.readyState >= 1) video2El.currentTime = t;
    updateControlsUI();
    updateTelemetryAtCurrentTime(true);
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
  alertIdInputEl.value = activeDetail.alertId;

  setVideo(video1El, getVideoUrl(activeDetail, FIRST_VIDEO));
  applySecondVideo(activeDetail);
  updateRigidVideoFrameHeight();
  initTelemetryCharts(parseMetadataText(activeDetail.metadataText || ""));
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
    destroyTelemetryCharts();
  }
}

async function init() {
  initStages();
  wireVideoSync();

  const payload = await refreshAlerts();
  if ((payload.alerts || []).length > 0) {
    await loadAlert(payload.alerts[0].alertId);
  }
}

// Events
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

alertIdInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") loadBtnEl.click();
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
    applyInertialSmoothingByIndex(e.target.value);
  });
}

init().catch(err => console.error("Init failed:", err));
