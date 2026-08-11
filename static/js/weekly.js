const DAY_LABELS = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];

export function renderWeeklyView(gridEl, rangeEl, data, { onAdd, onToggle, onRemove }) {
  const weekStart = parseLocalDate(data.week_start);
  const weekEnd = addDays(weekStart, 5);
  rangeEl.textContent = `Week of ${formatShort(weekStart)} – ${formatShort(weekEnd)}`;

  const byDay = data.items.reduce((acc, item) => {
    (acc[item.day] = acc[item.day] || []).push(item);
    return acc;
  }, {});

  gridEl.innerHTML = "";

  DAY_ORDER.forEach((day, i) => {
    const date = addDays(weekStart, i);
    gridEl.appendChild(
      buildColumn({
        key: day,
        title: DAY_LABELS[day],
        subtitle: formatShort(date),
        items: byDay[day] || [],
        onAdd,
        onToggle,
        onRemove,
      })
    );
  });

  gridEl.appendChild(
    buildColumn({
      key: "horizon",
      title: "Horizon",
      subtitle: "stays until deleted",
      items: byDay["horizon"] || [],
      onAdd,
      onToggle,
      onRemove,
      isHorizon: true,
    })
  );
}

function buildColumn({ key, title, subtitle, items, onAdd, onToggle, onRemove, isHorizon }) {
  const col = document.createElement("div");
  col.className = "weekly-col" + (isHorizon ? " weekly-col-horizon" : "");

  col.innerHTML = `
    <div class="weekly-col-header">
      <div class="weekly-col-title">${title}</div>
      <div class="weekly-col-subtitle">${subtitle}</div>
    </div>
  `;

  const form = document.createElement("form");
  form.className = "weekly-add-form";
  form.innerHTML = `<input type="text" placeholder="Add a task..." required />`;
  form.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const input = form.querySelector("input");
    const title = input.value.trim();
    if (!title) return;
    onAdd(key, title);
    input.value = "";
  });
  col.appendChild(form);

  const list = document.createElement("div");
  list.className = "weekly-list";
  if (items.length === 0) {
    list.innerHTML = '<div class="list-empty">Nothing yet.</div>';
  } else {
    for (const item of items) {
      list.appendChild(buildItem(item, onToggle, onRemove));
    }
  }
  col.appendChild(list);

  return col;
}

function buildItem(item, onToggle, onRemove) {
  const row = document.createElement("div");
  row.className = "weekly-item" + (item.done ? " done" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.done;
  checkbox.addEventListener("change", () => onToggle(item.id, checkbox.checked));

  const title = document.createElement("div");
  title.className = "weekly-item-title";
  title.textContent = item.title;

  const remove = document.createElement("button");
  remove.className = "todo-remove";
  remove.type = "button";
  remove.textContent = "×";
  remove.title = "Delete";
  remove.addEventListener("click", () => onRemove(item.id));

  row.append(checkbox, title, remove);
  return row;
}

function parseLocalDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatShort(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
