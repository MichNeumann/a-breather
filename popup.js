document.addEventListener("DOMContentLoaded", () => {
    // Master Card State Elements
    const masterToggle = document.getElementById("master-toggle");
    const masterActiveView = document.getElementById("master-active-view");
    const masterSnoozeView = document.getElementById("master-snooze-view");
    const masterCountdownView = document.getElementById("master-countdown-view");
    const snoozeCountdownText = document.getElementById("snooze-countdown-text");
    const resumeBtn = document.getElementById("resume-btn");
    const cancelSnoozeBtn = document.getElementById("cancel-snooze-btn");

    // Other Existing Elements
    const strictToggle = document.getElementById("strict-toggle");
    const siteInput = document.getElementById("site-input");
    const addBtn = document.getElementById("add-btn");
    const siteListContainer = document.getElementById("site-list");
    const breathSlider = document.getElementById("breath-slider");
    const breathCountLabel = document.getElementById("breath-count");

    let countdownInterval = null;

    // Helper helper to handle UI component swaps cleanly
    function switchMasterView(viewName) {
        masterActiveView.style.display = viewName === "active" ? "flex" : "none";
        masterSnoozeView.style.display = viewName === "snooze" ? "flex" : "none";
        masterCountdownView.style.display = viewName === "countdown" ? "flex" : "none";
    }

    // Live ticker engine for the master pause countdown
    function startSnoozeTicker(expirationTimestamp) {
        if (countdownInterval) clearInterval(countdownInterval);

        function updateTicker() {
            const remaining = expirationTimestamp - Date.now();
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                switchMasterView("active");
                masterToggle.checked = true;
            } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                snoozeCountdownText.textContent = `Paused: ${mins}:${secs < 10 ? '0' : ''}${secs} left`;
            }
        }
        updateTicker();
        countdownInterval = setInterval(updateTicker, 1000);
    }

    // 1. Load initial configurations from storage
    chrome.storage.local.get(["extensionActive", "extensionDisabledUntil", "strictMode", "blockedSites", "breathCycles"], (result) => {
        const isActive = result.extensionActive ?? true;
        const disabledUntil = result.extensionDisabledUntil;

        // Evaluate layout pipeline routing based on current state
        if (isActive) {
            switchMasterView("active");
            masterToggle.checked = true;
        } else if (disabledUntil && disabledUntil > Date.now()) {
            switchMasterView("countdown");
            startSnoozeTicker(disabledUntil);
        } else {
            switchMasterView("snooze");
        }

        strictToggle.checked = result.strictMode || false;
        renderSites(result.blockedSites || []);

        const savedCycles = result.breathCycles ?? 1;
        breathSlider.value = savedCycles;
        updateSliderLabel(savedCycles);

        setTimeout(() => { document.body.classList.remove("preload"); }, 50);
    });

    // 2. Action Triggers: Master Toggle Interaction
    masterToggle.addEventListener("change", (e) => {
        if (!e.target.checked) {
            // User turned off extension -> swap line view immediately to pill selections
            switchMasterView("snooze");
            chrome.storage.local.set({ extensionActive: false });
        }
    });

    // Handle Pill Selection Clicks
    document.querySelectorAll(".pill-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const minutes = parseInt(e.target.getAttribute("data-snooze"), 10);
            const expiration = Date.now() + (minutes * 60 * 1000);

            chrome.storage.local.set({
                extensionActive: false,
                extensionDisabledUntil: expiration
            }, () => {
                chrome.alarms.create("enable_extension", { delayInMinutes: minutes });
                switchMasterView("countdown");
                startSnoozeTicker(expiration);
            });
        });
    });

    // Manual Override: Re-enable early (Resume button)
    function manualReenable() {
        if (countdownInterval) clearInterval(countdownInterval);
        chrome.alarms.clear("enable_extension");
        chrome.storage.local.set({ extensionActive: true });
        chrome.storage.local.remove("extensionDisabledUntil");
        masterToggle.checked = true;
        switchMasterView("active");
    }

    resumeBtn.addEventListener("click", manualReenable);
    cancelSnoozeBtn.addEventListener("click", manualReenable);

    // Strict Mode switch
    strictToggle.addEventListener("change", (e) => {
        chrome.storage.local.set({ strictMode: e.target.checked });
    });

    // Breath slider
    breathSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        updateSliderLabel(val);
        chrome.storage.local.set({ breathCycles: val });
    });

    function updateSliderLabel(value) {
        breathCountLabel.textContent = `${value} ${value === 1 ? 'Breath Cycle' : 'Breath Cycles'}`;
    }

    // ... (Keep your exact Step 3, 3b, and 4 site management hooks at the bottom unchanged)

    // 3. Add a new customized domain
    addBtn.addEventListener("click", () => {
        let rawUrl = siteInput.value.trim().toLowerCase();
        if (!rawUrl) return;

        // Clean up input variations (removes http, https, trailing slashes, and www)
        try {
            if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
                rawUrl = 'https://' + rawUrl;
            }
            let hostname = new URL(rawUrl).hostname;
            hostname = hostname.replace("www.", "");

            chrome.storage.local.get(["blockedSites"], (result) => {
                const sites = result.blockedSites || [];
                if (!sites.includes(hostname)) {
                    sites.push(hostname);
                    chrome.storage.local.set({ blockedSites: sites }, () => {
                        renderSites(sites);
                        siteInput.value = "";
                    });
                }
            });
        } catch (e) {
            alert("Please enter a valid website domain name.");
        }
    });
    // 3b. Also trigger the add button logic when pressing the "Enter" key
    siteInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            addBtn.click(); // Programmatically trigger the click event setup above
        }
    });

    // 4. Render array items into dashboard list
    function renderSites(sites) {
        siteListContainer.innerHTML = "";
        if (sites.length === 0) {
            siteListContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:0.85rem; margin-top:10px;">No sites blocked yet.</div>`;
            return;
        }

        sites.forEach(site => {
            const row = document.createElement("div");
            row.className = "site-item";
            row.innerHTML = `
        <span>${site}</span>
        <button class="delete-btn" data-site="${site}">Remove</button>
      `;
            siteListContainer.appendChild(row);
        });

        // Bind event hooks to deletion actions
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const siteToRemove = e.target.getAttribute("data-site");
                chrome.storage.local.get(["blockedSites"], (result) => {
                    const sites = result.blockedSites || [];
                    const updatedSites = sites.filter(s => s !== siteToRemove);
                    chrome.storage.local.set({ blockedSites: updatedSites }, () => {
                        renderSites(updatedSites);
                    });
                });
            });
        });
    }

    // 5. Active Tab Grace Timer Countdown Engine
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url) return;

        try {
            // Parse out the hostname of whatever tab you are looking at right now
            let currentUrl = new URL(tabs[0].url);
            let domain = currentUrl.hostname.replace("www.", "");
            const storageKey = `whitelist_${domain}`;

            chrome.storage.local.get(["blockedSites", storageKey], (res) => {
                const blockedSites = res.blockedSites || [];
                const allowedUntil = res[storageKey];

                // Only fire if the site is actively on the blocklist AND has a valid unexpired timer running
                if (blockedSites.includes(domain) && allowedUntil && allowedUntil > Date.now()) {
                    const container = document.getElementById("grace-timer-container");
                    const countdownLabel = document.getElementById("grace-timer-countdown");

                    container.style.display = "block"; // Make the banner visible

                    const timerInterval = setInterval(() => {
                        const remainingTime = allowedUntil - Date.now();

                        if (remainingTime <= 0) {
                            clearInterval(timerInterval);
                            container.style.display = "none";
                        } else {
                            const mins = Math.floor(remainingTime / 60000);
                            const secs = Math.floor((remainingTime % 60000) / 1000);
                            countdownLabel.textContent = `${domain} (${mins}:${secs < 10 ? '0' : ''}${secs} left)`;
                        }
                    }, 1000);
                }
            });
        } catch (e) {
            // Fail silently if user opens dashboard on system pages like chrome://extensions
        }
    });
});