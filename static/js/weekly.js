const DAY_LABELS = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];

export function renderWeeklyView(els, data, { onAdd, onToggle, onRemove }) {
  const { gridEl, horizonListEl, horizonFormEl, rangeEl } = els;

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
        day,
        title: DAY_LABELS[day],
        subtitle: formatShort(date),
        items: byDay[day] || [],
        onAdd,
        onToggle,
        onRemove,
      })
    );
  });

  renderItems(horizonListEl, byDay["horizon"] || [], onToggle, onRemove, true);

  horizonFormEl.onsubmit = (evt) => {
    evt.preventDefault();
    const input = horizonFormEl.querySelector("input");
    const title = input.value.trim();
    if (!title) return;
    onAdd("horizon", title);
    input.value = "";
  };
}

function buildColumn({ day, title, subtitle, items, onAdd, onToggle, onRemove }) {
  const col = document.createElement("div");
  col.className = "weekly-col";

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
    const value = input.value.trim();
    if (!value) return;
    onAdd(day, value);
    input.value = "";
  });
  col.appendChild(form);

  const list = document.createElement("div");
  list.className = "weekly-list";
  renderItems(list, items, onToggle, onRemove);
  col.appendChild(list);

  return col;
}

function renderItems(container, items, onToggle, onRemove, isHorizon) {
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = `<div class="list-empty">${isHorizon ? "Nothing on the horizon." : "Nothing yet."}</div>`;
    return;
  }
  for (const item of items) {
    container.appendChild(buildItem(item, onToggle, onRemove, isHorizon));
  }
}

function buildItem(item, onToggle, onRemove, isHorizon) {
  const row = document.createElement("div");
  row.className = "weekly-item" + (item.done ? " done" : "") + (isHorizon ? " weekly-item-horizon" : "");

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
