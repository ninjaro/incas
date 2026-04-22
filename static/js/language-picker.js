(function () {
    const LANG_LEVELS = ["1", "2", "3", "4", "5"];
    const LEVEL_LABELS = ["Beginner", "Intermediate", "Advanced", "Fluent", "Native"];

    let _tooltip = null;

    function getTooltip() {
        if (!_tooltip) {
            _tooltip = document.createElement("div");
            _tooltip.className = "lang-level-tooltip";
            document.body.appendChild(_tooltip);
        }
        return _tooltip;
    }

    function showTooltip(el, text) {
        const tip = getTooltip();
        tip.textContent = text;
        const rect = el.getBoundingClientRect();
        tip.style.left = (rect.left + rect.width / 2 + window.scrollX) + "px";
        tip.style.top = (rect.top - 30 + window.scrollY) + "px";
        tip.classList.add("is-visible");
    }

    function hideTooltip() {
        if (_tooltip) _tooltip.classList.remove("is-visible");
    }

    window.initOccupationOther = function initOccupationOther() {
        const occupationSelect = document.getElementById("occupation");
        const occupationOtherWrapper = document.getElementById("occupation_other_wrapper");
        const occupationOtherInput = document.getElementById("occupation_other");

        function syncOccupationOther() {
            if (!occupationSelect || !occupationOtherWrapper || !occupationOtherInput) return;
            const isOther = occupationSelect.value === "other";
            occupationOtherWrapper.style.display = isOther ? "" : "none";
            occupationOtherInput.required = isOther;
            if (!isOther) occupationOtherInput.value = "";
        }

        if (occupationSelect) {
            occupationSelect.addEventListener("change", syncOccupationOther);
            syncOccupationOther();
        }
    };

    window.initLanguagePicker = function initLanguagePicker(config) {
        const languagePickerState = {
            offered: {
                options: config.offered.options || [],
                selected: config.offered.selected || [],
                levels: config.offered.levels || {},
                sortMode: "alpha",
                query: "",
                allowLevels: true,
            },
            requested: {
                options: config.requested.options || [],
                selected: config.requested.selected || [],
                levels: {},
                sortMode: "alpha",
                query: "",
                allowLevels: false,
            },
        };

        function getPickerElements(kind) {
            return {
                lookup: document.getElementById(`${kind}_language_lookup`),
                menu: document.getElementById(`${kind}_language_menu`),
                selectedContainer: document.getElementById(`${kind}_language_selected`),
                inputsContainer: document.getElementById(`${kind}_language_inputs`),
            };
        }

        function getAvailableItems(kind) {
            const state = languagePickerState[kind];
            const selectedSet = new Set(state.selected);
            let items = state.options.filter((item) => !selectedSet.has(item.value));

            if (state.query.trim()) {
                const query = state.query.trim().toLowerCase();
                items = items.filter((item) => item.label.toLowerCase().includes(query));
            }

            items.sort((a, b) => {
                if (state.sortMode === "popularity") {
                    const diff = b.popularity - a.popularity;
                    if (diff !== 0) return diff;
                }
                return a.label.localeCompare(b.label);
            });

            return items;
        }

        function syncSortButtons(kind) {
            const state = languagePickerState[kind];
            document.querySelectorAll(`.language-sort[data-target-picker="${kind}"]`).forEach((button) => {
                const isActive = button.dataset.sortMode === state.sortMode;
                button.classList.toggle("btn-dark", isActive);
                button.classList.toggle("btn-outline-secondary", !isActive);
            });
        }

        function syncSuggestionButtons(kind) {
            const state = languagePickerState[kind];
            const selectedSet = new Set(state.selected);
            document.querySelectorAll(`.language-suggestion[data-target-picker="${kind}"]`).forEach((button) => {
                const isSelected = selectedSet.has(button.dataset.targetValue);
                button.disabled = isSelected;
                button.classList.toggle("btn-dark", isSelected);
                button.classList.toggle("btn-outline-secondary", !isSelected);
            });
        }

        function renderLookupMenu(kind) {
            const state = languagePickerState[kind];
            const { menu } = getPickerElements(kind);
            if (!menu) return;

            const items = getAvailableItems(kind);
            menu.innerHTML = "";

            if (!items.length) {
                const empty = document.createElement("button");
                empty.type = "button";
                empty.className = "language-lookup-item";
                empty.disabled = true;
                empty.textContent = state.query.trim() ? "No matches" : "No languages left to add";
                menu.appendChild(empty);
                return;
            }

            items.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "language-lookup-item";
                button.dataset.action = "add-language";
                button.dataset.kind = kind;
                button.dataset.value = item.value;
                button.textContent = item.label;
                menu.appendChild(button);
            });
        }

        function createLevelBar(kind, code, currentLevel) {
            const bar = document.createElement("div");
            bar.className = "lang-level-bar";

            const currentIndex = currentLevel ? LANG_LEVELS.indexOf(currentLevel) : -1;
            let hoveredIndex = -1;

            function updatePips() {
                const activeIndex = hoveredIndex >= 0 ? hoveredIndex : currentIndex;
                pips.forEach((pip, i) => {
                    pip.classList.toggle("is-active", activeIndex >= 0 && i <= activeIndex);
                });
            }

            const pips = LANG_LEVELS.map((_level, i) => {
                const pip = document.createElement("span");
                pip.className = "lang-level-pip";
                pip.dataset.levelIndex = i;

                pip.addEventListener("mouseenter", () => {
                    hoveredIndex = i;
                    updatePips();
                    showTooltip(pip, LEVEL_LABELS[i]);
                });

                bar.appendChild(pip);
                return pip;
            });

            bar.addEventListener("mouseleave", () => {
                hoveredIndex = -1;
                updatePips();
                hideTooltip();
            });

            bar.addEventListener("click", (e) => {
                const pip = e.target.closest(".lang-level-pip");
                if (!pip) return;
                const i = parseInt(pip.dataset.levelIndex, 10);
                const state = languagePickerState[kind];
                if (!state.allowLevels || !state.selected.includes(code)) return;

                if (currentIndex === i) {
                    delete state.levels[code];
                } else {
                    state.levels[code] = LANG_LEVELS[i];
                }

                hideTooltip();
                renderLanguagePicker(kind);
            });

            updatePips();
            return bar;
        }

        function renderSelected(kind) {
            const state = languagePickerState[kind];
            const { selectedContainer, inputsContainer } = getPickerElements(kind);
            if (!selectedContainer || !inputsContainer) return;

            selectedContainer.innerHTML = "";
            inputsContainer.innerHTML = "";

            const selectedItems = state.selected
                .map((code) => state.options.find((item) => item.value === code))
                .filter(Boolean);

            if (!selectedItems.length) {
                const empty = document.createElement("div");
                empty.className = "small text-muted";
                empty.textContent = "Nothing selected yet.";
                selectedContainer.appendChild(empty);
                return;
            }

            selectedItems.forEach((item) => {
                const chip = document.createElement("div");
                chip.className = "language-selected-chip";

                const label = document.createElement("span");
                label.className = "language-selected-label";
                label.textContent = item.label;
                chip.appendChild(label);

                if (state.allowLevels) {
                    chip.appendChild(createLevelBar(kind, item.value, state.levels[item.value] || null));
                }

                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.className = "language-chip-remove";
                removeButton.dataset.action = "remove-language";
                removeButton.dataset.kind = kind;
                removeButton.dataset.value = item.value;
                removeButton.title = `Remove ${item.label}`;
                removeButton.setAttribute("aria-label", `Remove ${item.label}`);
                removeButton.innerHTML = "&times;";
                chip.appendChild(removeButton);

                selectedContainer.appendChild(chip);

                const valueInput = document.createElement("input");
                valueInput.type = "hidden";
                valueInput.name = `${kind}_languages`;
                valueInput.value = item.value;
                inputsContainer.appendChild(valueInput);

                if (state.allowLevels && state.levels[item.value] === "5") {
                    const nativeInput = document.createElement("input");
                    nativeInput.type = "hidden";
                    nativeInput.name = "offered_native_languages";
                    nativeInput.value = item.value;
                    inputsContainer.appendChild(nativeInput);
                }
            });

            if (state.allowLevels) {
                const levelsInput = document.createElement("input");
                levelsInput.type = "hidden";
                levelsInput.name = "offered_language_levels";
                levelsInput.value = JSON.stringify(state.levels);
                inputsContainer.appendChild(levelsInput);
            }
        }

        function renderLanguagePicker(kind) {
            renderLookupMenu(kind);
            renderSelected(kind);
            syncSortButtons(kind);
            syncSuggestionButtons(kind);
        }

        function addLanguage(kind, value) {
            if (!value) return;
            const state = languagePickerState[kind];
            if (state.selected.includes(value)) return;
            state.selected.push(value);
            state.query = "";
            const { lookup } = getPickerElements(kind);
            if (lookup) lookup.value = "";
            renderLanguagePicker(kind);
        }

        function removeLanguage(kind, value) {
            const state = languagePickerState[kind];
            state.selected = state.selected.filter((item) => item !== value);
            delete state.levels[value];
            renderLanguagePicker(kind);
        }

        document.querySelectorAll(".language-sort").forEach((button) => {
            button.addEventListener("click", () => {
                const kind = button.dataset.targetPicker;
                languagePickerState[kind].sortMode = button.dataset.sortMode;
                renderLanguagePicker(kind);
            });
        });

        document.getElementById("offered_language_lookup")?.addEventListener("input", (event) => {
            languagePickerState.offered.query = event.target.value || "";
            renderLanguagePicker("offered");
        });

        document.getElementById("requested_language_lookup")?.addEventListener("input", (event) => {
            languagePickerState.requested.query = event.target.value || "";
            renderLanguagePicker("requested");
        });

        document.querySelectorAll(".language-suggestion").forEach((button) => {
            button.addEventListener("click", () => {
                addLanguage(button.dataset.targetPicker, button.dataset.targetValue);
            });
        });

        document.addEventListener("click", (event) => {
            const addButton = event.target.closest('[data-action="add-language"]');
            if (addButton) {
                addLanguage(addButton.dataset.kind, addButton.dataset.value);
                return;
            }

            const removeButton = event.target.closest('[data-action="remove-language"]');
            if (removeButton) {
                removeLanguage(removeButton.dataset.kind, removeButton.dataset.value);
                return;
            }
        });

        renderLanguagePicker("offered");
        renderLanguagePicker("requested");
    };
})();
