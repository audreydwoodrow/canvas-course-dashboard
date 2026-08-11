const TYPE_LABELS = {
  assignment: "Assignment",
  quiz: "Quiz",
  midterm: "Midterm",
  final: "Final",
  other: "Other",
};

export function renderGrades(container, grades, { onClick }) {
  container.innerHTML = "";

  if (grades.length === 0) {
    container.innerHTML = '<div class="list-empty">No grades added yet.</div>';
    return;
  }

  const byCourse = grades.reduce((acc, g) => {
    (acc[g.course] = acc[g.course] || []).push(g);
    return acc;
  }, {});

  for (const [course, items] of Object.entries(byCourse)) {
    const heading = document.createElement("div");
    heading.className = "item-card-sub";
    heading.style.marginTop = "4px";
    heading.textContent = course;
    container.appendChild(heading);

    for (const g of items) {
      const card = document.createElement("div");
      card.className = "item-card grade-card" + (g.hidden ? " grade-hidden" : "");

      const left = document.createElement("div");
      left.innerHTML = `<div class="item-card-title">${escapeHtml(g.item_name)}</div>
        <div class="item-card-sub">${TYPE_LABELS[g.item_type] || g.item_type}</div>`;

      const right = document.createElement("div");
      right.style.textAlign = "right";
      const scoreText = g.score ? escapeHtml(g.score) : "";
      const medianText = g.median ? `median ${escapeHtml(g.median)}` : "";
      right.innerHTML = `<div class="grade-score">${scoreText}</div>
        <div class="grade-median">${medianText}</div>`;

      card.appendChild(left);
      card.appendChild(right);
      card.addEventListener("click", () => onClick(g));
      container.appendChild(card);
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
