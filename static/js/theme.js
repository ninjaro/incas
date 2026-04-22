const root = document.documentElement;
const button = document.getElementById("theme-toggle");

function getTheme() {
    return root.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
    root.setAttribute("data-bs-theme", theme);
    localStorage.setItem("theme", theme);

    if (!button) return;
    button.innerHTML = theme === "dark"
    ? '<i class="bi bi-sun"></i>'
    : '<i class="bi bi-moon-stars"></i>';
}

if (button) {
    applyTheme(getTheme());

    button.addEventListener("click", () => {
        const next = getTheme() === "dark" ? "light" : "dark";
        applyTheme(next);
    });
}
