// Visible boot screen + runtime error reporting so startup failures never look like an empty page.
const boot = document.createElement("div");
boot.id = "boot-status";
boot.textContent = "INTERSTELLA // INITIALIZING SYSTEMS";
document.body.appendChild(boot);

window.addEventListener("error", (event) => {
  showBootError("Runtime error", event.message || "Unknown startup error");
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  showBootError("Startup error", reason instanceof Error ? reason.message : String(reason));
});

function showBootError(title: string, detail: string) {
  const box = document.getElementById("boot-error") || document.createElement("section");
  box.id = "boot-error";
  box.innerHTML = '<div class="boot-error-card"><div class="boot-error-kicker">INTERSTELLA // SYSTEM ALERT</div><h1>' +
    title.replace(/[<>]/g, "") + '</h1><p>The game could not finish loading. Refresh the page, and check that dependencies have installed.</p><code></code><button id="boot-retry">RETRY INITIALIZATION</button></div>';
  const code = box.querySelector("code");
  if (code) code.textContent = detail;
  document.body.appendChild(box);
  document.getElementById("boot-retry")?.addEventListener("click", () => location.reload());
}

import("./main3d").then(() => {
  boot.remove();
}).catch((error: unknown) => {
  showBootError("Unable to start game", error instanceof Error ? error.stack || error.message : String(error));
});
