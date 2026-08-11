const DAY_LABELS = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];

// Whether the "add a subtask" input is open per task, kept across re-renders within the
// page session. This only ever controls the add-subtask input — existing subtasks are
// always visible regardless of this state.
const addFormState = new Map();

function isAddFormOpen(taskId) {
  return addFormState.get(taskId) || false;
}

export function renderWeeklyView(els, data, handlers) {
  const { gridEl, horizonListEl, horizonFormEl, rangeEl } = els;

  const weekStart = parseLocalDate(data.week_start);
  const weekEnd = addDays(weekStart, 5);
  rangeEl.textContent = `Week of ${formatShort(weekStart)} – ${formatShort(weekEnd)}`;

  const topLevelLists = [];

  gridEl.innerHTML = "";
  DAY_ORDER.forEach((day, i) => {
    const date = addDays(weekStart, i);
    const { col, list } = buildColumn({
      day,
      title: DAY_LABELS[day],
      subtitle: formatShort(date),
      tasks: data.items[day] || [],
      handlers,
    });
    gridEl.appendChild(col);
    topLevelLists.push(list);
  });

  renderTaskList(horizonListEl, data.items["horizon"] || [], handlers, true);
  horizonListEl.dataset.day = "horizon";
  topLevelLists.push(horizonListEl);

  // Day columns + Horizon share one drag system so a task can be dragged
  // across any of them, not just reordered within its own list.
  enableCrossListDrag(topLevelLists, handlers.onMove);

  horizonFormEl.onsubmit = (evt) => {
    evt.preventDefault();
    const input = horizonFormEl.querySelector("input");
    const title = input.value.trim();
    if (!title) return;
    handlers.onAdd("horizon", title);
    input.value = "";
  };
}

function buildColumn({ day, title, subtitle, tasks, handlers }) {
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
    handlers.onAdd(day, value);
    input.value = "";
  });
  col.appendChild(form);

  const list = document.createElement("div");
  list.className = "weekly-list";
  list.dataset.day = day;
  renderTaskList(list, tasks, handlers, false);
  col.appendChild(list);

  return { col, list };
}

function renderTaskList(container, tasks, handlers, isHorizon) {
  container.innerHTML = "";
  if (tasks.length === 0) {
    container.innerHTML = `<div class="list-empty">${isHorizon ? "Nothing on the horizon." : "Nothing yet."}</div>`;
    return;
  }
  for (const task of tasks) {
    container.appendChild(buildTaskWrapper(task, handlers));
  }
}

function buildTaskWrapper(task, handlers) {
  const wrapper = document.createElement("div");
  wrapper.className = "weekly-task dnd-item";
  wrapper.draggable = true;
  wrapper.dataset.id = task.id;

  // Existing subtasks are always visible — the arrow never affects this list.
  const subList = document.createElement("div");
  subList.className = "weekly-subtask-list";
  for (const sub of task.subtasks || []) {
    subList.appendChild(buildSubtaskWrapper(sub, handlers));
  }
  enableDragReorder(subList, handlers.onReorder);

  // The arrow only shows/hides this add-subtask input.
  const subForm = document.createElement("form");
  subForm.className = "weekly-add-subtask-form";
  subForm.innerHTML = `<input type="text" placeholder="+ subtask" />`;
  subForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const input = subForm.querySelector("input");
    const value = input.value.trim();
    if (!value) return;
    handlers.onAddSub(task.id, value);
    input.value = "";
  });

  const formOpen = isAddFormOpen(task.id);
  subForm.style.display = formOpen ? "block" : "none";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "weekly-expand-toggle";
  toggle.textContent = formOpen ? "▴" : "▾";
  toggle.title = "Add a subtask";
  toggle.addEventListener("click", () => {
    const next = !isAddFormOpen(task.id);
    addFormState.set(task.id, next);
    subForm.style.display = next ? "block" : "none";
    toggle.textContent = next ? "▴" : "▾";
    if (next) subForm.querySelector("input").focus();
  });

  const row = buildItemRow(task, handlers, false);
  row.prepend(toggle);

  wrapper.appendChild(row);
  if ((task.subtasks || []).length > 0) wrapper.appendChild(subList);
  wrapper.appendChild(subForm);
  return wrapper;
}

