const TELEMETRY_MAX_POINTS = 1200;
const TELEMETRY_PLAYHEAD_FPS = 24;
const SMOOTHING_WINDOWS = [1, 3, 5, 7, 9, 11];
const DEFAULT_SMOOTHING_INDEX = Math.max(0, SMOOTHING_WINDOWS.indexOf(7));

function fmtSigned(value, digits = 3) {
  if (!Number.isFinite(value)) return "--";
  const normalized = Math.abs(value) < 1e-6 ? 0 : value;
  const sign = normalized < 0 ? "-" : "+";
  return `${sign}${Math.abs(normalized).toFixed(digits)}`;
}

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

export function createTelemetryGraphs({
  laneChartEl,
  inertialChartEl,
  laneValueEl,
  lateralValueEl,
  drivingValueEl,
  smoothSliderEl,
  smoothValueEl,
}) {
  let telemetryModel = null;
  let laneChart = null;
  let inertialChart = null;
  let lastTelemetryDrawMs = 0;
  let playheadRafId = null;
  let pendingPlayheadTime = 0;
  let smoothedAccYByWindow = null;
  let smoothedAccZByWindow = null;

  function setTelemetryValues(lane, accY, accZ) {
    if (laneValueEl) laneValueEl.textContent = `PIL: ${fmtSigned(lane, 3)}`;
    if (lateralValueEl) lateralValueEl.textContent = `Acc Y: ${fmtSigned(accY, 3)}`;
    if (drivingValueEl) drivingValueEl.textContent = `Acc Z: ${fmtSigned(accZ, 3)}`;
  }

  function drawPlayhead(t) {
    if (laneChart && window.Plotly && laneChartEl) {
      window.Plotly.relayout(laneChartEl, {
        "shapes[0].x0": t,
        "shapes[0].x1": t,
      });
    }
    if (inertialChart && window.Plotly && inertialChartEl) {
      window.Plotly.relayout(inertialChartEl, {
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

  function destroy() {
    if (playheadRafId !== null) {
      cancelAnimationFrame(playheadRafId);
      playheadRafId = null;
    }
    if (window.Plotly) {
      if (laneChart && laneChartEl) window.Plotly.purge(laneChartEl);
      if (inertialChart && inertialChartEl) window.Plotly.purge(inertialChartEl);
    }
    laneChart = null;
    inertialChart = null;
    telemetryModel = null;
    smoothedAccYByWindow = null;
    smoothedAccZByWindow = null;
    setTelemetryValues(null, null, null);
    if (smoothSliderEl) {
      smoothSliderEl.disabled = true;
      smoothSliderEl.value = String(DEFAULT_SMOOTHING_INDEX);
    }
    if (smoothValueEl) smoothValueEl.textContent = String(SMOOTHING_WINDOWS[DEFAULT_SMOOTHING_INDEX]);
  }

  function initFromMetadata(metadata, initialTimeSec = 0) {
    destroy();

    telemetryModel = buildTelemetryModel(metadata);
    if (!telemetryModel || !window.Plotly || !laneChartEl || !inertialChartEl) return;

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

    const cfg = { displayModeBar: false, responsive: true, staticPlot: false };
    window.Plotly.react(
      laneChartEl,
      [laneTrace],
      plotLayout("Lane Offset", telemetryModel.xMax, laneRange.min, laneRange.max),
      cfg,
    );
    window.Plotly.react(
      inertialChartEl,
      [accYTrace, accZTrace],
      plotLayout("Acceleration", telemetryModel.xMax, inertialRange.min, inertialRange.max),
      cfg,
    );

    laneChart = true;
    inertialChart = true;

    if (smoothSliderEl) {
      smoothSliderEl.max = String(SMOOTHING_WINDOWS.length - 1);
      smoothSliderEl.value = String(DEFAULT_SMOOTHING_INDEX);
      smoothSliderEl.disabled = false;
    }
    if (smoothValueEl) smoothValueEl.textContent = String(SMOOTHING_WINDOWS[DEFAULT_SMOOTHING_INDEX]);

    applySmoothingByIndex(DEFAULT_SMOOTHING_INDEX);

    updateForTime(initialTimeSec, true);
  }

  function applySmoothingByIndex(index) {
    if (!inertialChart || !window.Plotly || !smoothedAccYByWindow || !smoothedAccZByWindow || !inertialChartEl) return;

    const idx = Math.max(0, Math.min(SMOOTHING_WINDOWS.length - 1, Number(index) || 0));
    const w = SMOOTHING_WINDOWS[idx];
    if (smoothValueEl) smoothValueEl.textContent = String(w);

    window.Plotly.restyle(
      inertialChartEl,
      { y: [smoothedAccYByWindow[w], smoothedAccZByWindow[w]] },
      [0, 1],
    );
  }

  function updateForTime(tSec, forceDraw = false) {
    if (!telemetryModel) return;

    const lane = interpolateSeries(telemetryModel.laneSeries, tSec);
    const accY = interpolateSeries(telemetryModel.accY, tSec);
    const accZ = interpolateSeries(telemetryModel.accZ, tSec);
    setTelemetryValues(lane, accY, accZ);

    const now = performance.now();
    if (!forceDraw && now - lastTelemetryDrawMs < (1000 / TELEMETRY_PLAYHEAD_FPS)) return;
    lastTelemetryDrawMs = now;

    if (forceDraw) drawPlayhead(tSec);
    else schedulePlayheadDraw(tSec);
  }

  return {
    destroy,
    initFromMetadata,
    applySmoothingByIndex,
    updateForTime,
  };
}
