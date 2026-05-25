document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("status-text");
  const circle = document.getElementById("circle");
  const choicesPanel = document.getElementById("choices");
  const closeTabBtn = document.getElementById("close-tab-btn");

  const urlParams = new URLSearchParams(window.location.search);
  const targetUrl = urlParams.get("target");
  const matchedSite = urlParams.get("site") || "youtube.com"; // Dynamic fallback configuration

  setTimeout(() => { statusText.innerText = "And let it out..."; }, 4000);

  setTimeout(() => {
    statusText.innerText = "Intentional Choice";
    circle.style.animation = "none";
    circle.style.transform = "scale(1)";
    circle.style.opacity = "0.1";
    choicesPanel.classList.add("visible");
  }, 8000);

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