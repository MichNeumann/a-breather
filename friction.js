document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("status-text");
  const circle = document.getElementById("circle");
  const choicesPanel = document.getElementById("choices");
  const closeTabBtn = document.getElementById("close-tab-btn");

  const urlParams = new URLSearchParams(window.location.search);
  const targetUrl = urlParams.get("target");
  const matchedSite = urlParams.get("site") || "youtube.com";

  // Fetch the configured breath cycles from storage before initializing the loop
  chrome.storage.local.get(["breathCycles"], (result) => {
    const totalCycles = result.breathCycles ?? 1; 
    let currentCycle = 0;

    function executeBreathingEngine() {
      // If we have completed all assigned cycles, break the loop and transition to the menu
      if (currentCycle >= totalCycles) {
        statusText.innerText = "Intentional Choice";
        circle.style.animation = "none"; 
        circle.style.transform = "scale(1)";
        circle.style.opacity = "0.1";
        choicesPanel.classList.add("visible");
        return;
      }

      // Phase A: Inhale (Starts at the beginning of each 8s loop)
      statusText.innerText = `Breathe in... (Cycle ${currentCycle + 1}/${totalCycles})`;
      
      // Phase B: Exhale (Triggers exactly halfway through the CSS scale animation at 4s)
      setTimeout(() => {
        if (currentCycle < totalCycles) {
          statusText.innerText = "And let it out...";
        }
      }, 4000);

      // Phase C: Cycle Completion (Triggers at 8s to progress the index forward)
      setTimeout(() => {
        currentCycle++;
        executeBreathingEngine(); // Recursive call for the next cycle
      }, 8000);
    }

    // Fire up the engine!
    executeBreathingEngine();
  });

  // Time Option Selection Handlers
  document.querySelectorAll(".time-btn").forEach(button => {
    button.addEventListener("click", (e) => {
      const minutes = parseInt(e.target.getAttribute("data-minutes"), 10);
      const whitelistExpiration = Date.now() + (minutes * 60 * 1000);

      const storageKey = `whitelist_${matchedSite}`;
      const storageData = {};
      storageData[storageKey] = whitelistExpiration;

      chrome.storage.local.set(storageData, () => {
        chrome.alarms.create(`lock_${matchedSite}`, { delayInMinutes: minutes });
        window.location.href = targetUrl || `https://${matchedSite}`;
      });
    });
  });

  closeTabBtn.addEventListener("click", () => { window.close(); });
});