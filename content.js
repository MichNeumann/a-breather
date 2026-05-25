let monitorInterval = null;
const hostname = window.location.hostname.replace("www.", "");

chrome.storage.local.get(["blockedSites", "strictMode"], (result) => {
  const blockedSites = result.blockedSites || [];
  const isStrictMode = result.strictMode ?? false;

  if (!isStrictMode) return; // Abort immediately if user turned off strict mode in popup

  const matchedSite = blockedSites.find(site => hostname === site || hostname.endsWith("." + site));
  if (!matchedSite) return; // Silent abort if not on an active blocked domain

  const storageKey = `whitelist_${matchedSite}`;

  monitorInterval = setInterval(() => {
    chrome.storage.local.get([storageKey, "strictMode"], (res) => {
      const allowedUntil = res[storageKey];
      const strictStillOn = res.strictMode ?? false;
      const currentTime = Date.now();

      if (strictStillOn && (!allowedUntil || currentTime > allowedUntil)) {
        clearInterval(monitorInterval);
        const frictionPageUrl = chrome.runtime.getURL(
          `friction.html?target=${encodeURIComponent(window.location.href)}&site=${encodeURIComponent(matchedSite)}`
        );
        window.location.href = frictionPageUrl;
      }
    });
  }, 2000);
});