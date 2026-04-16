const envelope = document.getElementById("envelope");
const tearZone = document.getElementById("tearZone");
const openBtn = document.getElementById("openBtn");
const instruction = document.getElementById("instruction");

const tearTrack = document.createElement("div");
tearTrack.className = "tear-track";
envelope.appendChild(tearTrack);

let isPointerDown = false;
let isTorn = false;
let furthestProgress = 0;

function setInstruction(text) {
  instruction.textContent = text;
}

function updateTearProgress(clientX) {
  if (isTorn) return;
  const rect = tearZone.getBoundingClientRect();
  const withinBand = clientX >= rect.left && clientX <= rect.right;
  if (!withinBand) return;

  const progress = Math.max(
    0,
    Math.min(1, (clientX - rect.left) / Math.max(1, rect.width))
  );
  furthestProgress = Math.max(furthestProgress, progress);
  tearTrack.style.transform = `scaleX(${furthestProgress})`;

  if (furthestProgress >= 0.96) {
    isTorn = true;
    envelope.classList.add("torn");
    openBtn.disabled = false;
    tearZone.style.pointerEvents = "none";
    setInstruction("Perfect. Now click to open your envelope.");
  }
}

tearZone.addEventListener("pointerdown", (event) => {
  if (isTorn) return;
  isPointerDown = true;
  tearZone.setPointerCapture(event.pointerId);
  updateTearProgress(event.clientX);
});

tearZone.addEventListener("pointermove", (event) => {
  if (!isPointerDown || isTorn) return;
  updateTearProgress(event.clientX);
});

tearZone.addEventListener("pointerup", () => {
  isPointerDown = false;
});

tearZone.addEventListener("pointercancel", () => {
  isPointerDown = false;
});

openBtn.addEventListener("click", () => {
  if (!isTorn) return;
  envelope.classList.add("opened");
  openBtn.disabled = true;
  setInstruction("Happy Birthday, Mom! Open heart, open card.");
});
