import { api } from "./api.js";
import { initCalendar, setCalendarEvents } from "./calendar.js";
import { renderAnnouncements } from "./announcements.js";
import { renderGrades } from "./grades.js";
import { renderTodos } from "./todos.js";
import { renderWeeklyView } from "./weekly.js";

const setupModal = document.getElementById("setup-modal");
const setupForm = document.getElementById("setup-form");
const setupError = document.getElementById("setup-error");

const gradeModal = document.getElementById("grade-modal");
const gradeForm = document.getElementById("grade-form");

let calendar = null;

async function loadCanvasData() {
  try {
    const events = await api.getEvents();
    if (calendar) setCalendarEvents(calendar, events);
    else calendar = initCalendar(document.getElementById("calendar"), events);
  } catch (e) {
    console.error("Failed to load calendar events", e);
  }

  try {
    const announcements = await api.getAnnouncements();
    renderAnnouncements(document.getElementById("announcements-list"), announcements);
  } catch (e) {
    console.error("Failed to load announcements", e);
  }
}

async function loadGrades() {
  const grades = await api.getGrades();
  renderGrades(document.getElementById("grades-list"), grades, { onClick: openGradeModal });
}

async function loadTodos() {
  const todos = await api.getTodos();
  renderTodos(document.getElementById("todo-list"), todos, {
    onToggle: async (id, done) => {
      await api.updateTodo(id, { done });
      loadTodos();
      loadCalendarOnly();
    },
    onRemove: async (id) => {
      await api.deleteTodo(id);
      loadTodos();
      loadCalendarOnly();
    },
  });
}

async function loadCalendarOnly() {
  const events = await api.getEvents();
  if (calendar) setCalendarEvents(calendar, events);
}

async function loadWeekly() {
  const data = await api.getWeeklyTodos();
  const els = {
    gridEl: document.getElementById("weekly-grid"),
    horizonListEl: document.getElementById("weekly-horizon-list"),
    horizonFormEl: document.getElementById("horizon-add-form"),
    rangeEl: document.getElementById("weekly-range"),
  };
  renderWeeklyView(els, data, {
    onAdd: async (day, title) => {
      await api.createWeeklyTodo({ day, title });
      loadWeekly();
    },
    onAddSub: async (parentId, title) => {
      await api.createWeeklyTodo({ parent_id: parentId, title });
      loadWeekly();
    },
    onToggle: async (id, done) => {
      await api.updateWeeklyTodo(id, { done });
      loadWeekly();
    },
    onRemove: async (id) => {
      await api.deleteWeeklyTodo(id);
      loadWeekly();
    },
    onReorder: async (ids) => {
      await api.reorderWeeklyTodos(ids);
      loadWeekly();
    },
  });
}

function openGradeModal(grade) {
  document.getElementById("grade-modal-title").textContent = grade ? "Edit grade" : "Add grade";
  document.getElementById("grade-id").value = grade ? grade.id : "";
  document.getElementById("grade-course").value = grade ? grade.course : "";
  document.getElementById("grade-item-name").value = grade ? grade.item_name : "";
  document.getElementById("grade-item-type").value = grade ? grade.item_type : "assignment";
  document.getElementById("grade-score").value = grade ? grade.score || "" : "";
  document.getElementById("grade-median").value = grade ? grade.median || "" : "";
  document.getElementById("grade-comment").value = grade ? grade.comment || "" : "";
  document.getElementById("grade-hidden").checked = grade ? grade.hidden : false;
  document.getElementById("grade-delete").hidden = !grade;
  gradeModal.showModal();
}

document.getElementById("add-grade-btn").addEventListener("click", () => openGradeModal(null));
document.getElementById("grade-cancel").addEventListener("click", () => gradeModal.close());

gradeForm.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const id = document.getElementById("grade-id").value;
  const payload = {
    course: document.getElementById("grade-course").value.trim(),
    item_name: document.getElementById("grade-item-name").value.trim(),
    item_type: document.getElementById("grade-item-type").value,
    score: document.getElementById("grade-score").value.trim(),
    median: document.getElementById("grade-median").value.trim(),
    comment: document.getElementById("grade-comment").value.trim(),
    hidden: document.getElementById("grade-hidden").checked,
  };
  if (id) await api.updateGrade(id, payload);
  else await api.createGrade(payload);
  gradeModal.close();
  loadGrades();
});

document.getElementById("grade-delete").addEventListener("click", async () => {
  const id = document.getElementById("grade-id").value;
  if (id) await api.deleteGrade(id);
  gradeModal.close();
  loadGrades();
});

document.getElementById("todo-form").addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const titleEl = document.getElementById("todo-title");
  const dateEl = document.getElementById("todo-date");
  await api.createTodo({ title: titleEl.value.trim(), date: dateEl.value || null });
  titleEl.value = "";
  dateEl.value = "";
  loadTodos();
  loadCalendarOnly();
});

document.getElementById("refresh-btn").addEventListener("click", () => {
  loadCanvasData();
  loadGrades();
  loadTodos();
  loadWeekly();
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    document.querySelectorAll(".tab-view").forEach((view) => {
      view.hidden = view.id !== target;
    });
  });
});

document.getElementById("settings-btn").addEventListener("click", () => openSetupModal());

function openSetupModal() {
  api.getSetupStatus().then((status) => {
    document.getElementById("canvas-domain").value = status.canvas_domain || "";
  });
  setupError.hidden = true;
  setupModal.showModal();
}

document.getElementById("setup-cancel").addEventListener("click", () => setupModal.close());

setupForm.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  setupError.hidden = true;
  const domain = document.getElementById("canvas-domain").value.trim();
  const token = document.getElementById("canvas-token").value.trim();
  try {
    await api.saveSetup(domain, token);
    setupModal.close();
    loadCanvasData();
  } catch (e) {
    setupError.textContent = e.message;
    setupError.hidden = false;
  }
});

async function init() {
  await loadTodos();
  await loadGrades();
  await loadWeekly();

  const status = await api.getSetupStatus();
  if (!status.configured) {
    openSetupModal();
  } else {
    loadCanvasData();
  }
}

init();
