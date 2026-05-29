document.addEventListener("DOMContentLoaded", () => {
    // Master Card State Elements
    const masterToggle = document.getElementById("master-toggle");
    const masterActiveView = document.getElementById("master-active-view");
    const masterCrankView = document.getElementById("master-crank-view");
    const masterSnoozeView = document.getElementById("master-snooze-view");
    const masterCountdownView = document.getElementById("master-countdown-view");
    const snoozeCountdownText = document.getElementById("snooze-countdown-text");
    const resumeBtn = document.getElementById("resume-btn");
    const cancelSnoozeBtn = document.getElementById("cancel-snooze-btn");

    // Crank Visual Components
    const crankContainer = document.getElementById("crank-container");
    const crankInnerMask = document.getElementById("crank-inner-mask");
    const crankHandle = document.getElementById("crank-handle");
    const crankAbortBtn = document.getElementById("crank-abort-btn");

    // Options Dashboard Panels
    const strictToggle = document.getElementById("strict-toggle");
    const siteInput = document.getElementById("site-input");
    const addBtn = document.getElementById("add-btn");
    const siteListContainer = document.getElementById("site-list");
    const breathSlider = document.getElementById("breath-slider");
    const breathCountLabel = document.getElementById("breath-count");

    let countdownInterval = null;

    // Hidden Labor Mechanics tracking metrics
    let isCranking = false;
    let lastAngle = null;
    let accumulatedRotationDegrees = 0;
    const TARGET_ROTATIONS = 200; // Keeping your hardcore setting!
    const TARGET_DEGREES = TARGET_ROTATIONS * 360;

    function switchMasterView(viewName) {
        masterActiveView.style.display = viewName === "active" ? "flex" : "none";
        masterCrankView.style.display = viewName === "crank" ? "flex" : "none";
        masterSnoozeView.style.display = viewName === "snooze" ? "flex" : "none";
        masterCountdownView.style.display = viewName === "countdown" ? "flex" : "none";
    }

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

    // 1. Initialize Configuration States
    chrome.storage.local.get(["extensionActive", "extensionDisabledUntil", "strictMode", "blockedSites", "breathCycles"], (result) => {
        const isActive = result.extensionActive ?? true;
        const disabledUntil = result.extensionDisabledUntil;

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

    // 2. State Actions: Handle Master Switch Flick
    masterToggle.addEventListener("change", (e) => {
        if (!e.target.checked) {
            switchMasterView("crank");
            accumulatedRotationDegrees = 0;
            lastAngle = null;
            crankHandle.style.transform = `rotate(0deg)`;
            crankContainer.style.background = `#e2e8f0`;
            crankInnerMask.style.backgroundColor = "#f8fafc"; // Reset inner core color
        }
    });

    // Precision Anti-Cheat Mechanical Crank Engine
    crankContainer.addEventListener("mousedown", (e) => {
        isCranking = true;

        const rect = crankContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        if (distanceFromCenter < 66) {
            crankContainer.style.cursor = "not-allowed";
            crankInnerMask.style.backgroundColor = "#fee2e2"; 
            lastAngle = null;
        } else {
            crankContainer.style.cursor = "grabbing";
            lastAngle = Math.atan2(dy, dx);
        }

        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
        if (!isCranking) return;

        const rect = crankContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;

        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        const MIN_RADIUS = 66; 

        if (distanceFromCenter < MIN_RADIUS) {
            crankContainer.style.cursor = "not-allowed";
            crankInnerMask.style.backgroundColor = "#fee2e2";
            lastAngle = null;
            return;
        }

        crankContainer.style.cursor = "grabbing";
        crankInnerMask.style.backgroundColor = "#f8fafc"; 

        const currentAngle = Math.atan2(dy, dx);

        if (lastAngle !== null) {
            let delta = currentAngle - lastAngle;

            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < -Math.PI) delta += 2 * Math.PI;

            accumulatedRotationDegrees += Math.abs(delta * (180 / Math.PI));

            crankHandle.style.transform = `rotate(${accumulatedRotationDegrees}deg)`;

            const fillPercentage = Math.min(100, (accumulatedRotationDegrees / TARGET_DEGREES) * 100);
            crankContainer.style.background = `conic-gradient(#2563eb 0%, #2563eb ${fillPercentage}%, #e2e8f0 ${fillPercentage}%, #e2e8f0 100%)`;

            if (accumulatedRotationDegrees >= TARGET_DEGREES) {
                isCranking = false;
                crankContainer.style.cursor = "grab";
                switchMasterView("snooze");
                chrome.storage.local.set({ extensionActive: false });
            }
        }
        lastAngle = currentAngle;
    });

    window.addEventListener("mouseup", () => {
        if (isCranking) {
            isCranking = false;
            crankContainer.style.cursor = "grab";
            crankInnerMask.style.backgroundColor = "#f8fafc";
            lastAngle = null;
        }
    });

    crankAbortBtn.addEventListener("click", () => {
        isCranking = false;
        masterToggle.checked = true;
        switchMasterView("active");
        chrome.storage.local.set({ extensionActive: true });
    });

    // Pill selections
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

    strictToggle.addEventListener("change", (e) => {
        chrome.storage.local.set({ strictMode: e.target.checked });
    });

    breathSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        updateSliderLabel(val);
        chrome.storage.local.set({ breathCycles: val });
    });

    function updateSliderLabel(value) {
        breathCountLabel.textContent = `${value} ${value === 1 ? 'Breath Cycle' : 'Breath Cycles'}`;
    }

    // 3. Add Custom Domain Items via Input Click Hook
    addBtn.addEventListener("click", () => {
        let rawUrl = siteInput.value.trim().toLowerCase();
        if (!rawUrl) return;

        try {
            if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
                rawUrl = 'https://' + rawUrl;
            }
            let hostname = new URL(rawUrl).hostname.replace("www.", "");

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

    siteInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") addBtn.click();
    });

    // 4. Render Active Domains list
    function renderSites(sites) {
        siteListContainer.innerHTML = "";
        if (sites.length === 0) {
            siteListContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:0.85rem; margin-top:10px;">No sites blocked yet.</div>`;
            return;
        }

        sites.forEach(site => {
            const row = document.createElement("div");
            row.className = "site-item";
            row.innerHTML = `<span>${site}</span><button class="delete-btn" data-site="${site}">Remove</button>`;
            siteListContainer.appendChild(row);
        });

        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const siteToRemove = e.target.getAttribute("data-site");
                chrome.storage.local.get(["blockedSites"], (result) => {
                    const sites = result.blockedSites || [];
                    const updatedSites = sites.filter(s => s !== siteToRemove);
                    chrome.storage.local.set({ blockedSites: updatedSites }, () => { renderSites(updatedSites); });
                });
            });
        });
    }

    // 5. ADDED: Active Tab Grace Timer Countdown Engine
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url) return;

        try {
            let currentUrl = new URL(tabs[0].url);
            let domain = currentUrl.hostname.replace("www.", "");
            const storageKey = `whitelist_${domain}`;

            chrome.storage.local.get(["blockedSites", storageKey], (res) => {
                const blockedSites = res.blockedSites || [];
                const allowedUntil = res[storageKey];

                // If the user is viewing a blocked site that has a running grace token
                if (blockedSites.includes(domain) && allowedUntil && allowedUntil > Date.now()) {
                    const container = document.getElementById("grace-timer-container");
                    const countdownLabel = document.getElementById("grace-timer-countdown");
                    
                    container.style.display = "block"; // Turn on the banner

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
            // Fails silently on local configurations (like chrome://extensions)
        }
    });
});