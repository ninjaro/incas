(() => {
    const createQrCode = (container, text, options = {}) => {
        if (!container) return;

        container.innerHTML = "";

        if (!text) {
            return;
        }

        if (typeof window.QRCode !== "function") {
            const fallback = document.createElement("div");
            fallback.className = "small text-muted";
            fallback.textContent = "QR preview unavailable.";
            container.appendChild(fallback);
            return;
        }

        new window.QRCode(container, {
            text,
            width: options.width || 192,
            height: options.height || 192,
            colorDark: options.colorDark || "#111827",
            colorLight: options.colorLight || "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.H,
        });
    };

    document.querySelectorAll("[data-qr-code]").forEach((container) => {
        const text = container.dataset.qrCode || "";
        const width = Number.parseInt(container.dataset.qrWidth || "192", 10);
        const height = Number.parseInt(container.dataset.qrHeight || "192", 10);
        createQrCode(container, text, { width, height });
    });

    const modal = document.getElementById("access-key-qr-modal");
    if (!modal) {
        return;
    }

    const qrTarget = modal.querySelector("[data-access-key-qr-target]");
    const keyTarget = modal.querySelector("[data-access-key-qr-key]");
    const stateTarget = modal.querySelector("[data-access-key-qr-state]");
    const linkTarget = modal.querySelector("[data-access-key-qr-link]");

    modal.addEventListener("show.bs.modal", (event) => {
        const trigger = event.relatedTarget;
        if (!trigger) return;

        const qrText = trigger.getAttribute("data-qr-link") || "";
        const keyText = trigger.getAttribute("data-key") || "";
        const stateText = trigger.getAttribute("data-key-state") || "";

        if (keyTarget) {
            keyTarget.textContent = keyText;
        }
        if (stateTarget) {
            stateTarget.textContent = stateText;
        }
        if (linkTarget) {
            linkTarget.href = qrText || "#";
            linkTarget.textContent = qrText;
        }

        createQrCode(qrTarget, qrText, { width: 240, height: 240, colorDark: "#111827" });
    });
})();
