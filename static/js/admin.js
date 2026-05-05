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

        function getRequestTable(container) {
            return container?.nextElementSibling?.querySelector("[data-sortable-table]") || null;
        }

        function createRequestActionLink(href, className, title, iconClass, label) {
            const link = document.createElement("a");
            link.href = href;
            link.className = `${className} tandem-action-btn`;
            link.title = title;
            link.innerHTML = `<i class="bi ${iconClass}"></i><span class="visually-hidden">${label}</span>`;
            return link;
        }

        function createRequestActionForm(action, returnTo, title, iconClass, label) {
            const form = document.createElement("form");
            form.method = "post";
            form.action = action;
            form.style.display = "contents";

            const returnInput = document.createElement("input");
            returnInput.type = "hidden";
            returnInput.name = "return_to";
            returnInput.value = returnTo;

            const button = document.createElement("button");
            button.type = "submit";
            button.className = "btn btn-outline-secondary tandem-action-btn";
            button.title = title;
            button.innerHTML = `<i class="bi ${iconClass}"></i><span class="visually-hidden">${label}</span>`;

            form.appendChild(returnInput);
            form.appendChild(button);
            return form;
        }

        function appendRequestCell(row, text, className = "") {
            const cell = document.createElement("td");
            if (className) cell.className = className;
            cell.textContent = text;
            row.appendChild(cell);
            return cell;
        }

        function appendTruncatedCell(row, text, className = "") {
            const cell = document.createElement("td");
            if (className) cell.className = className;
            const inner = document.createElement("div");
            inner.className = "tandem-table-truncate";
            inner.textContent = text || "—";
            inner.title = text || "";
            cell.appendChild(inner);
            row.appendChild(cell);
            return cell;
        }


        function createRequestFlagsCell(card) {
            const cell = document.createElement("td");
            const flags = document.createElement("div");
            flags.className = "d-flex flex-wrap gap-1";

            if (card.dataset.requestRequestedNativeOnly === "true") {
                const badge = document.createElement("span");
                badge.className = "badge text-bg-warning";
                badge.textContent = "Native";
                flags.appendChild(badge);
            }

            if (card.dataset.requestSameGenderOnly === "true") {
                const badge = document.createElement("span");
                badge.className = "badge text-bg-warning";
                badge.textContent = "Same gender";
                flags.appendChild(badge);
            }

            if (card.dataset.requestHasSameEmailGroup === "true") {
                const badge = document.createElement("span");
                badge.className = "badge text-bg-light border";
                badge.textContent = "Same email";
                flags.appendChild(badge);
            }

            if (card.dataset.requestHasLikelyDuplicate === "true") {
                const badge = document.createElement("span");
                badge.className = "badge text-bg-light border";
                badge.textContent = "Likely duplicate";
                flags.appendChild(badge);
            }

            cell.appendChild(flags);
            return cell;
        }

        function createRequestActionsCell(card) {
            const cell = document.createElement("td");
            cell.className = "text-end";

            const group = document.createElement("div");
            group.className = "btn-group btn-group-sm";
            group.setAttribute("role", "group");
            group.setAttribute("aria-label", "Request actions");

            if (card.dataset.requestMatchUrl) {
                group.appendChild(
                    createRequestActionLink(
                        card.dataset.requestMatchUrl,
                        "btn btn-dark",
                        "Match",
                        "bi-arrow-left-right",
                        "Match",
                    ),
                );
            }

            if (card.dataset.requestEditUrl) {
                group.appendChild(
                    createRequestActionLink(
                        card.dataset.requestEditUrl,
                        "btn btn-outline-secondary",
                        "Edit",
                        "bi-pencil",
                        "Edit",
                    ),
                );
            }

            if (card.dataset.requestDuplicatesUrl) {
                group.appendChild(
                    createRequestActionLink(
                        card.dataset.requestDuplicatesUrl,
                        "btn btn-outline-secondary",
                        "Duplicates",
                        "bi-files",
                        "Duplicates",
                    ),
                );
            }

            group.appendChild(
                createRequestActionForm(
                    card.dataset.requestToggleViewedUrl || "",
                    card.dataset.requestReturnTo || "",
                    card.dataset.requestToggleViewedLabel || "Toggle viewed",
                    card.dataset.requestIsViewed === "true" ? "bi-eye-slash" : "bi-eye",
                    card.dataset.requestToggleViewedLabel || "Toggle viewed",
                ),
            );

            cell.appendChild(group);
            return cell;
        }

        function createRequestTableRow(card) {
            const row = document.createElement("tr");

            row.setAttribute("data-sort-id", card.dataset.requestId || "");
            row.setAttribute("data-sort-created", card.dataset.requestCreated || "");
            row.setAttribute("data-sort-name", card.dataset.requestSortName || "");
            row.setAttribute("data-sort-email", card.dataset.requestEmail || "");
            row.setAttribute("data-sort-country", card.dataset.requestCountry || "");
            row.setAttribute("data-sort-occupation", card.dataset.requestOccupation || "");
            row.setAttribute("data-sort-gender", card.dataset.requestGender || "");
            row.setAttribute("data-sort-birth", card.dataset.requestBirth || "");
            row.setAttribute("data-sort-departure", card.dataset.requestDeparture || "");
            row.setAttribute("data-sort-offered", card.dataset.requestOffered || "");
            row.setAttribute("data-sort-requested", card.dataset.requestRequested || "");
            row.setAttribute("data-sort-full", card.dataset.requestFull || "0");
            row.setAttribute("data-sort-partial", card.dataset.requestPartial || "0");
            row.setAttribute("data-sort-weak", card.dataset.requestWeak || "0");
            row.setAttribute("data-sort-total", card.dataset.requestTotal || "0");

            const nameCell = document.createElement("td");
            nameCell.className = "text-nowrap";
            const nameLine = document.createElement("div");
            nameLine.className = "fw-semibold";
            nameLine.textContent = card.dataset.requestName || "";
            nameCell.appendChild(nameLine);
            row.appendChild(nameCell);

            appendTruncatedCell(row, card.dataset.requestEmail || "");
            appendTruncatedCell(row, card.dataset.requestCountry || "");
            appendTruncatedCell(row, card.dataset.requestOccupation || "");

            // Born + gender in one compact cell
            const bornCell = document.createElement("td");
            bornCell.className = "text-nowrap";
            const bornLine = document.createElement("div");
            bornLine.textContent = card.dataset.requestBirth || "—";
            const genderLine = document.createElement("div");
            genderLine.className = "small text-muted";
            genderLine.textContent = card.dataset.requestGender || "";
            bornCell.appendChild(bornLine);
            if (card.dataset.requestGender) bornCell.appendChild(genderLine);
            row.appendChild(bornCell);

            appendRequestCell(row, (card.dataset.requestCreatedLabel || "").slice(0, 10) || "—", "text-nowrap");
            appendRequestCell(row, card.dataset.requestDepartureLabel || "—", "text-nowrap");
            appendRequestCell(row, card.dataset.requestOffered || "—");
            appendRequestCell(row, card.dataset.requestRequested || "—");

            // Matches: three labeled badges with per-badge tooltips
            const matchCell = document.createElement("td");
            matchCell.className = "text-nowrap";
            [
                [card.dataset.requestFull || "0", "text-bg-dark", "full"],
                [card.dataset.requestPartial || "0", "text-bg-secondary", "partial"],
                [card.dataset.requestWeak || "0", "text-bg-warning", "weak"],
            ].forEach(([value, cls, label], index) => {
                if (index > 0) matchCell.appendChild(document.createTextNode(" "));
                const badge = document.createElement("span");
                badge.className = `badge ${cls}`;
                badge.textContent = value;
                badge.title = `${value} ${label} match${value !== "1" ? "es" : ""}`;
                matchCell.appendChild(badge);
            });
            row.appendChild(matchCell);

            row.appendChild(createRequestFlagsCell(card));
            row.appendChild(createRequestActionsCell(card));

            return row;
        }

        function renderRequestTable(table, container) {
            if (!table || !container) return;

            const body = table.querySelector("tbody");
            if (!body) return;

            body.innerHTML = "";

            const fragment = document.createDocumentFragment();
            container.querySelectorAll("[data-request-card]").forEach((card) => {
                fragment.appendChild(createRequestTableRow(card));
            });
            body.appendChild(fragment);

            const activeKey = table.dataset.sortKey || "";
            if (activeKey) {
                const activeButton = table.querySelector(`[data-sort-key="${activeKey}"]`);
                if (activeButton) {
                    const activeType = activeButton.dataset.sortType || "string";
                    const activeDirection = table.dataset.sortDirection || activeButton.dataset.sortDefaultDirection || "asc";
                    sortTableRows(table, activeKey, activeType, activeDirection);
                } else {
                    updateSortableHeaders(table);
                }
            } else {
                updateSortableHeaders(table);
            }
        }

        function clearRequestTable(table) {
            const body = table?.querySelector("tbody");
            if (body) body.innerHTML = "";
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
                const table = getRequestTable(container);
                if (tandemRequestUiState.viewMode === "table") {
                    renderRequestTable(table, container);
                } else {
                    clearRequestTable(table);
                }
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
        const matchSource = document.querySelector("[data-match-source-id]");
        const matchStateEndpoint = matchSource ? (matchSource.dataset.matchStateEndpoint || "") : "";
        const matchSourceEmail = matchSource ? (matchSource.dataset.matchSourceEmail || "") : "";
        const matchStateScript = document.getElementById("match-review-state-json");
        const MATCH_EMAIL_SUBJECT = "INCAS Language Tandem";

        const matchUiState = {
            viewMode: hasMatchViewControls
                ? readViewMode(sessionStorage.getItem(MATCH_VIEW_MODE_STORAGE_KEY), adminLayoutMode)
                : readViewMode(adminLayoutMode, "list", CARD_VIEW_MODES),
            sortMode: "score",
            warningFilter: "all",
            mutualFilter: "all",
            levelFilter: "all",
            nativeFilter: "all",
            sameGenderFilter: "all",
            countryFilter: "all",
            departureFilter: "all",
            duplicateFilter: "all",
        };

        const persistedMatchState = {
            hidden: new Set(),
            shortlisted: new Set(),
            contacted: new Map(),
            finalPairs: new Map(),
        };

        function clearPersistedMatchState() {
            persistedMatchState.hidden.clear();
            persistedMatchState.shortlisted.clear();
            persistedMatchState.contacted.clear();
            persistedMatchState.finalPairs.clear();
        }

        function replaceSetContents(targetSet, sourceSet) {
            targetSet.clear();
            sourceSet.forEach((value) => targetSet.add(value));
        }

        function replaceMapContents(targetMap, sourceMap) {
            targetMap.clear();
            sourceMap.forEach((value, key) => {
                targetMap.set(key, value ? { ...value } : {});
            });
        }

        function replacePersistedMatchState(rawState) {
            clearPersistedMatchState();
            (rawState.hidden || []).forEach((id) => persistedMatchState.hidden.add(String(id)));
            (rawState.shortlisted || []).forEach((id) => persistedMatchState.shortlisted.add(String(id)));

            Object.entries(rawState.contacted || {}).forEach(([id, value]) => {
                persistedMatchState.contacted.set(String(id), value ? { ...value } : {});
            });

            Object.entries(rawState.final_pairs || {}).forEach(([id, value]) => {
                persistedMatchState.finalPairs.set(String(id), value ? { ...value } : {});
            });
        }

        function clonePersistedMatchState() {
            return {
                hidden: new Set(persistedMatchState.hidden),
                shortlisted: new Set(persistedMatchState.shortlisted),
                contacted: new Map(
                    Array.from(persistedMatchState.contacted.entries(), ([key, value]) => [key, value ? { ...value } : {}]),
                ),
                finalPairs: new Map(
                    Array.from(persistedMatchState.finalPairs.entries(), ([key, value]) => [key, value ? { ...value } : {}]),
                ),
            };
        }

        function restorePersistedMatchState(snapshot) {
            replaceSetContents(persistedMatchState.hidden, snapshot.hidden);
            replaceSetContents(persistedMatchState.shortlisted, snapshot.shortlisted);
            replaceMapContents(persistedMatchState.contacted, snapshot.contacted);
            replaceMapContents(persistedMatchState.finalPairs, snapshot.finalPairs);
        }

        function readPersistedMatchState() {
            try {
                replacePersistedMatchState(JSON.parse(matchStateScript?.textContent || "{}"));
            } catch (_error) {
                clearPersistedMatchState();
            }
        }

        async function writePersistedMatchState(candidateId) {
            if (!matchStateEndpoint || !candidateId) return null;

            const response = await fetch(matchStateEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({
                    candidate_id: Number(candidateId),
                    hidden: persistedMatchState.hidden.has(candidateId),
                    shortlisted: persistedMatchState.shortlisted.has(candidateId),
                    contacted: persistedMatchState.contacted.has(candidateId),
                    final_pair: persistedMatchState.finalPairs.has(candidateId),
                }),
            });

            if (!response.ok) {
                throw new Error("Could not save match review state.");
            }

            return response.json();
        }

        function showMatchStateError() {
            window.alert("Could not save match review state.");
        }

        function getMatchResultsContainers() {
            return Array.from(document.querySelectorAll("[data-match-results]"));
        }

        function getCards(container) {
            return Array.from(container.querySelectorAll("[data-match-card]"));
        }

        function getAllMatchCards() {
            return Array.from(document.querySelectorAll("[data-match-card]"));
        }

        function getCardId(card) {
            return String(card.dataset.candidateId || "");
        }

        function normalizeEmailValue(value) {
            return String(value || "").trim();
        }

        function buildMailtoHref(addresses) {
            const recipients = addresses
                .map(normalizeEmailValue)
                .filter(Boolean)
                .join(",");
            const subject = encodeURIComponent(MATCH_EMAIL_SUBJECT);

            return recipients ? `mailto:${recipients}?subject=${subject}` : `mailto:?subject=${subject}`;
        }

        function buildPairEmailText(candidateEmail) {
            return [matchSourceEmail, candidateEmail]
                .map(normalizeEmailValue)
                .filter(Boolean)
                .join(", ");
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

        function matchesMutualFilter(card) {
            if (matchUiState.mutualFilter === "all") return true;

            const isMutual = card.dataset.isMutual === "true";
            if (matchUiState.mutualFilter === "mutual") return isMutual;
            if (matchUiState.mutualFilter === "one_way") return !isMutual;

            return true;
        }

        function matchesLevelFilter(card) {
            if (matchUiState.levelFilter === "all") return true;

            const requiredLevel = Number(matchUiState.levelFilter);
            const candidateLevel = Number(card.dataset.bestRequestedLevel || 0);

            return candidateLevel >= requiredLevel;
        }

        function matchesNativeFilter(card) {
            if (matchUiState.nativeFilter === "all") return true;
            return (card.dataset.nativePreference || "satisfied") === matchUiState.nativeFilter;
        }

        function matchesSameGenderFilter(card) {
            if (matchUiState.sameGenderFilter === "all") return true;
            return (card.dataset.genderPreference || "satisfied") === matchUiState.sameGenderFilter;
        }

        function matchesCountryFilter(card) {
            if (matchUiState.countryFilter === "all") return true;
            return (card.dataset.countryCode || "") === matchUiState.countryFilter;
        }

        function matchesDepartureFilter(card) {
            if (matchUiState.departureFilter === "all") return true;
            return (card.dataset.departureOverlap || "unknown") === matchUiState.departureFilter;
        }

        function matchesDuplicateFilter(card) {
            if (matchUiState.duplicateFilter === "all") return true;
            return (card.dataset.duplicateReview || "clear") === matchUiState.duplicateFilter;
        }

        function setCardHiddenState(card, isHidden) {
            const hideButton = card.querySelector("[data-hide-match]");
            const restoreButton = card.querySelector("[data-restore-match]");

            if (hideButton) hideButton.classList.toggle("d-none", isHidden);
            if (restoreButton) restoreButton.classList.toggle("d-none", !isHidden);
        }

        function buildReviewStatusLabel(label, meta) {
            return meta?.label ? `${label} · ${meta.label}` : label;
        }

        function createReviewBadges(candidateId, extraClass = "") {
            const contactedMeta = persistedMatchState.contacted.get(candidateId) || null;
            const finalPairMeta = persistedMatchState.finalPairs.get(candidateId) || null;

            if (!contactedMeta && !finalPairMeta) return null;

            const badges = document.createElement("div");
            badges.className = "match-review-badges";

            if (extraClass) {
                badges.classList.add(extraClass);
            }

            if (contactedMeta) {
                const badge = document.createElement("span");
                badge.className = "badge text-bg-info";
                badge.textContent = buildReviewStatusLabel("Contacted", contactedMeta);
                badges.appendChild(badge);
            }

            if (finalPairMeta) {
                const badge = document.createElement("span");
                badge.className = "badge text-bg-success";
                badge.textContent = buildReviewStatusLabel("Final pair", finalPairMeta);
                badges.appendChild(badge);
            }

            return badges;
        }

        function createShortlistStateBadges(candidateId, extraClass = "") {
            const isHidden = persistedMatchState.hidden.has(candidateId);
            const reviewBadges = createReviewBadges(candidateId);

            if (!isHidden && !reviewBadges) return null;

            const badges = document.createElement("div");
            badges.className = "match-review-badges";

            if (extraClass) {
                badges.classList.add(extraClass);
            }

            if (isHidden) {
                const hiddenBadge = document.createElement("span");
                hiddenBadge.className = "badge text-bg-secondary";
                hiddenBadge.textContent = "Hidden in results";
                badges.appendChild(hiddenBadge);
            }

            reviewBadges?.childNodes.forEach((node) => {
                badges.appendChild(node.cloneNode(true));
            });

            return badges;
        }

        function setCardReviewBadgeState(card, selector, isActive, label, meta) {
            const badge = card.querySelector(selector);
            if (!badge) return;

            badge.classList.toggle("d-none", !isActive);
            badge.textContent = isActive ? buildReviewStatusLabel(label, meta) : "";
        }

        function setCardShortlistState(card, isShortlisted) {
            const button = card.querySelector("[data-toggle-shortlist]");
            if (!button) return;

            const icon = button.querySelector(".bi");
            const label = button.querySelector("[data-shortlist-label]");

            button.classList.toggle("btn-warning", isShortlisted);
            button.classList.toggle("btn-outline-warning", !isShortlisted);
            button.setAttribute("aria-pressed", isShortlisted ? "true" : "false");

            if (icon) {
                icon.classList.toggle("bi-star-fill", isShortlisted);
                icon.classList.toggle("bi-star", !isShortlisted);
            }

            if (label) label.textContent = isShortlisted ? "Shortlisted" : "Shortlist";
        }

        function setCardContactedState(card, contactedMeta) {
            const button = card.querySelector("[data-toggle-contacted]");
            const label = button?.querySelector("[data-contacted-label]");
            const isContacted = Boolean(contactedMeta);

            if (button) {
                button.classList.toggle("btn-info", isContacted);
                button.classList.toggle("btn-outline-info", !isContacted);
                button.setAttribute("aria-pressed", isContacted ? "true" : "false");
            }

            if (label) {
                label.textContent = isContacted ? "Contacted" : "Mark contacted";
            }

            setCardReviewBadgeState(card, "[data-contacted-status]", isContacted, "Contacted", contactedMeta);
        }

        function setCardFinalPairState(card, finalPairMeta) {
            const button = card.querySelector("[data-toggle-final-pair]");
            const label = button?.querySelector("[data-final-pair-label]");
            const isFinalPair = Boolean(finalPairMeta);

            if (button) {
                button.classList.toggle("btn-success", isFinalPair);
                button.classList.toggle("btn-outline-success", !isFinalPair);
                button.setAttribute("aria-pressed", isFinalPair ? "true" : "false");
            }

            if (label) {
                label.textContent = isFinalPair ? "Final pair" : "Mark final pair";
            }

            setCardReviewBadgeState(card, "[data-final-pair-status]", isFinalPair, "Final pair", finalPairMeta);
        }

        function moveCardToHidden(card) {
            const hiddenContainer = document.getElementById("hidden-match-results");
            if (!hiddenContainer) return;

            hiddenContainer.appendChild(card);
            setCardHiddenState(card, true);
        }

        function moveCardToOrigin(card) {
            const originSection = card.dataset.originSection;
            const originContainer = document.querySelector(`[data-section-key="${originSection}"]`);
            if (!originContainer) return;

            originContainer.appendChild(card);
            setCardHiddenState(card, false);
        }

        function applyContainerState(container) {
            const cards = getCards(container);

            cards.sort(compareCards).forEach((card) => {
                container.appendChild(card);
            });

            container.dataset.viewMode = matchUiState.viewMode;

            cards.forEach((card) => {
                const isVisible = matchesWarningFilter(card)
                    && matchesMutualFilter(card)
                    && matchesLevelFilter(card)
                    && matchesNativeFilter(card)
                    && matchesSameGenderFilter(card)
                    && matchesCountryFilter(card)
                    && matchesDepartureFilter(card)
                    && matchesDuplicateFilter(card);

                card.classList.toggle("d-none", !isVisible);
            });
        }

        function updateShortlistPanel() {
            const list = document.querySelector("[data-shortlist-list]");
            const countBadge = document.querySelector("[data-shortlist-count]");
            const emptyState = document.querySelector("[data-shortlist-empty]");

            if (!list || !countBadge || !emptyState) return;

            list.innerHTML = "";

            const shortlistedCards = getAllMatchCards()
            .filter((card) => persistedMatchState.shortlisted.has(getCardId(card)))
            .sort(compareCards);

            countBadge.textContent = shortlistedCards.length;
            emptyState.classList.toggle("d-none", shortlistedCards.length > 0);

            shortlistedCards.forEach((card) => {
                const cardId = getCardId(card);
                const isHidden = persistedMatchState.hidden.has(cardId);
                const row = document.createElement("div");
                row.className = "match-shortlist-row";
                row.classList.toggle("match-shortlist-row-hidden", isHidden);

                const summary = document.createElement("div");
                summary.className = "match-shortlist-summary";

                const name = document.createElement("div");
                name.className = "fw-semibold";
                name.textContent = card.dataset.candidateName || "Candidate";

                const meta = document.createElement("div");
                meta.className = "small text-muted";
                meta.textContent = `${card.dataset.category || "match"} · ${card.dataset.score || 0} pts · ${card.dataset.candidateEmail || ""}`;

                summary.appendChild(name);
                summary.appendChild(meta);

                const stateBadges = createShortlistStateBadges(cardId, "mt-2");
                if (stateBadges) {
                    summary.appendChild(stateBadges);
                }

                const actions = document.createElement("div");
                actions.className = "match-shortlist-actions";

                const mailLink = document.createElement("a");
                mailLink.className = "btn btn-sm btn-outline-secondary";
                mailLink.href = buildMailtoHref([card.dataset.candidateEmail || ""]);
                mailLink.textContent = "Email";

                const pairMailLink = document.createElement("a");
                pairMailLink.className = "btn btn-sm btn-outline-secondary";
                pairMailLink.href = buildMailtoHref([matchSourceEmail, card.dataset.candidateEmail || ""]);
                pairMailLink.textContent = "Pair email";

                const copyButton = document.createElement("button");
                copyButton.type = "button";
                copyButton.className = "btn btn-sm btn-outline-secondary";
                copyButton.dataset.copyText = card.dataset.candidateEmail || "";
                copyButton.innerHTML = '<i class="bi bi-clipboard"></i> <span data-copy-label>Copy</span>';

                const copyBothButton = document.createElement("button");
                copyBothButton.type = "button";
                copyBothButton.className = "btn btn-sm btn-outline-secondary";
                copyBothButton.dataset.copyText = buildPairEmailText(card.dataset.candidateEmail || "");
                copyBothButton.innerHTML = '<i class="bi bi-clipboard"></i> <span data-copy-label>Copy both</span>';

                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.className = "btn btn-sm btn-outline-secondary";
                removeButton.dataset.removeShortlist = cardId;
                removeButton.textContent = "Remove";

                actions.appendChild(mailLink);
                actions.appendChild(pairMailLink);
                actions.appendChild(copyButton);
                actions.appendChild(copyBothButton);
                actions.appendChild(removeButton);

                row.appendChild(summary);
                row.appendChild(actions);
                list.appendChild(row);
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
            updateShortlistPanel();
            syncViewButtons();

            if (hasMatchViewControls) {
                sessionStorage.setItem(MATCH_VIEW_MODE_STORAGE_KEY, matchUiState.viewMode);
            }
        }

        async function persistMatchStateChange(candidateId, previousState) {
            try {
                const payload = await writePersistedMatchState(candidateId);
                if (payload?.state) {
                    replacePersistedMatchState(payload.state);
                }
            } catch (_error) {
                restorePersistedMatchState(previousState);
                applyPersistedMatchState();
                refreshMatchUi();
                showMatchStateError();
                return;
            }

            applyPersistedMatchState();
            refreshMatchUi();
        }

        async function hideCard(card) {
            const cardId = getCardId(card);
            if (!cardId) return;

            const previousState = clonePersistedMatchState();
            persistedMatchState.hidden.add(cardId);
            applyPersistedMatchState();
            refreshMatchUi();
            await persistMatchStateChange(cardId, previousState);
        }

        async function restoreCard(card) {
            const cardId = getCardId(card);
            if (!cardId) return;

            const previousState = clonePersistedMatchState();
            persistedMatchState.hidden.delete(cardId);
            applyPersistedMatchState();
            refreshMatchUi();
            await persistMatchStateChange(cardId, previousState);
        }

        async function toggleShortlist(card) {
            const cardId = getCardId(card);
            if (!cardId) return;

            const previousState = clonePersistedMatchState();
            const isShortlisted = persistedMatchState.shortlisted.has(cardId);

            if (isShortlisted) {
                persistedMatchState.shortlisted.delete(cardId);
            } else {
                persistedMatchState.shortlisted.add(cardId);
            }

            applyPersistedMatchState();
            refreshMatchUi();
            await persistMatchStateChange(cardId, previousState);
        }

        async function toggleContacted(card) {
            const cardId = getCardId(card);
            if (!cardId) return;

            const previousState = clonePersistedMatchState();
            if (persistedMatchState.contacted.has(cardId)) {
                persistedMatchState.contacted.delete(cardId);
            } else {
                persistedMatchState.contacted.set(cardId, {});
            }

            applyPersistedMatchState();
            refreshMatchUi();
            await persistMatchStateChange(cardId, previousState);
        }

        async function toggleFinalPair(card) {
            const cardId = getCardId(card);
            if (!cardId) return;

            const previousState = clonePersistedMatchState();
            const isFinalPair = persistedMatchState.finalPairs.has(cardId);

            if (isFinalPair) {
                persistedMatchState.finalPairs.delete(cardId);
            } else {
                const currentMeta = persistedMatchState.finalPairs.get(cardId) || {};
                persistedMatchState.finalPairs.clear();
                persistedMatchState.finalPairs.set(cardId, currentMeta);
            }

            applyPersistedMatchState();
            refreshMatchUi();
            await persistMatchStateChange(cardId, previousState);
        }

        function applyPersistedMatchState() {
            getAllMatchCards().forEach((card) => {
                const cardId = getCardId(card);
                if (!cardId) return;

                if (persistedMatchState.hidden.has(cardId)) {
                    moveCardToHidden(card);
                } else {
                    moveCardToOrigin(card);
                }

                setCardShortlistState(card, persistedMatchState.shortlisted.has(cardId));
                setCardContactedState(card, persistedMatchState.contacted.get(cardId) || null);
                setCardFinalPairState(card, persistedMatchState.finalPairs.get(cardId) || null);
            });
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

        const mutualFilterSelect = document.getElementById("match-mutual-filter");
        if (mutualFilterSelect) {
            mutualFilterSelect.addEventListener("change", () => {
                matchUiState.mutualFilter = mutualFilterSelect.value;
                refreshMatchUi();
            });
        }

        const levelFilterSelect = document.getElementById("match-level-filter");
        if (levelFilterSelect) {
            levelFilterSelect.addEventListener("change", () => {
                matchUiState.levelFilter = levelFilterSelect.value;
                refreshMatchUi();
            });
        }

        const nativeFilterSelect = document.getElementById("match-native-filter");
        if (nativeFilterSelect) {
            nativeFilterSelect.addEventListener("change", () => {
                matchUiState.nativeFilter = nativeFilterSelect.value;
                refreshMatchUi();
            });
        }

        const sameGenderFilterSelect = document.getElementById("match-gender-filter");
        if (sameGenderFilterSelect) {
            sameGenderFilterSelect.addEventListener("change", () => {
                matchUiState.sameGenderFilter = sameGenderFilterSelect.value;
                refreshMatchUi();
            });
        }

        const countryFilterSelect = document.getElementById("match-country-filter");
        if (countryFilterSelect) {
            countryFilterSelect.addEventListener("change", () => {
                matchUiState.countryFilter = countryFilterSelect.value;
                refreshMatchUi();
            });
        }

        const departureFilterSelect = document.getElementById("match-departure-filter");
        if (departureFilterSelect) {
            departureFilterSelect.addEventListener("change", () => {
                matchUiState.departureFilter = departureFilterSelect.value;
                refreshMatchUi();
            });
        }

        const duplicateFilterSelect = document.getElementById("match-duplicate-filter");
        if (duplicateFilterSelect) {
            duplicateFilterSelect.addEventListener("change", () => {
                matchUiState.duplicateFilter = duplicateFilterSelect.value;
                refreshMatchUi();
            });
        }

        document.addEventListener("click", (event) => {
            const shortlistButton = event.target.closest("[data-toggle-shortlist]");
            if (shortlistButton) {
                const card = shortlistButton.closest("[data-match-card]");
                if (card) toggleShortlist(card);
                return;
            }

            const contactedButton = event.target.closest("[data-toggle-contacted]");
            if (contactedButton) {
                const card = contactedButton.closest("[data-match-card]");
                if (card) toggleContacted(card);
                return;
            }

            const finalPairButton = event.target.closest("[data-toggle-final-pair]");
            if (finalPairButton) {
                const card = finalPairButton.closest("[data-match-card]");
                if (card) toggleFinalPair(card);
                return;
            }

            const removeShortlistButton = event.target.closest("[data-remove-shortlist]");
            if (removeShortlistButton) {
                const candidateId = String(removeShortlistButton.dataset.removeShortlist || "");
                if (!candidateId) return;

                const previousState = clonePersistedMatchState();
                persistedMatchState.shortlisted.delete(candidateId);
                applyPersistedMatchState();
                refreshMatchUi();
                persistMatchStateChange(candidateId, previousState);
                return;
            }

            const hideButton = event.target.closest("[data-hide-match]");
            if (hideButton) {
                const card = hideButton.closest("[data-match-card]");
                if (card) {
                    hideCard(card);
                }
                return;
            }

            const restoreButton = event.target.closest("[data-restore-match]");
            if (restoreButton) {
                const card = restoreButton.closest("[data-match-card]");
                if (card) {
                    restoreCard(card);
                }
            }
        });

        window.addEventListener("admin-layout-change", (event) => {
            matchUiState.viewMode = readViewMode(event.detail.viewMode, "list", hasMatchViewControls ? VIEW_MODES : CARD_VIEW_MODES);
            refreshMatchUi();
        });

        readPersistedMatchState();
        applyPersistedMatchState();
        refreshMatchUi();
    }

    function fallbackCopyText(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand("copy");
        } finally {
            textarea.remove();
        }
    }

    document.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-copy-text]");
        if (!button) return;

        const text = button.dataset.copyText || "";
        const label = button.querySelector("[data-copy-label]");
        const originalLabel = label ? label.textContent : "";

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                fallbackCopyText(text);
            }

            if (label) label.textContent = "Copied";
            button.classList.add("btn-success");
            button.classList.remove("btn-outline-secondary");
        } catch (_error) {
            if (label) label.textContent = "Failed";
        }

        window.setTimeout(() => {
            if (label) label.textContent = originalLabel;
            button.classList.remove("btn-success");
            button.classList.add("btn-outline-secondary");
        }, 1400);
    });

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

    function sortTableRows(table, key, type = "string", direction = "asc") {
        const body = table.querySelector("tbody");

        if (!key || !body) return;

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

    function sortTable(table, button) {
        const key = button.dataset.sortKey;
        const type = button.dataset.sortType || "string";
        const defaultDirection = button.dataset.sortDefaultDirection || "asc";
        const currentDirection = table.dataset.sortDirection || "";
        let direction = defaultDirection;

        if (!key) return;

        if (table.dataset.sortKey === key) {
            direction = currentDirection === "asc" ? "desc" : "asc";
        }

        sortTableRows(table, key, type, direction);
    }

    document.querySelectorAll("[data-sortable-table]").forEach(updateSortableHeaders);

    document.addEventListener("click", (event) => {
        const sortButton = event.target.closest("[data-sortable-table] [data-sort-key]");
        if (!sortButton) return;

        if (sortButton.dataset.sortUrl) {
            event.preventDefault();
            window.location.assign(sortButton.dataset.sortUrl);
            return;
        }

        const table = sortButton.closest("[data-sortable-table]");
        if (table) sortTable(table, sortButton);
    });
});
