document.addEventListener("DOMContentLoaded", () => {
    const ADMIN_LAYOUT_STORAGE_KEY = "incas:admin-layout-mode";
    const VIEW_MODES = ["list", "grid", "table"];
    const CARD_VIEW_MODES = ["list", "grid"];

    function readViewMode(storage, fallback = "list", modes = VIEW_MODES) {
        return modes.includes(storage) ? storage : fallback;
    }

    let adminLayoutMode = readViewMode(localStorage.getItem(ADMIN_LAYOUT_STORAGE_KEY), "list");

    const hasRequestUi = document.querySelector("[data-request-results]");
    const hasMatchUi = document.querySelector("[data-match-results]");

    function getAdminLayoutContainers() {
        return Array.from(document.querySelectorAll("[data-admin-layout], [data-request-results], [data-match-results]"));
    }

    function syncAdminLayoutButtons() {
        document.querySelectorAll("[data-set-admin-layout]").forEach((button) => {
            const isActive = button.dataset.setAdminLayout === adminLayoutMode;
            button.classList.toggle("btn-primary", isActive);
            button.classList.toggle("btn-outline-secondary", !isActive);
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function applyAdminLayoutMode() {
        getAdminLayoutContainers().forEach((container) => {
            container.dataset.viewMode = adminLayoutMode;
        });

        localStorage.setItem(ADMIN_LAYOUT_STORAGE_KEY, adminLayoutMode);
        syncAdminLayoutButtons();
    }

    document.querySelectorAll("[data-set-admin-layout]").forEach((button) => {
        button.addEventListener("click", () => {
            adminLayoutMode = readViewMode(button.dataset.setAdminLayout, "list");
            applyAdminLayoutMode();
            window.dispatchEvent(new CustomEvent("admin-layout-change", {
                detail: { viewMode: adminLayoutMode },
            }));
        });
    });

    applyAdminLayoutMode();

    if (hasRequestUi) {
        const REQUEST_VIEW_MODE_STORAGE_KEY = "incas:tandem-request-view-mode";
        const REQUEST_DENSITY_STORAGE_KEY = "incas:tandem-request-density";
        const OVERVIEW_DENSITY_STORAGE_KEY = "incas:tandem-overview-density";
        const hasRequestViewControls = Boolean(document.querySelector("[data-set-request-view-mode]"));
        const hasRequestDensityControls = Boolean(document.querySelector("[data-set-request-density]"));
        const hasOverviewDensityControls = Boolean(document.querySelector("[data-set-overview-density]"));

        const tandemRequestUiState = {
            viewMode: hasRequestViewControls
                ? readViewMode(sessionStorage.getItem(REQUEST_VIEW_MODE_STORAGE_KEY), adminLayoutMode)
                : adminLayoutMode,
            density: hasRequestDensityControls && sessionStorage.getItem(REQUEST_DENSITY_STORAGE_KEY) === "expanded" ? "expanded" : "compact",
            overviewDensity: hasOverviewDensityControls && sessionStorage.getItem(OVERVIEW_DENSITY_STORAGE_KEY) === "compact" ? "compact" : "expanded",
        };

        function getRequestResultsContainers() {
            return Array.from(document.querySelectorAll("[data-request-results]"));
        }

        function getRequestCards() {
            return Array.from(document.querySelectorAll("[data-request-card]"));
        }

        function getOverviewPanels() {
            return Array.from(document.querySelectorAll("[data-admin-overview-panel]"));
        }

        function syncRequestViewButtons() {
            document.querySelectorAll("[data-set-request-view-mode]").forEach((button) => {
                const isActive = button.dataset.setRequestViewMode === tandemRequestUiState.viewMode;
                button.classList.toggle("btn-primary", isActive);
                button.classList.toggle("btn-outline-secondary", !isActive);
                button.classList.toggle("active", isActive);
                button.setAttribute("aria-pressed", isActive ? "true" : "false");
            });
        }

        function syncRequestDensityButtons() {
            document.querySelectorAll("[data-set-request-density]").forEach((button) => {
                const isActive = button.dataset.setRequestDensity === tandemRequestUiState.density;
                button.classList.toggle("btn-primary", isActive);
                button.classList.toggle("btn-outline-secondary", !isActive);
            });
        }

        function syncOverviewDensityButtons() {
            document.querySelectorAll("[data-set-overview-density]").forEach((button) => {
                const isActive = button.dataset.setOverviewDensity === tandemRequestUiState.overviewDensity;
                button.classList.toggle("btn-primary", isActive);
                button.classList.toggle("btn-outline-secondary", !isActive);
            });
        }

        function syncRequestDetailButtons() {
            getRequestCards().forEach((card) => {
                const button = card.querySelector("[data-toggle-request-details]");
                if (!button) return;

                const isOpen = card.dataset.detailsOpen === "true";
                button.setAttribute("aria-expanded", isOpen ? "true" : "false");
                button.textContent = isOpen ? "Hide" : "Details";
            });
        }

        function applyRequestUiState() {
            getRequestResultsContainers().forEach((container) => {
                container.dataset.viewMode = tandemRequestUiState.viewMode;
            });

            getRequestCards().forEach((card) => {
                card.dataset.density = tandemRequestUiState.density;
                card.dataset.detailsOpen = tandemRequestUiState.density === "expanded" ? "true" : "false";
            });

            getOverviewPanels().forEach((panel) => {
                panel.classList.toggle("d-none", hasOverviewDensityControls && tandemRequestUiState.overviewDensity === "compact");
            });

            if (hasRequestViewControls) {
                sessionStorage.setItem(REQUEST_VIEW_MODE_STORAGE_KEY, tandemRequestUiState.viewMode);
            }

            if (hasRequestDensityControls) {
                sessionStorage.setItem(REQUEST_DENSITY_STORAGE_KEY, tandemRequestUiState.density);
            }

            if (hasOverviewDensityControls) {
                sessionStorage.setItem(OVERVIEW_DENSITY_STORAGE_KEY, tandemRequestUiState.overviewDensity);
            }

            syncRequestViewButtons();
            syncRequestDensityButtons();
            syncOverviewDensityButtons();
            syncRequestDetailButtons();
        }

        document.querySelectorAll("[data-set-request-view-mode]").forEach((button) => {
            button.addEventListener("click", () => {
                tandemRequestUiState.viewMode = readViewMode(button.dataset.setRequestViewMode, "list");
                applyRequestUiState();
            });
        });

        document.querySelectorAll("[data-set-request-density]").forEach((button) => {
            button.addEventListener("click", () => {
                tandemRequestUiState.density = button.dataset.setRequestDensity;
                applyRequestUiState();
            });
        });

        document.querySelectorAll("[data-set-overview-density]").forEach((button) => {
            button.addEventListener("click", () => {
                tandemRequestUiState.overviewDensity = button.dataset.setOverviewDensity;
                applyRequestUiState();
            });
        });

        document.addEventListener("click", (event) => {
            const toggleButton = event.target.closest("[data-toggle-request-details]");
            if (!toggleButton) return;

            const card = toggleButton.closest("[data-request-card]");
            if (!card || card.dataset.density === "expanded") return;

            const isOpen = card.dataset.detailsOpen === "true";
            card.dataset.detailsOpen = isOpen ? "false" : "true";
            syncRequestDetailButtons();
        });

        window.addEventListener("admin-layout-change", (event) => {
            tandemRequestUiState.viewMode = readViewMode(event.detail.viewMode, "list");
            applyRequestUiState();
        });

        applyRequestUiState();
    }

    if (hasMatchUi) {
        const MATCH_VIEW_MODE_STORAGE_KEY = "incas:tandem-match-view-mode";
        const hasMatchViewControls = Boolean(document.querySelector("[data-set-view-mode]"));

        const matchUiState = {
            viewMode: hasMatchViewControls
                ? readViewMode(sessionStorage.getItem(MATCH_VIEW_MODE_STORAGE_KEY), adminLayoutMode)
                : readViewMode(adminLayoutMode, "list", CARD_VIEW_MODES),
            sortMode: "score",
            warningFilter: "all",
        };

        function getMatchResultsContainers() {
            return Array.from(document.querySelectorAll("[data-match-results]"));
        }

        function getCards(container) {
            return Array.from(container.querySelectorAll("[data-match-card]"));
        }

        function parseCreatedAt(card) {
            const value = card.dataset.createdAt || "";
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? 0 : parsed;
        }

        function compareCards(a, b) {
            const sortMode = matchUiState.sortMode;

            const scoreA = Number(a.dataset.score || 0);
            const scoreB = Number(b.dataset.score || 0);

            const createdA = parseCreatedAt(a);
            const createdB = parseCreatedAt(b);

            const nameA = a.dataset.name || "";
            const nameB = b.dataset.name || "";

            if (sortMode === "newest") return createdB - createdA || nameA.localeCompare(nameB);
            if (sortMode === "oldest") return createdA - createdB || nameA.localeCompare(nameB);
            if (sortMode === "name_asc") return nameA.localeCompare(nameB) || createdB - createdA;
            if (sortMode === "name_desc") return nameB.localeCompare(nameA) || createdB - createdA;

            return (scoreB - scoreA) || (createdB - createdA) || nameA.localeCompare(nameB);
        }

        function matchesWarningFilter(card) {
            const filterValue = matchUiState.warningFilter;
            if (filterValue === "all") return true;

            const warningKeys = (card.dataset.warningKeys || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

            const hasWarnings = warningKeys.length > 0;

            if (filterValue === "warning_free") return !hasWarnings;
            if (filterValue === "with_warnings") return hasWarnings;

            return warningKeys.includes(filterValue);
        }

        function setCardHiddenState(card, isHidden) {
            const hideButton = card.querySelector("[data-hide-match]");
            const restoreButton = card.querySelector("[data-restore-match]");

            if (hideButton) hideButton.classList.toggle("d-none", isHidden);
            if (restoreButton) restoreButton.classList.toggle("d-none", !isHidden);
        }

        function applyContainerState(container) {
            const cards = getCards(container);

            cards.sort(compareCards).forEach((card) => {
                container.appendChild(card);
            });

            container.dataset.viewMode = matchUiState.viewMode;

            cards.forEach((card) => {
                card.classList.toggle("d-none", !matchesWarningFilter(card));
            });
        }

        function updateSectionState(sectionKey) {
            const container = document.querySelector(`[data-section-key="${sectionKey}"]`);
            const countBadge = document.querySelector(`[data-count-for="${sectionKey}"]`);
            const emptyState = document.querySelector(`[data-empty-for="${sectionKey}"]`);

            if (!container || !countBadge || !emptyState) return;

            const visibleCount = getCards(container).filter((card) => !card.classList.contains("d-none")).length;

            countBadge.textContent = visibleCount;
            emptyState.classList.toggle("d-none", visibleCount > 0);
        }

        function updateHiddenState() {
            const container = document.getElementById("hidden-match-results");
            const countBadge = document.querySelector("[data-hidden-count]");
            const emptyState = document.querySelector("[data-hidden-empty]");

            if (!container || !countBadge || !emptyState) return;

            const visibleCount = getCards(container).filter((card) => !card.classList.contains("d-none")).length;
            const totalCount = getCards(container).length;

            countBadge.textContent = visibleCount;
            emptyState.classList.toggle("d-none", totalCount > 0);
            container.classList.toggle("d-none", totalCount === 0);
        }

        function syncViewButtons() {
            document.querySelectorAll("[data-set-view-mode]").forEach((button) => {
                const isActive = button.dataset.setViewMode === matchUiState.viewMode;
                button.classList.toggle("btn-primary", isActive);
                button.classList.toggle("btn-outline-secondary", !isActive);
                button.classList.toggle("active", isActive);
                button.setAttribute("aria-pressed", isActive ? "true" : "false");
            });
        }

        function refreshMatchUi() {
            getMatchResultsContainers().forEach((container) => {
                applyContainerState(container);
            });

            ["full", "partial", "weak"].forEach(updateSectionState);
            updateHiddenState();
            syncViewButtons();

            if (hasMatchViewControls) {
                sessionStorage.setItem(MATCH_VIEW_MODE_STORAGE_KEY, matchUiState.viewMode);
            }
        }

        function hideCard(card) {
            const hiddenContainer = document.getElementById("hidden-match-results");
            if (!hiddenContainer) return;

            hiddenContainer.appendChild(card);
            setCardHiddenState(card, true);
            refreshMatchUi();
        }

        function restoreCard(card) {
            const originSection = card.dataset.originSection;
            const originContainer = document.querySelector(`[data-section-key="${originSection}"]`);
            if (!originContainer) return;

            originContainer.appendChild(card);
            setCardHiddenState(card, false);
            refreshMatchUi();
        }

        document.querySelectorAll("[data-set-view-mode]").forEach((button) => {
            button.addEventListener("click", () => {
                matchUiState.viewMode = readViewMode(button.dataset.setViewMode, "list");
                refreshMatchUi();
            });
        });

        const sortSelect = document.getElementById("match-sort-mode");
        if (sortSelect) {
            sortSelect.addEventListener("change", () => {
                matchUiState.sortMode = sortSelect.value;
                refreshMatchUi();
            });
        }

        const warningFilterSelect = document.getElementById("match-warning-filter");
        if (warningFilterSelect) {
            warningFilterSelect.addEventListener("change", () => {
                matchUiState.warningFilter = warningFilterSelect.value;
                refreshMatchUi();
            });
        }

        document.addEventListener("click", (event) => {
            const hideButton = event.target.closest("[data-hide-match]");
            if (hideButton) {
                const card = hideButton.closest("[data-match-card]");
                if (card) hideCard(card);
                return;
            }

            const restoreButton = event.target.closest("[data-restore-match]");
            if (restoreButton) {
                const card = restoreButton.closest("[data-match-card]");
                if (card) restoreCard(card);
            }
        });

        window.addEventListener("admin-layout-change", (event) => {
            matchUiState.viewMode = readViewMode(event.detail.viewMode, "list", hasMatchViewControls ? VIEW_MODES : CARD_VIEW_MODES);
            refreshMatchUi();
        });

        refreshMatchUi();
    }

    function parseSortValue(value, type) {
        const rawValue = value || "";

        if (type === "number") {
            const parsed = Number(rawValue);
            return Number.isNaN(parsed) ? 0 : parsed;
        }

        if (type === "date") {
            const parsed = Date.parse(rawValue);
            return Number.isNaN(parsed) ? 0 : parsed;
        }

        return rawValue.toLocaleLowerCase();
    }

    function updateSortableHeaders(table) {
        const activeKey = table.dataset.sortKey || "";
        const direction = table.dataset.sortDirection || "";

        table.querySelectorAll("[data-sort-key]").forEach((button) => {
            const isActive = button.dataset.sortKey === activeKey;
            const header = button.closest("th");
            const icon = button.querySelector("[data-sort-icon]");

            if (header) {
                header.setAttribute("aria-sort", isActive ? (direction === "desc" ? "descending" : "ascending") : "none");
            }

            if (icon) {
                icon.className = isActive
                    ? `bi ${direction === "desc" ? "bi-caret-down-fill" : "bi-caret-up-fill"} ms-1`
                    : "bi bi-arrow-down-up ms-1";
            }
        });
    }

    function sortTable(table, button) {
        const key = button.dataset.sortKey;
        const type = button.dataset.sortType || "string";
        const defaultDirection = button.dataset.sortDefaultDirection || "asc";
        const currentDirection = table.dataset.sortDirection || "";
        let direction = defaultDirection;
        const body = table.querySelector("tbody");

        if (!key || !body) return;

        if (table.dataset.sortKey === key) {
            direction = currentDirection === "asc" ? "desc" : "asc";
        }

        const rows = Array.from(body.querySelectorAll("tr"));
        const multiplier = direction === "desc" ? -1 : 1;

        rows.sort((a, b) => {
            const valueA = parseSortValue(a.getAttribute(`data-sort-${key}`), type);
            const valueB = parseSortValue(b.getAttribute(`data-sort-${key}`), type);

            if (valueA < valueB) return -1 * multiplier;
            if (valueA > valueB) return 1 * multiplier;

            const fallbackA = parseSortValue(a.getAttribute("data-sort-id"), "number");
            const fallbackB = parseSortValue(b.getAttribute("data-sort-id"), "number");
            return (fallbackB - fallbackA);
        }).forEach((row) => {
            body.appendChild(row);
        });

        table.dataset.sortKey = key;
        table.dataset.sortDirection = direction;
        updateSortableHeaders(table);
    }

    document.querySelectorAll("[data-sortable-table]").forEach(updateSortableHeaders);

    document.addEventListener("click", (event) => {
        const sortButton = event.target.closest("[data-sortable-table] [data-sort-key]");
        if (!sortButton) return;

        const table = sortButton.closest("[data-sortable-table]");
        if (table) sortTable(table, sortButton);
    });
});
