(() => {
    const triggers = Array.from(document.querySelectorAll("[data-calendar-popover-trigger]"));
    if (!triggers.length || !window.bootstrap?.Popover) {
        return;
    }

    const instances = new Map();
    let activeTrigger = null;

    function hideAll(exceptTrigger = null) {
        for (const [trigger, popover] of instances.entries()) {
            if (trigger === exceptTrigger) {
                continue;
            }
            popover.hide();
            trigger.setAttribute("aria-expanded", "false");
        }

        if (!exceptTrigger) {
            activeTrigger = null;
        }
    }

    for (const trigger of triggers) {
        const templateId = trigger.dataset.calendarPopoverId;
        const title = trigger.dataset.calendarPopoverTitle || "";
        const template = templateId ? document.getElementById(templateId) : null;
        const content = template?.innerHTML?.trim();

        if (!content) {
            continue;
        }

        trigger.setAttribute("aria-expanded", "false");

        const popover = new window.bootstrap.Popover(trigger, {
            container: "body",
            customClass: "calendar-classic-bs-popover",
            content,
            html: true,
            placement: "auto",
            sanitize: false,
            title,
            trigger: "manual",
        });

        instances.set(trigger, popover);

        trigger.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = activeTrigger === trigger && trigger.getAttribute("aria-expanded") === "true";
            if (isOpen) {
                popover.hide();
                trigger.setAttribute("aria-expanded", "false");
                activeTrigger = null;
                return;
            }

            hideAll(trigger);
            popover.show();
            trigger.setAttribute("aria-expanded", "true");
            activeTrigger = trigger;
        });
    }

    document.addEventListener("click", (event) => {
        const clickedTrigger = event.target.closest("[data-calendar-popover-trigger]");
        const clickedPopover = event.target.closest(".popover");
        if (clickedTrigger || clickedPopover) {
            return;
        }

        hideAll();
    });

    window.addEventListener("resize", () => hideAll());

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }

        hideAll();
    });
})();
