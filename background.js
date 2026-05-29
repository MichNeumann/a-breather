chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return; 

  const url = new URL(details.url);
  const hostname = url.hostname.replace("www.", "");

  // Fetch extension tracking flags
  chrome.storage.local.get(["extensionActive", "extensionDisabledUntil", "blockedSites"], (result) => {
    let isExtensionActive = result.extensionActive ?? true;
    const disabledUntil = result.extensionDisabledUntil;
    
    // Self-Healing Safeguard Check
    if (!isExtensionActive && disabledUntil && Date.now() > disabledUntil) {
      isExtensionActive = true;
      chrome.storage.local.set({ extensionActive: true });
      chrome.storage.local.remove("extensionDisabledUntil");
    }
    
    // Abort processing instantly if extension is cleanly snoozed or paused
    if (!isExtensionActive) return;

    const blockedSites = result.blockedSites || [];
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

// Update our Alarm listener array to check for both site locks and the master wake up signal
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "enable_extension") {
    chrome.storage.local.set({ extensionActive: true });
    chrome.storage.local.remove("extensionDisabledUntil");
  } else if (alarm.name.startsWith("lock_")) {
    const siteToLock = alarm.name.replace("lock_", "");
    chrome.storage.local.remove(`whitelist_${siteToLock}`);
  }
});