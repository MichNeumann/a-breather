document.addEventListener("DOMContentLoaded", () => {
    const masterToggle = document.getElementById("master-toggle");
    const strictToggle = document.getElementById("strict-toggle");
    const siteInput = document.getElementById("site-input");
    const addBtn = document.getElementById("add-btn");
    const siteListContainer = document.getElementById("site-list");

    // New Slider Elements
    const breathSlider = document.getElementById("breath-slider");
    const breathCountLabel = document.getElementById("breath-count");

    // 1. Load configuration on startup
    chrome.storage.local.get(["extensionActive", "strictMode", "blockedSites", "breathCycles"], (result) => {
        masterToggle.checked = result.extensionActive ?? true;
        strictToggle.checked = result.strictMode || false;
        renderSites(result.blockedSites || []);

        // Set slider value (default to 1 cycle if not configured yet)
        const savedCycles = result.breathCycles ?? 1;
        breathSlider.value = savedCycles;
        updateSliderLabel(savedCycles);

        setTimeout(() => {
            document.body.classList.remove("preload");
        }, 50);
    });

    // 2. Save Configuration Changes
    masterToggle.addEventListener("change", (e) => {
        chrome.storage.local.set({ extensionActive: e.target.checked });
    });

    strictToggle.addEventListener("change", (e) => {
        chrome.storage.local.set({ strictMode: e.target.checked });
    });

    // Save slider changes instantly as the user drags
    breathSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        updateSliderLabel(val);
        chrome.storage.local.set({ breathCycles: val });
    });

    function updateSliderLabel(value) {
        breathCountLabel.textContent = `${value} ${value === 1 ? 'Breath Cycle' : 'Breath Cycles'}`;
    }

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