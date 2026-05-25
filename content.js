let monitorInterval = null;
const hostname = window.location.hostname.replace("www.", "");

chrome.storage.local.get(["extensionActive", "blockedSites", "strictMode"], (result) => {
  const isExtensionActive = result.extensionActive ?? true;
  const blockedSites = result.blockedSites || [];
  const isStrictMode = result.strictMode ?? false;

  // Abort entirely if the extension is disabled OR strict mode is off
  if (!isExtensionActive || !isStrictMode) return;

  const matchedSite = blockedSites.find(site => hostname === site || hostname.endsWith("." + site));
  if (!matchedSite) return;

  const storageKey = `whitelist_${matchedSite}`;

  monitorInterval = setInterval(() => {
    // Add extensionActive to our regular interval verification checks
    chrome.storage.local.get(["extensionActive", storageKey, "strictMode"], (res) => {
      const currentActive = res.extensionActive ?? true;
      const allowedUntil = res[storageKey];
      const strictStillOn = res.strictMode ?? false;
      const currentTime = Date.now();

      // If master switch was flipped to OFF while sitting on the page, clear interval and stay
      if (!currentActive) {
        clearInterval(monitorInterval);
        return;
      }

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