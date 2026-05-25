chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return; // Only target the parent address bar navigation

  const url = new URL(details.url);
  const hostname = url.hostname.replace("www.", "");

  // Fetch the custom array of target elements
  chrome.storage.local.get(["blockedSites"], (result) => {
    const blockedSites = result.blockedSites || [];
    
    // Check if the current hostname or its parent matches the blocklist
    const matchedSite = blockedSites.find(site => hostname === site || hostname.endsWith("." + site));

    if (matchedSite) {
      chrome.storage.local.get([`whitelist_${matchedSite}`], (wlResult) => {
        const allowedUntil = wlResult[`whitelist_${matchedSite}`];
        const currentTime = Date.now();

        if (!allowedUntil || currentTime > allowedUntil) {
          // Pass both the destination and the exact pattern matched to the UI parameters
          const frictionPageUrl = chrome.runtime.getURL(
            `friction.html?target=${encodeURIComponent(details.url)}&site=${encodeURIComponent(matchedSite)}`
          );
          chrome.tabs.update(details.tabId, { url: frictionPageUrl });
        }
      });
    }
  });
});

// Alarm Listener remains universal
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith("lock_")) {
    const siteToLock = alarm.name.replace("lock_", "");
    chrome.storage.local.remove(`whitelist_${siteToLock}`);
  }
});