function buildSubtaskWrapper(sub, handlers) {
  const wrapper = document.createElement("div");
  wrapper.className = "weekly-subtask dnd-item";
  wrapper.draggable = true;
  wrapper.dataset.id = sub.id;
  wrapper.appendChild(buildItemRow(sub, handlers, true));
  return wrapper;
}

function buildItemRow(task, handlers, isSub) {
  const row = document.createElement("div");
  row.className = "weekly-item" + (task.done ? " done" : "") + (isSub ? " weekly-item-sub" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.addEventListener("change", () => handlers.onToggle(task.id, checkbox.checked));

  const title = document.createElement("div");
  title.className = "weekly-item-title";
  title.textContent = task.title;

  const remove = document.createElement("button");
  remove.className = "todo-remove";
  remove.type = "button";
  remove.textContent = "×";
  remove.title = "Delete";
  remove.addEventListener("click", () => handlers.onRemove(task.id));

  row.append(checkbox, title, remove);
  return row;
}

/* Native HTML5 drag-and-drop reordering, scoped to direct children of listEl.
   stopPropagation + parentElement checks keep nested subtask-lists from
   being hijacked by an ancestor day-column's drag handling. */
function enableDragReorder(listEl, onReorder) {
  let draggingEl = null;

  listEl.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".dnd-item");
    if (!item || item.parentElement !== listEl) return;
    e.stopPropagation();
    draggingEl = item;
    requestAnimationFrame(() => item.classList.add("dragging"));
  });

  listEl.addEventListener("dragend", (e) => {
    if (!draggingEl || draggingEl.parentElement !== listEl) return;
    e.stopPropagation();
    draggingEl.classList.remove("dragging");
    const ids = Array.from(listEl.querySelectorAll(":scope > .dnd-item")).map((el) => Number(el.dataset.id));
    draggingEl = null;
    onReorder(ids);
  });

  listEl.addEventListener("dragover", (e) => {
    if (!draggingEl || draggingEl.parentElement !== listEl) return;
    e.preventDefault();
    e.stopPropagation();
    const after = getDragAfterElement(listEl, e.clientY);
    if (after == null) listEl.appendChild(draggingEl);
    else listEl.insertBefore(draggingEl, after);
  });
}

/* Drag system shared across every day column + Horizon, so a task can be
   dragged out of its own list and dropped into a different day (or Horizon).
   A single shared draggingEl means whichever list's dragover the pointer is
   currently over can adopt the element; dragend fires on whatever list the
   element actually ended up in (real DOM ancestry), reads that list's
   data-day, and reports both the new day and the final order in that list. */
function enableCrossListDrag(lists, onMove) {
  let draggingEl = null;

  for (const listEl of lists) {
    listEl.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".dnd-item.weekly-task");
      if (!item || item.parentElement !== listEl) return;
      e.stopPropagation();
      draggingEl = item;
      requestAnimationFrame(() => item.classList.add("dragging"));
    });

    listEl.addEventListener("dragover", (e) => {
      if (!draggingEl) return;
      e.preventDefault();
      e.stopPropagation();
      const after = getDragAfterElement(listEl, e.clientY);
      if (after == null) listEl.appendChild(draggingEl);
      else listEl.insertBefore(draggingEl, after);
    });

    listEl.addEventListener("dragend", (e) => {
      if (!draggingEl || draggingEl.parentElement !== listEl) return;
      e.stopPropagation();
      draggingEl.classList.remove("dragging");
      const ids = Array.from(listEl.querySelectorAll(":scope > .dnd-item")).map((el) => Number(el.dataset.id));
      const taskId = Number(draggingEl.dataset.id);
      const newDay = listEl.dataset.day;
      draggingEl = null;
      onMove(taskId, newDay, ids);
    });
  }
}

function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll(":scope > .dnd-item:not(.dragging)")];
  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
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
