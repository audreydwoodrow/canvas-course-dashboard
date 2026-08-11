export function renderAnnouncements(container, items) {
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = '<div class="list-empty">No announcements.</div>';
    return;
  }

  for (const a of items) {
    const card = document.createElement("div");
    card.className = "item-card";

    const posted = a.posted_at ? new Date(a.posted_at).toLocaleDateString() : "";

    card.innerHTML = `
      <div class="item-card-title">${escapeHtml(a.title || "")}</div>
      <div class="item-card-sub">${escapeHtml(a.course || "")}${posted ? " · " + posted : ""}</div>
    `;
    card.style.cursor = a.url ? "pointer" : "default";
    if (a.url) card.addEventListener("click", () => window.open(a.url, "_blank"));

    container.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
