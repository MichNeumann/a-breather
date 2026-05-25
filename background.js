chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;

  const url = new URL(details.url);
  const hostname = url.hostname.replace("www.", "");

  // Fetch BOTH the master switch state and the custom block list
  chrome.storage.local.get(["extensionActive", "blockedSites"], (result) => {
    const isExtensionActive = result.extensionActive ?? true; // Defaults to true
    const blockedSites = result.blockedSites || [];

    // IF the master switch is toggled OFF, drop out instantly and allow navigation
    if (!isExtensionActive) return;

    const matchedSite = blockedSites.find(site => hostname === site || hostname.endsWith("." + site));

    if (matchedSite) {
      chrome.storage.local.get([`whitelist_${matchedSite}`], (wlResult) => {
        const allowedUntil = wlResult[`whitelist_${matchedSite}`];
        const currentTime = Date.now();

        if (!allowedUntil || currentTime > allowedUntil) {
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