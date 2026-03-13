class NetworkManager {
    constructor() {
        this.socket = null;
        this.onData = null;
        this.onStatus = null;
        this.onConnectionLost = null;
        this.lastMessageAt = 0;
        this.watchdog = null;
    }

    connect(baseUrl) {
        this.disconnect();

        let normalizedBase = baseUrl.replace(/\/+$/, "");

        try {
            const parsed = new URL(normalizedBase);
            if (!parsed.port) {
                parsed.port = "8082";
            }
            if (parsed.port === "80") {
                parsed.port = "8082";
            }
            normalizedBase = parsed.origin;
        } catch (e) {
           
        }

        try {
            this.socket = io(normalizedBase, {
                transports: ["polling"]
            });

            this.updateStatus("Connecting...", false);

            this.socket.on("connect", () => {
                this.lastMessageAt = Date.now();
                this.startWatchdog();
                this.updateStatus("Connected", true);
            });

            this.socket.on("disconnect", () => {
                this.stopWatchdog();
                this.updateStatus("Disconnected", false);
                if (this.onConnectionLost) this.onConnectionLost();
            });

            this.socket.on("connect_error", () => {
                this.stopWatchdog();
                this.updateStatus("Error / Disconnected", false);
                if (this.onConnectionLost) this.onConnectionLost();
            });

            this.socket.on("state_snapshot", (data) => {
                this.lastMessageAt = Date.now();
                if (this.onData) this.onData(data);
            });

            this.socket.on("state_update", (data) => {
                this.lastMessageAt = Date.now();
                if (this.onData) this.onData(data);
            });
        } catch (e) {
            this.updateStatus("Connection Failed", false);
            if (this.onConnectionLost) this.onConnectionLost();
        }
    }

    disconnect() {
        this.stopWatchdog();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.updateStatus("Disconnected", false);
    }

    resetScore(playerId) {
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit("reset_score", { playerId });
    }

    startWatchdog() {
        this.stopWatchdog();
        this.watchdog = setInterval(() => {
            if (!this.socket || !this.socket.connected) return;
            if (!this.lastMessageAt) return;

            if (Date.now() - this.lastMessageAt > 3000) {
                this.updateStatus("Server timeout", false);
                this.disconnect();
            }
        }, 1000);
    }

    stopWatchdog() {
        if (!this.watchdog) return;
        clearInterval(this.watchdog);
        this.watchdog = null;
    }

    updateStatus(text, isConnected) {
        if (this.onStatus) this.onStatus(text, isConnected);
    }
}