export function renderTodos(container, todos, { onToggle, onRemove }) {
  container.innerHTML = "";

  if (todos.length === 0) {
    container.innerHTML = '<div class="list-empty">Nothing on the list.</div>';
    return;
  }

  for (const t of todos) {
    const card = document.createElement("div");
    card.className = "item-card todo-card" + (t.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.done;
    checkbox.addEventListener("change", () => onToggle(t.id, checkbox.checked));

    const title = document.createElement("div");
    title.className = "todo-title";
    title.textContent = t.title;

    const date = document.createElement("div");
    date.className = "todo-date";
    date.textContent = t.date || "";

    const remove = document.createElement("button");
    remove.className = "todo-remove";
    remove.textContent = "×";
    remove.title = "Delete";
    remove.addEventListener("click", () => onRemove(t.id));

    card.append(checkbox, title, date, remove);
    container.appendChild(card);
  }
}
