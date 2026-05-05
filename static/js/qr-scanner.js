(() => {
    const roots = Array.from(document.querySelectorAll("[data-qr-scanner-root]"));
    if (!roots.length) {
        return;
    }

    const ACCESS_UNLOCK_PATH = "/admin/unlock";
    const EVENT_REGISTRATION_PATH = "/event-registrations/";
    const APP_ID_RE = /^APP-[A-F0-9]{8}$/i;

    function classifyDecodedText(rawText) {
        const text = String(rawText || "").trim();
        if (!text) {
            return {
                label: "Unknown",
                message: "No usable QR text was detected.",
            };
        }

        try {
            const parsed = new URL(text, window.location.origin);
            if (parsed.pathname === ACCESS_UNLOCK_PATH && parsed.searchParams.get("phrase")) {
                return {
                    label: "Access key unlock link",
                    message: "This QR code points to an INCAS admin unlock URL.",
                };
            }

            if (parsed.pathname.startsWith(EVENT_REGISTRATION_PATH)) {
                return {
                    label: "Event registration link",
                    message: "This QR code points to a public event registration status page.",
                };
            }
        } catch (_error) {
            // Ignore URL parse failures and continue with plain-text checks.
        }

        if (APP_ID_RE.test(text)) {
            return {
                label: "Event registration ID",
                message: "This looks like an INCAS registration application ID.",
            };
        }

        return {
            label: "Raw QR text",
            message: "The scanner decoded text, but it does not match a known INCAS QR format.",
        };
    }

    async function detectSupport() {
        if (typeof window.BarcodeDetector !== "function") {
            return false;
        }

        if (typeof window.BarcodeDetector.getSupportedFormats !== "function") {
            return true;
        }

        try {
            const formats = await window.BarcodeDetector.getSupportedFormats();
            return formats.includes("qr_code");
        } catch (_error) {
            return false;
        }
    }

    roots.forEach(async (root) => {
        const supportBadge = root.querySelector("[data-qr-support-badge]");
        const video = root.querySelector("[data-qr-video]");
        const placeholder = root.querySelector("[data-qr-placeholder]");
        const startButton = root.querySelector("[data-qr-start-camera]");
        const stopButton = root.querySelector("[data-qr-stop-camera]");
        const fileInput = root.querySelector("[data-qr-file-input]");
        const statusElement = root.querySelector("[data-qr-status]");
        const resultRoot = root.querySelector("[data-qr-result]");
        const resultText = root.querySelector("[data-qr-result-text]");
        const resultMessage = root.querySelector("[data-qr-result-message]");
        const loginInput = document.getElementById(root.dataset.qrLoginInput || "");
        const resolveEndpoint = root.dataset.qrResolveEndpoint || "";
        const mode = root.dataset.qrScannerMode || "demo";

        const supported = await detectSupport();
        if (supportBadge) {
            supportBadge.className = `badge ${supported ? "text-bg-success" : "text-bg-secondary"}`;
            supportBadge.textContent = supported ? "QR scan supported" : "QR scan fallback only";
        }

        let detector = null;
        let stream = null;
        let loopTimer = 0;
        let busy = false;

        function setStatus(text, isError = false) {
            if (!statusElement) {
                return;
            }

            statusElement.textContent = text;
            statusElement.classList.toggle("text-danger", isError);
        }

        function setPreviewState(isCameraActive) {
            video?.classList.toggle("d-none", !isCameraActive);
            placeholder?.classList.toggle("d-none", isCameraActive);
            startButton?.classList.toggle("d-none", isCameraActive);
            stopButton?.classList.toggle("d-none", !isCameraActive);
        }

        function setResult(text, message) {
            if (resultText) {
                resultText.textContent = text;
            }
            if (resultMessage) {
                resultMessage.textContent = message;
            }
            if (resultRoot) {
                resultRoot.hidden = false;
            }
        }

        async function stopCamera() {
            if (loopTimer) {
                window.clearTimeout(loopTimer);
                loopTimer = 0;
            }

            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                stream = null;
            }

            if (video) {
                video.pause();
                video.srcObject = null;
            }

            setPreviewState(false);
        }

        async function handleDecodedText(rawText) {
            const text = String(rawText || "").trim();
            if (!text) {
                setStatus("A QR code was found, but it did not contain readable text.", true);
                return;
            }

            const classification = classifyDecodedText(text);
            setResult(text, `${classification.label}: ${classification.message}`);
            setStatus("QR code decoded.");

            await stopCamera();

            if (mode === "login") {
                try {
                    const parsed = new URL(text, window.location.origin);
                    if (parsed.origin === window.location.origin && parsed.pathname === ACCESS_UNLOCK_PATH) {
                        window.location.assign(parsed.toString());
                        return;
                    }
                } catch (_error) {
                    // Ignore URL parse failures and try the input fallback.
                }

                if (loginInput) {
                    loginInput.value = text;
                    loginInput.focus();
                    setStatus("Decoded text inserted into the access field. Submit to continue.");
                }
                return;
            }

            if (mode === "resolve" && resolveEndpoint) {
                setStatus("Resolving QR target…");
                try {
                    const response = await fetch(resolveEndpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                        body: JSON.stringify({ code: text }),
                    });
                    const payload = await response.json();
                    if (!response.ok || !payload.ok || !payload.target_url) {
                        setStatus(payload.message || "This QR code could not be resolved.", true);
                        if (payload.message) {
                            setResult(text, payload.message);
                        }
                        return;
                    }

                    setResult(text, payload.message || "QR target resolved.");
                    window.location.assign(payload.target_url);
                } catch (_error) {
                    setStatus("The QR target could not be resolved.", true);
                }
            }
        }

        async function detectFromSource(source) {
            if (!supported) {
                setStatus("This browser does not support QR decoding in the scanner prototype.", true);
                return;
            }

            if (!detector) {
                detector = new window.BarcodeDetector({ formats: ["qr_code"] });
            }

            const barcodes = await detector.detect(source);
            const first = barcodes.find((item) => item.rawValue || item.rawText);
            if (!first) {
                throw new Error("No QR code found.");
            }

            await handleDecodedText(first.rawValue || first.rawText || "");
        }

        async function readSelectedFile(file) {
            if (!file) {
                return;
            }

            setStatus("Reading uploaded image…");
            try {
                const bitmap = await createImageBitmap(file);
                try {
                    await detectFromSource(bitmap);
                } finally {
                    bitmap.close?.();
                }
            } catch (_error) {
                setStatus("No QR code could be read from the uploaded image.", true);
            }
        }

        async function scanLoop() {
            if (!stream || !video || busy) {
                loopTimer = window.setTimeout(scanLoop, 350);
                return;
            }

            if (video.readyState < 2) {
                loopTimer = window.setTimeout(scanLoop, 350);
                return;
            }

            busy = true;
            try {
                await detectFromSource(video);
            } catch (_error) {
                loopTimer = window.setTimeout(scanLoop, 350);
            } finally {
                busy = false;
            }
        }

        async function startCamera() {
            if (!supported) {
                setStatus("Camera scanning is not available in this browser.", true);
                return;
            }

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                    },
                    audio: false,
                });
            } catch (_error) {
                setStatus("Camera access was denied or is unavailable.", true);
                return;
            }

            if (!video) {
                return;
            }

            video.srcObject = stream;
            await video.play();
            setPreviewState(true);
            setStatus("Scanning camera feed…");
            scanLoop();
        }

        startButton?.addEventListener("click", () => {
            startCamera();
        });

        stopButton?.addEventListener("click", () => {
            stopCamera();
            setStatus("Camera stopped.");
        });

        fileInput?.addEventListener("change", (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }
            readSelectedFile(file);
            event.target.value = "";
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                stopCamera();
            }
        });
    });
})();
