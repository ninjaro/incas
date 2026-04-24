(function () {
    const mobileMedia = window.matchMedia("(max-width: 575.98px)");

    function initTandemFormSteps(form) {
        const stepper = form.querySelector("[data-tandem-stepper]");
        const sections = Array.from(form.querySelectorAll("[data-form-step]"));
        if (!stepper || !sections.length) return;

        const stepButtons = Array.from(stepper.querySelectorAll("[data-step-target]"));
        let activeSectionId = "";
        let scrollFrame = 0;

        function findSectionForElement(element) {
            return element?.closest("[data-form-step]") || null;
        }

        function setActiveSection(section) {
            if (!section || activeSectionId === section.id) return;

            activeSectionId = section.id;
            sections.forEach((candidate) => {
                candidate.classList.toggle("is-current", candidate === section);
            });

            stepButtons.forEach((button) => {
                const isCurrent = button.dataset.stepTarget === section.id;
                button.classList.toggle("is-current", isCurrent);
                if (isCurrent) {
                    button.setAttribute("aria-current", "step");
                } else {
                    button.removeAttribute("aria-current");
                }
            });
        }

        function getReferenceTop() {
            if (!mobileMedia.matches) {
                return 96;
            }

            return stepper.getBoundingClientRect().bottom + 16;
        }

        function pickVisibleSection() {
            const referenceTop = getReferenceTop();
            let bestSection = sections[0];
            let bestDistance = Number.POSITIVE_INFINITY;

            sections.forEach((section) => {
                const rect = section.getBoundingClientRect();
                const containsReference = rect.top <= referenceTop && rect.bottom >= referenceTop;
                const distance = containsReference
                    ? 0
                    : Math.min(
                        Math.abs(rect.top - referenceTop),
                        Math.abs(rect.bottom - referenceTop)
                    );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestSection = section;
                }
            });

            return bestSection;
        }

        function scheduleScrollSync() {
            if (scrollFrame) return;

            scrollFrame = window.requestAnimationFrame(() => {
                scrollFrame = 0;
                setActiveSection(pickVisibleSection());
            });
        }

        function scrollToSection(section) {
            if (!section) return;

            setActiveSection(section);
            section.scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "nearest",
            });
        }

        function setActiveFromHash() {
            if (!window.location.hash) return false;

            const target = document.getElementById(window.location.hash.slice(1));
            const section = findSectionForElement(target);
            if (!section || !form.contains(section)) return false;

            setActiveSection(section);
            return true;
        }

        stepButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const section = document.getElementById(button.dataset.stepTarget);
                if (section && form.contains(section)) {
                    scrollToSection(section);
                }
            });
        });

        form.querySelectorAll(".incas-tandem-step-actions [data-step-target]").forEach((button) => {
            button.addEventListener("click", () => {
                const section = document.getElementById(button.dataset.stepTarget);
                if (section && form.contains(section)) {
                    scrollToSection(section);
                }
            });
        });

        form.addEventListener("focusin", (event) => {
            const section = findSectionForElement(event.target);
            if (section) {
                setActiveSection(section);
            }
        });

        form.addEventListener("invalid", (event) => {
            const section = findSectionForElement(event.target);
            if (section) {
                setActiveSection(section);
            }
        }, true);

        window.addEventListener("scroll", scheduleScrollSync, { passive: true });
        window.addEventListener("resize", scheduleScrollSync);

        if (typeof mobileMedia.addEventListener === "function") {
            mobileMedia.addEventListener("change", scheduleScrollSync);
        } else if (typeof mobileMedia.addListener === "function") {
            mobileMedia.addListener(scheduleScrollSync);
        }

        const invalidSection = findSectionForElement(form.querySelector(".is-invalid"));
        if (!setActiveFromHash()) {
            setActiveSection(invalidSection || sections[0]);
        }

        scheduleScrollSync();
    }

    document.querySelectorAll(".incas-tandem-form").forEach((form) => {
        initTandemFormSteps(form);
    });
})();
