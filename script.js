const envelope = document.getElementById("envelope");
const tearZone = document.getElementById("tearZone");
const flapHandle = document.getElementById("flapHandle");
const instruction = document.getElementById("instruction");
const seamProgress = document.getElementById("seamProgress");
const scene = document.getElementById("scene");
const card = document.getElementById("card");
const peekabooImage = document.getElementById("peekabooImage");
const peekabooLane = document.getElementById("peekabooLane");
const envelopeBody = document.getElementById("envelopeBody");

const PHASE = {
  TEAR: "tear",
  LIFT: "lift",
  REVEAL: "reveal",
  DONE: "done",
};

let phase = PHASE.TEAR;
let tearPointerActive = false;
let tearPointerId = null;
let lastPointerX = 0;
let tearAmount = 0;

let flapPointerActive = false;
let flapPointerId = null;
let flapStartY = 0;
let flapBaseProgress = 0;
let flapProgress = 0;
let seamTotalLength = 0;
let peekSyncRaf = null;
let peekSyncUntil = 0;

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { distance: Number.POSITIVE_INFINITY, t: 0 };

  const tRaw = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, tRaw));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dist = Math.hypot(px - projX, py - projY);
  return { distance: dist, t };
}

function getSeamProgressAtPointer(clientX, clientY) {
  const rect = envelopeBody.getBoundingClientRect();
  const p1x = rect.left + 0.01 * rect.width;
  const p1y = rect.top + 0.01 * rect.height;
  const p2x = rect.left + 0.5 * rect.width;
  const p2y = rect.top + 0.64 * rect.height;
  const p3x = rect.left + 0.99 * rect.width;
  const p3y = rect.top + 0.01 * rect.height;

  const left = distanceToSegment(clientX, clientY, p1x, p1y, p2x, p2y);
  const right = distanceToSegment(clientX, clientY, p2x, p2y, p3x, p3y);
  const best = left.distance <= right.distance ? "left" : "right";
  const seamLeftLengthPx = Math.hypot(p2x - p1x, p2y - p1y);
  const seamRightLengthPx = Math.hypot(p3x - p2x, p3y - p2y);
  const seamFullLengthPx = seamLeftLengthPx + seamRightLengthPx;

  const distance = best === "left" ? left.distance : right.distance;
  if (distance > 26) return null;

  if (best === "left") {
    return (left.t * seamLeftLengthPx) / seamFullLengthPx;
  }

  return (seamLeftLengthPx + right.t * seamRightLengthPx) / seamFullLengthPx;
}

function setSeamProgress(value) {
  const clamped = Math.max(0, Math.min(1, value));
  tearAmount = clamped;
  seamProgress.style.strokeDashoffset = String((1 - clamped) * seamTotalLength);
}

function updatePeekabooTarget() {
  if (!scene || !card || !peekabooImage || !peekabooLane) return;
  const envelopeRect = envelope.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const anchorFromEnvelopeTop = cardRect.bottom - envelopeRect.top;
  peekabooLane.style.top = `${anchorFromEnvelopeTop}px`;
}

function runPeekAnchorSync(durationMs) {
  if (!peekabooLane) return;
  peekSyncUntil = performance.now() + durationMs;
  if (peekSyncRaf !== null) {
    cancelAnimationFrame(peekSyncRaf);
  }

  const tick = () => {
    updatePeekabooTarget();
    if (performance.now() < peekSyncUntil) {
      peekSyncRaf = requestAnimationFrame(tick);
    } else {
      peekSyncRaf = null;
    }
  };

  peekSyncRaf = requestAnimationFrame(tick);
}

function setInstruction(text) {
  instruction.textContent = text;
}

function setFlapProgress(value) {
  flapProgress = Math.max(0, Math.min(1, value));
  envelope.style.setProperty("--flap-open", flapProgress.toFixed(3));
}

