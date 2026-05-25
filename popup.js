document.addEventListener("DOMContentLoaded", () => {
    const strictToggle = document.getElementById("strict-toggle");
    const siteInput = document.getElementById("site-input");
    const addBtn = document.getElementById("add-btn");
    const siteListContainer = document.getElementById("site-list");

    // 1. Load configuration on startup
    chrome.storage.local.get(["strictMode", "blockedSites"], (result) => {
        strictToggle.checked = result.strictMode || false;
        renderSites(result.blockedSites || []);
    });

    // 2. Save Strict Mode Configuration Changes
    strictToggle.addEventListener("change", (e) => {
        chrome.storage.local.set({ strictMode: e.target.checked });
    });

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
});