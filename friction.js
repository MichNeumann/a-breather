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
      if (currentCycle >= totalCycles) {
        statusText.innerText = "Intentional Choice";
        circle.style.animation = "none";
        circle.style.transform = "scale(1)";
        circle.style.opacity = "0.1";
        choicesPanel.classList.add("visible");
        return;
      }

      // Step 1: Inhale (0s to 4s)
      statusText.innerText = `Breathe in... (Box ${currentCycle + 1}/${totalCycles})`;

      // Step 2: Hold Breath Full (4s to 8s)
      setTimeout(() => {
        if (currentCycle < totalCycles) statusText.innerText = "Hold it...";
      }, 4000);

      // Step 3: Exhale (8s to 12s)
      setTimeout(() => {
        if (currentCycle < totalCycles) statusText.innerText = "Breathe out slowly...";
      }, 8000);

      // Step 4: Hold Breath Empty (12s to 16s)
      setTimeout(() => {
        if (currentCycle < totalCycles) statusText.innerText = "Hold empty...";
      }, 12000);

      // Step 5: Complete 16s Cycle Loop
      setTimeout(() => {
        currentCycle++;
        executeBreathingEngine();
      }, 16000);
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