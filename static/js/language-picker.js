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

    window.initCountryLookup = function initCountryLookup(config) {
        const lookup = document.getElementById(config.lookupId || "country_of_origin_lookup");
        const hidden = document.getElementById(config.hiddenId || "country_of_origin");
        const menu = document.getElementById(config.menuId || "country_of_origin_menu");

        if (!lookup || !hidden || !menu) return;

        const options = (config.options || []).map((item) => ({
            value: item.value || item.code,
            label: item.label,
        })).filter((item) => item.value && item.label);

        let query = "";
        let isOpen = false;

        if (!hidden.value && config.selected) {
            hidden.value = config.selected;
        }

        function getSelectedOption() {
            return options.find((item) => item.value === hidden.value);
        }

        function getFilteredOptions() {
            const normalizedQuery = query.trim().toLowerCase();
            if (!normalizedQuery) return options;

            return options.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
        }

        function syncTypedValue() {
            const typedValue = lookup.value.trim().toLowerCase();

            if (!typedValue) {
                hidden.value = "";
                return;
            }

            const exactMatch = options.find((item) => item.label.toLowerCase() === typedValue);
            hidden.value = exactMatch ? exactMatch.value : "";
        }

        function selectCountry(value) {
            const option = options.find((item) => item.value === value);
            hidden.value = option ? option.value : "";
            lookup.value = option ? option.label : "";
            query = "";
            isOpen = false;
            renderCountryMenu();
        }

        function renderCountryMenu() {
            lookup.setAttribute("role", "combobox");
            lookup.setAttribute("aria-autocomplete", "list");
            lookup.setAttribute("aria-controls", menu.id);
            lookup.setAttribute("aria-expanded", isOpen ? "true" : "false");

            menu.setAttribute("role", "listbox");
            menu.classList.toggle("is-open", isOpen);
            menu.innerHTML = "";

            if (!isOpen) return;

            const items = getFilteredOptions();

            if (!items.length) {
                const empty = document.createElement("button");
                empty.type = "button";
                empty.className = "language-lookup-item";
                empty.disabled = true;
                empty.setAttribute("role", "option");
                empty.textContent = "No countries found";
                menu.appendChild(empty);
                return;
            }

            items.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "language-lookup-item";
                button.dataset.countryValue = item.value;
                button.setAttribute("role", "option");
                button.setAttribute("aria-selected", hidden.value === item.value ? "true" : "false");
                button.textContent = item.label;
                menu.appendChild(button);
            });
        }

        const selectedOption = getSelectedOption();
        if (selectedOption) {
            lookup.value = selectedOption.label;
        }

        lookup.addEventListener("input", () => {
            query = lookup.value || "";
            isOpen = true;
            syncTypedValue();
            renderCountryMenu();
        });

        lookup.addEventListener("focus", () => {
            query = lookup.value || "";
            isOpen = true;
            renderCountryMenu();
        });

        lookup.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                isOpen = false;
                renderCountryMenu();
                return;
            }

            if (event.key === "Enter") {
                const firstItem = getFilteredOptions()[0];
                if (firstItem) {
                    event.preventDefault();
                    selectCountry(firstItem.value);
                }
                return;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                isOpen = true;
                renderCountryMenu();
                menu.querySelector(".language-lookup-item:not(:disabled)")?.focus();
            }
        });

        menu.addEventListener("click", (event) => {
            const button = event.target.closest("[data-country-value]");
            if (!button) return;
            selectCountry(button.dataset.countryValue);
            lookup.focus();
        });

        menu.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                isOpen = false;
                renderCountryMenu();
                lookup.focus();
                return;
            }

            if (event.key === "Enter") {
                const button = event.target.closest("[data-country-value]");
                if (button) {
                    event.preventDefault();
                    selectCountry(button.dataset.countryValue);
                    lookup.focus();
                }
            }
        });

        lookup.form?.addEventListener("submit", syncTypedValue);

        document.addEventListener("click", (event) => {
            if (lookup.contains(event.target) || menu.contains(event.target)) return;
            if (!isOpen) return;
            isOpen = false;
            renderCountryMenu();
        });

        renderCountryMenu();
    };

    window.initLanguagePicker = function initLanguagePicker(config) {
        const languagePickerState = {
            offered: {
                options: config.offered.options || [],
                selected: config.offered.selected || [],
                levels: config.offered.levels || {},
                sortMode: "alpha",
                query: "",
                isOpen: false,
                activeValue: "",
                allowLevels: true,
            },
            requested: {
                options: config.requested.options || [],
                selected: config.requested.selected || [],
                levels: {},
                sortMode: "alpha",
                query: "",
                isOpen: false,
                activeValue: "",
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

        function getActiveItem(kind, items) {
            const state = languagePickerState[kind];
            const availableItems = items || getAvailableItems(kind);

            if (!state.isOpen || !availableItems.length) {
                state.activeValue = "";
                return null;
            }

            const activeItem = availableItems.find((item) => item.value === state.activeValue);
            if (activeItem) {
                return activeItem;
            }

            state.activeValue = availableItems[0].value;
            return availableItems[0];
        }

        function moveActiveItem(kind, direction) {
            const state = languagePickerState[kind];
            const items = getAvailableItems(kind);

            if (!items.length) {
                state.activeValue = "";
                return null;
            }

            if (!state.isOpen) {
                state.isOpen = true;
                state.activeValue = direction < 0 ? items[items.length - 1].value : items[0].value;
                return items.find((item) => item.value === state.activeValue) || null;
            }

            const currentIndex = items.findIndex((item) => item.value === state.activeValue);
            const baseIndex = currentIndex >= 0 ? currentIndex : (direction < 0 ? items.length : -1);
            const nextIndex = Math.max(0, Math.min(items.length - 1, baseIndex + direction));
            state.activeValue = items[nextIndex].value;
            return items[nextIndex];
        }

        function setActiveBoundary(kind, boundary) {
            const state = languagePickerState[kind];
            const items = getAvailableItems(kind);

            if (!state.isOpen || !items.length) {
                return null;
            }

            state.activeValue = boundary === "last" ? items[items.length - 1].value : items[0].value;
            return items.find((item) => item.value === state.activeValue) || null;
        }

        function closePicker(kind) {
            const state = languagePickerState[kind];
            state.isOpen = false;
            state.activeValue = "";
        }

        function focusLookup(kind) {
            getPickerElements(kind).lookup?.focus();
        }

        function scrollActiveItemIntoView(kind) {
            getPickerElements(kind).menu
                ?.querySelector(".language-lookup-item.is-active")
                ?.scrollIntoView({ block: "nearest" });
        }

        function getLevelLabel(level) {
            const index = LANG_LEVELS.indexOf(level);
            return index >= 0 ? LEVEL_LABELS[index] : "Set level";
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
            const { lookup, menu } = getPickerElements(kind);
            if (!menu) return;

            const items = getAvailableItems(kind);
            const activeItem = getActiveItem(kind, items);

            if (lookup) {
                lookup.setAttribute("role", "combobox");
                lookup.setAttribute("aria-autocomplete", "list");
                lookup.setAttribute("aria-haspopup", "listbox");
                lookup.setAttribute("aria-controls", `${kind}_language_menu`);
                lookup.setAttribute("aria-expanded", state.isOpen ? "true" : "false");
                if (state.isOpen && activeItem) {
                    lookup.setAttribute("aria-activedescendant", `${kind}_language_option_${activeItem.value}`);
                } else {
                    lookup.removeAttribute("aria-activedescendant");
                }
            }

            menu.setAttribute("role", "listbox");
            menu.classList.toggle("is-open", state.isOpen);
            menu.innerHTML = "";

            if (!state.isOpen) {
                return;
            }

            if (!items.length) {
                const empty = document.createElement("button");
                empty.type = "button";
                empty.className = "language-lookup-item";
                empty.disabled = true;
                empty.tabIndex = -1;
                empty.setAttribute("role", "option");
                empty.textContent = state.query.trim() ? "No matches" : "No languages left to add";
                menu.appendChild(empty);
                return;
            }

            items.forEach((item) => {
                const isActive = activeItem?.value === item.value;
                const button = document.createElement("button");
                button.type = "button";
                button.className = "language-lookup-item";
                button.dataset.action = "add-language";
                button.dataset.kind = kind;
                button.dataset.value = item.value;
                button.id = `${kind}_language_option_${item.value}`;
                button.tabIndex = -1;
                button.setAttribute("role", "option");
                button.setAttribute("aria-selected", isActive ? "true" : "false");
                button.classList.toggle("is-active", isActive);
                button.textContent = item.label;
                button.addEventListener("mousedown", (event) => event.preventDefault());
                menu.appendChild(button);
            });
        }

        function createLevelBar(kind, code, currentLevel) {
            const bar = document.createElement("div");
            bar.className = "lang-level-bar";
            bar.setAttribute("role", "group");
            bar.setAttribute("aria-label", "Proficiency level");

            const currentIndex = currentLevel ? LANG_LEVELS.indexOf(currentLevel) : -1;
            let hoveredIndex = -1;

            function updatePips() {
                const activeIndex = hoveredIndex >= 0 ? hoveredIndex : currentIndex;
                pips.forEach((pip, i) => {
                    pip.classList.toggle("is-active", activeIndex >= 0 && i <= activeIndex);
                    pip.setAttribute("aria-pressed", currentIndex === i ? "true" : "false");
                });
            }

            const pips = LANG_LEVELS.map((_level, i) => {
                const pip = document.createElement("button");
                pip.type = "button";
                pip.className = "lang-level-pip";
                pip.dataset.levelIndex = i;
                pip.textContent = String(i + 1);
                pip.title = LEVEL_LABELS[i];
                pip.setAttribute("aria-label", LEVEL_LABELS[i]);

                pip.addEventListener("mouseenter", () => {
                    hoveredIndex = i;
                    updatePips();
                    showTooltip(pip, LEVEL_LABELS[i]);
                });

                pip.addEventListener("focus", () => {
                    showTooltip(pip, LEVEL_LABELS[i]);
                });

                pip.addEventListener("blur", hideTooltip);

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
                label.textContent = state.allowLevels
                    ? `${item.label} - ${getLevelLabel(state.levels[item.value])}`
                    : item.label;
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
                removeButton.addEventListener("mousedown", (event) => event.preventDefault());
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
            if (languagePickerState[kind].isOpen) {
                scrollActiveItemIntoView(kind);
            }
        }

        function addLanguage(kind, value) {
            if (!value) return;
            const state = languagePickerState[kind];
            if (state.selected.includes(value)) return;
            state.selected.push(value);
            state.query = "";
            closePicker(kind);
            const { lookup } = getPickerElements(kind);
            if (lookup) {
                lookup.value = "";
            }
            renderLanguagePicker(kind);
            focusLookup(kind);
        }

        function removeLanguage(kind, value) {
            const state = languagePickerState[kind];
            state.selected = state.selected.filter((item) => item !== value);
            delete state.levels[value];
            renderLanguagePicker(kind);
            focusLookup(kind);
        }

        document.querySelectorAll(".language-sort").forEach((button) => {
            button.addEventListener("click", () => {
                const kind = button.dataset.targetPicker;
                languagePickerState[kind].sortMode = button.dataset.sortMode;
                renderLanguagePicker(kind);
            });
        });

        ["offered", "requested"].forEach((kind) => {
            const { lookup } = getPickerElements(kind);
            if (!lookup) return;

            lookup.addEventListener("input", (event) => {
                languagePickerState[kind].query = event.target.value || "";
                languagePickerState[kind].isOpen = true;
                getActiveItem(kind);
                renderLanguagePicker(kind);
            });

            lookup.addEventListener("focus", () => {
                languagePickerState[kind].isOpen = true;
                getActiveItem(kind);
                renderLanguagePicker(kind);
            });

            lookup.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    if (!languagePickerState[kind].isOpen) {
                        return;
                    }

                    event.preventDefault();
                    closePicker(kind);
                    renderLanguagePicker(kind);
                    return;
                }

                if (event.key === "Enter") {
                    const activeItem = languagePickerState[kind].isOpen
                        ? getActiveItem(kind)
                        : getAvailableItems(kind)[0];
                    if (activeItem) {
                        event.preventDefault();
                        addLanguage(kind, activeItem.value);
                    }
                    return;
                }

                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveActiveItem(kind, 1);
                    renderLanguagePicker(kind);
                    return;
                }

                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveActiveItem(kind, -1);
                    renderLanguagePicker(kind);
                    return;
                }

                if (event.key === "Home" && languagePickerState[kind].isOpen) {
                    event.preventDefault();
                    setActiveBoundary(kind, "first");
                    renderLanguagePicker(kind);
                    return;
                }

                if (event.key === "End" && languagePickerState[kind].isOpen) {
                    event.preventDefault();
                    setActiveBoundary(kind, "last");
                    renderLanguagePicker(kind);
                }
            });
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

            ["offered", "requested"].forEach((kind) => {
                const { lookup, menu } = getPickerElements(kind);
                if (!lookup || !menu) return;
                if (lookup.contains(event.target) || menu.contains(event.target)) return;
                if (!languagePickerState[kind].isOpen) return;
                closePicker(kind);
                renderLanguagePicker(kind);
            });
        });

        renderLanguagePicker("offered");
        renderLanguagePicker("requested");
    };
})();
