(function () {
    function getStickySubmit(form) {
        const sticky = form.querySelector(".mobile-sticky-submit");
        if (!sticky) return null;

        const style = window.getComputedStyle(sticky);
        if (style.display === "none" || style.visibility === "hidden") {
            return null;
        }

        return sticky;
    }

    function revealField(form, field, behavior) {
        if (!field?.scrollIntoView) return;

        const sticky = getStickySubmit(form);
        field.scrollIntoView({
            behavior: behavior || "auto",
            block: sticky ? "center" : "nearest",
            inline: "nearest",
        });

        if (!sticky) return;

        const fieldRect = field.getBoundingClientRect();
        const stickyRect = sticky.getBoundingClientRect();
        const minimumGap = 16;

        if (fieldRect.bottom > stickyRect.top - minimumGap) {
            const overlap = fieldRect.bottom - (stickyRect.top - minimumGap);
            window.scrollBy({
                top: overlap,
                behavior: behavior || "auto",
            });
        }
    }

    function focusField(form, field, behavior) {
        if (!field?.focus) return;

        try {
            field.focus({ preventScroll: true });
        } catch (_error) {
            field.focus();
        }

        revealField(form, field, behavior);
    }

    function getFirstInvalidField(form) {
        return form.querySelector(".is-invalid");
    }

    document.querySelectorAll("form").forEach((form) => {
        const summary = form.querySelector("[data-form-error-summary]");
        if (!summary) return;

        summary.querySelectorAll("[data-error-target]").forEach((link) => {
            link.addEventListener("click", (event) => {
                const targetId = link.dataset.errorTarget;
                const field = targetId ? document.getElementById(targetId) : null;
                event.preventDefault();

                if (!field || !form.contains(field)) return;

                focusField(form, field, "smooth");
            });
        });

        const firstInvalidField = getFirstInvalidField(form);
        if (!firstInvalidField) return;

        requestAnimationFrame(() => {
            focusField(form, firstInvalidField, "auto");
        });
    });
})();