function completeTear() {
  if (phase !== PHASE.TEAR) return;
  phase = PHASE.LIFT;
  tearZone.style.pointerEvents = "none";
  envelope.classList.add("torn");
  setInstruction("Now drag the flap upward to pull it open.");
}

function completeFlapLift() {
  if (phase !== PHASE.LIFT) return;
  phase = PHASE.REVEAL;
  setFlapProgress(1);
  envelope.classList.add("flap-open");
  setInstruction("Opening your letter...");

  window.setTimeout(() => {
    envelope.classList.add("revealed");
    runPeekAnchorSync(4200);
    window.setTimeout(() => {
      updatePeekabooTarget();
      scene.classList.add("peekaboo-active");
    }, 3000);
    setInstruction("Happy Birthday, Mom.");
    phase = PHASE.DONE;
  }, 140);
}

function updateTearProgress(clientX, clientY) {
  if (phase !== PHASE.TEAR) return;
  const progressAtPointer = getSeamProgressAtPointer(clientX, clientY);
  if (progressAtPointer === null) return;

  const deltaX = clientX - lastPointerX;
  lastPointerX = clientX;
  if (deltaX < -8) return;

  setSeamProgress(Math.max(tearAmount, progressAtPointer));

  if (tearAmount >= 0.98) {
    completeTear();
  }
}

function updateFlapProgress(clientY) {
  if (phase !== PHASE.LIFT) return;
  const pullDistance = Math.max(0, flapStartY - clientY);
  const nextProgress = flapBaseProgress + pullDistance / 170;
  setFlapProgress(nextProgress);

  if (flapProgress >= 0.98) {
    completeFlapLift();
  }
}

tearZone.addEventListener("pointerdown", (event) => {
  if (phase !== PHASE.TEAR) return;
  tearPointerActive = true;
  tearPointerId = event.pointerId;
  lastPointerX = event.clientX;
  updateTearProgress(event.clientX, event.clientY);
  tearZone.setPointerCapture(event.pointerId);
});

tearZone.addEventListener("pointermove", (event) => {
  if (!tearPointerActive || phase !== PHASE.TEAR) return;
  updateTearProgress(event.clientX, event.clientY);
});

tearZone.addEventListener("pointerup", () => {
  tearPointerActive = false;
  tearPointerId = null;
  lastPointerX = 0;
});

tearZone.addEventListener("pointercancel", () => {
  tearPointerActive = false;
  tearPointerId = null;
  lastPointerX = 0;
});

flapHandle.addEventListener("pointerdown", (event) => {
  if (phase !== PHASE.LIFT) return;
  flapPointerActive = true;
  flapPointerId = event.pointerId;
  flapStartY = event.clientY;
  flapBaseProgress = flapProgress;
  flapHandle.setPointerCapture(event.pointerId);
});

flapHandle.addEventListener("pointermove", (event) => {
  if (!flapPointerActive || phase !== PHASE.LIFT) return;
  updateFlapProgress(event.clientY);
});

flapHandle.addEventListener("pointerup", () => {
  flapPointerActive = false;
  flapPointerId = null;
});

flapHandle.addEventListener("pointercancel", () => {
  flapPointerActive = false;
  flapPointerId = null;
});

window.addEventListener("pointerup", (event) => {
  if (tearPointerId !== null && event.pointerId === tearPointerId) {
    tearPointerActive = false;
    tearPointerId = null;
    lastPointerX = 0;
  }

  if (flapPointerId !== null && event.pointerId === flapPointerId) {
    flapPointerActive = false;
    flapPointerId = null;
  }
});

const seamGuideLength = seamProgress.getTotalLength();
seamTotalLength = seamGuideLength;
seamProgress.style.strokeDasharray = String(seamTotalLength);
setSeamProgress(0);

if (peekabooImage) {
  peekabooImage.src = `assets/mom-peek.png?cb=${Date.now()}`;
}

updatePeekabooTarget();

window.addEventListener("resize", () => {
  updatePeekabooTarget();
});
