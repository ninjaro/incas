(function () {
    window.initOccupationOther = function initOccupationOther() {
        const occupationSelect = document.getElementById("occupation");
        const occupationOtherWrapper = document.getElementById("occupation_other_wrapper");
        const occupationOtherInput = document.getElementById("occupation_other");

        function syncOccupationOther() {
            if (!occupationSelect || !occupationOtherWrapper || !occupationOtherInput) {
                return;
            }

            const isOther = occupationSelect.value === "other";
            occupationOtherWrapper.style.display = isOther ? "" : "none";
            occupationOtherInput.required = isOther;

            if (!isOther) {
                occupationOtherInput.value = "";
            }
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
                native: config.offered.native || [],
                sortMode: "alpha",
                query: "",
                allowNative: true,
            },
            requested: {
                options: config.requested.options || [],
                selected: config.requested.selected || [],
                native: [],
                sortMode: "alpha",
                query: "",
                allowNative: false,
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
                    if (diff !== 0) {
                        return diff;
                    }
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
            if (!menu) {
                return;
            }

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

        function renderSelected(kind) {
            const state = languagePickerState[kind];
            const { selectedContainer, inputsContainer } = getPickerElements(kind);

            if (!selectedContainer || !inputsContainer) {
                return;
            }

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

                if (state.allowNative) {
                    const isNative = state.native.includes(item.value);

                    const nativeToggle = document.createElement("button");
                    nativeToggle.type = "button";
                    nativeToggle.className = isNative
                    ? "language-chip-toggle is-active"
                    : "language-chip-toggle";
                    nativeToggle.dataset.action = "toggle-native";
                    nativeToggle.dataset.kind = kind;
                    nativeToggle.dataset.value = item.value;
                    nativeToggle.title = isNative ? "Marked as native" : "Mark as native";

                    const label = document.createElement("span");
                    label.className = "language-selected-label";
                    label.textContent = item.label;

                    const icon = document.createElement("i");
                    icon.className = isNative
                    ? "bi bi-star-fill language-chip-icon is-active"
                    : "bi bi-star language-chip-icon";

                    nativeToggle.appendChild(label);
                    nativeToggle.appendChild(icon);
                    chip.appendChild(nativeToggle);
                } else {
                    const label = document.createElement("span");
                    label.className = "language-selected-label";
                    label.textContent = item.label;
                    chip.appendChild(label);
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

                if (state.allowNative && state.native.includes(item.value)) {
                    const nativeInput = document.createElement("input");
                    nativeInput.type = "hidden";
                    nativeInput.name = "offered_native_languages";
                    nativeInput.value = item.value;
                    inputsContainer.appendChild(nativeInput);
                }
            });
        }

        function renderLanguagePicker(kind) {
            renderLookupMenu(kind);
            renderSelected(kind);
            syncSortButtons(kind);
            syncSuggestionButtons(kind);
        }

        function addLanguage(kind, value) {
            if (!value) {
                return;
            }

            const state = languagePickerState[kind];
            if (state.selected.includes(value)) {
                return;
            }

            state.selected.push(value);
            state.query = "";

            const { lookup } = getPickerElements(kind);
            if (lookup) {
                lookup.value = "";
            }

            renderLanguagePicker(kind);
        }

        function removeLanguage(kind, value) {
            const state = languagePickerState[kind];
            state.selected = state.selected.filter((item) => item !== value);
            state.native = state.native.filter((item) => item !== value);
            renderLanguagePicker(kind);
        }

        function toggleNativeLanguage(value) {
            const state = languagePickerState.offered;

            if (!state.selected.includes(value)) {
                return;
            }

            if (state.native.includes(value)) {
                state.native = state.native.filter((item) => item !== value);
            } else {
                state.native.push(value);
            }

            renderLanguagePicker("offered");
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

            const nativeButton = event.target.closest('[data-action="toggle-native"]');
            if (nativeButton) {
                toggleNativeLanguage(nativeButton.dataset.value);
                return;
            }
        });

        renderLanguagePicker("offered");
        renderLanguagePicker("requested");
    };
})();
