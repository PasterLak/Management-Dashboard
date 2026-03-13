const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const apiBaseEl = document.getElementById("apiBase");
const statusEl = document.getElementById("status");
const ipComboEl = document.getElementById("ipCombo");
const ipDropdownEl = document.getElementById("ipDropdown");
const ipDropdownBtnEl = document.getElementById("ipDropdownBtn");

const STORAGE_KEY = "pinecone_game_api_history";
const LAST_IP_KEY = "pinecone_game_api_last";
const LEGACY_STORAGE_KEY = "pinecone_ip_history";
const LEGACY_LAST_IP_KEY = "pinecone_last_ip";
const MAX_IP_HISTORY = 20;

let ipHistory = [];

const network = new NetworkManager();
const game = new GameManager(
    document.getElementById("renderCanvas"),
    document.getElementById("ui-layer")
);

function loadIpHistory() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const lastIp = localStorage.getItem(LAST_IP_KEY);
    const legacyHistory = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
    const legacyLastIp = localStorage.getItem(LEGACY_LAST_IP_KEY);

    const normalizeGameApi = (value) => {
        const v = (value || "").trim();
        if (!v) return "";
        if (v.endsWith(":80")) return `${v.slice(0, -3)}:8082`;
        if (/^https?:\/\/[^/:]+$/.test(v)) return `${v}:8082`;
        return v;
    };

    ipHistory = Array.isArray(history)
        ? [...new Set(history.map(ip => (ip || "").trim()).filter(Boolean))]
        : [];

    if (ipHistory.length === 0 && Array.isArray(legacyHistory)) {
        ipHistory = [...new Set(legacyHistory.map(normalizeGameApi).filter(Boolean))].slice(0, MAX_IP_HISTORY);
        if (ipHistory.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ipHistory));
        }
    }

    renderIpDropdown();

    const normalizedLastIp = normalizeGameApi(lastIp || legacyLastIp || "");

    if (normalizedLastIp) {
        apiBaseEl.value = normalizedLastIp;
        localStorage.setItem(LAST_IP_KEY, normalizedLastIp);
    } else if (ipHistory.length > 0) {
        apiBaseEl.value = ipHistory[0];
    } else {
        apiBaseEl.value = "http://localhost:8082";
    }
}

function persistHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ipHistory));
}

function hideIpDropdown() {
    ipDropdownEl.classList.add("hidden");
}

function showIpDropdown() {
    ipDropdownEl.classList.remove("hidden");
}

function renderIpDropdown() {
    ipDropdownEl.innerHTML = "";

    if (ipHistory.length === 0) {
        const empty = document.createElement("div");
        empty.className = "ip-empty";
        empty.textContent = "Keine gespeicherten IPs";
        ipDropdownEl.appendChild(empty);
        return;
    }

    ipHistory.forEach((ip) => {
        const row = document.createElement("div");
        row.className = "ip-item";

        const selectBtn = document.createElement("button");
        selectBtn.type = "button";
        selectBtn.className = "ip-item-select";
        selectBtn.textContent = ip;
        selectBtn.addEventListener("click", () => {
            apiBaseEl.value = ip;
            hideIpDropdown();
            apiBaseEl.focus();
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "ip-item-remove";
        removeBtn.setAttribute("aria-label", `IP löschen: ${ip}`);
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", () => {
            ipHistory = ipHistory.filter((entry) => entry !== ip);
            persistHistory();

            if (localStorage.getItem(LAST_IP_KEY) === ip) {
                if (ipHistory.length > 0) {
                    localStorage.setItem(LAST_IP_KEY, ipHistory[0]);
                } else {
                    localStorage.removeItem(LAST_IP_KEY);
                }
            }

            renderIpDropdown();
        });

        row.appendChild(selectBtn);
        row.appendChild(removeBtn);
        ipDropdownEl.appendChild(row);
    });
}

function saveIp(ip) {
    const normalizedIp = (ip || "").trim();
    if (!normalizedIp) return;

    ipHistory = [normalizedIp, ...ipHistory.filter(entry => entry !== normalizedIp)].slice(0, MAX_IP_HISTORY);
    persistHistory();
    localStorage.setItem(LAST_IP_KEY, normalizedIp);
    renderIpDropdown();
}

network.onStatus = (text, isConnected) => {
    statusEl.textContent = text;
    statusEl.className = `status-badge ${isConnected ? 'connected' : 'disconnected'}`;
    connectBtn.style.display = isConnected ? "none" : "";
    disconnectBtn.style.display = isConnected ? "" : "none";
};

network.onData = (data) => {
    game.applyState(data);
};

game.onScoreResetRequest = (playerId) => {
    network.resetScore(playerId);
};

network.onConnectionLost = () => {
    game.removeAllPlayers();
    game.removeAllCones();
};

connectBtn.addEventListener("click", () => {
    const ip = apiBaseEl.value.trim();
    if (ip) {
        saveIp(ip);
        network.connect(ip);
    }
});

disconnectBtn.addEventListener("click", () => {
    network.disconnect();
    game.removeAllPlayers();
    game.removeAllCones();
});

ipDropdownBtnEl.addEventListener("click", () => {
    if (ipDropdownEl.classList.contains("hidden")) {
        showIpDropdown();
        return;
    }
    hideIpDropdown();
});

document.addEventListener("click", (event) => {
    if (!ipComboEl.contains(event.target)) {
        hideIpDropdown();
    }
});

apiBaseEl.addEventListener("focus", () => {
    showIpDropdown();
});

loadIpHistory();

function updateUiBarHeightVar() {
    const uiBar = document.getElementById('ui-bar');
    if (!uiBar) return;
    const h = uiBar.offsetHeight;
    document.documentElement.style.setProperty('--ui-bar-height', `${h}px`);
}

const uiBarEl = document.getElementById('ui-bar');
if (uiBarEl && window.ResizeObserver) {
    const ro = new ResizeObserver(() => updateUiBarHeightVar());
    ro.observe(uiBarEl);
  
    updateUiBarHeightVar();
  
    window.addEventListener('resize', updateUiBarHeightVar);
} else {
   
    document.documentElement.style.setProperty('--ui-bar-height', '88px');
}