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

const eventModal = document.getElementById("event-modal");
const eventForm = document.getElementById("event-form");

let calendar = null;

async function loadCanvasData() {
  try {
    const events = await api.getEvents();
    if (calendar) setCalendarEvents(calendar, events);
    else {
      calendar = initCalendar(document.getElementById("calendar"), events, {
        onDateClick: (dateStr) => openEventModal(null, dateStr),
        onEventClick: (series) => openEventModal(series),
      });
    }
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
    onMove: async (taskId, day, ids) => {
      await api.moveWeeklyTodo(taskId, day, ids);
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

function updateEventFormVisibility() {
  const allDay = document.getElementById("event-all-day").checked;
  document.getElementById("event-time-fields").hidden = allDay;

  const repeats = document.getElementById("event-repeat-freq").value !== "none";
  document.getElementById("event-repeat-until-field").hidden = !repeats;
}

function openEventModal(series, dateStr) {
  document.getElementById("event-error").hidden = true;
  document.getElementById("event-modal-title").textContent = series ? "Edit event" : "Add event";
  document.getElementById("event-id").value = series ? series.id : "";
  document.getElementById("event-title").value = series ? series.title : "";
  document.getElementById("event-date").value = series ? series.date : dateStr || "";
  document.getElementById("event-all-day").checked = series ? series.all_day : false;
  document.getElementById("event-start-time").value = series ? series.start_time || "" : "";
  document.getElementById("event-end-time").value = series ? series.end_time || "" : "";
  document.getElementById("event-location").value = series ? series.location || "" : "";
  document.getElementById("event-notes").value = series ? series.notes || "" : "";
  document.getElementById("event-repeat-freq").value = series ? series.repeat_freq : "none";
  document.getElementById("event-repeat-until").value = series ? series.repeat_until || "" : "";
  document.getElementById("event-delete").hidden = !series;
  updateEventFormVisibility();
  eventModal.showModal();
}

document.getElementById("add-event-btn").addEventListener("click", () => openEventModal(null));
document.getElementById("event-cancel").addEventListener("click", () => eventModal.close());
document.getElementById("event-all-day").addEventListener("change", updateEventFormVisibility);
document.getElementById("event-repeat-freq").addEventListener("change", updateEventFormVisibility);

eventForm.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const errorEl = document.getElementById("event-error");
  errorEl.hidden = true;

  const id = document.getElementById("event-id").value;
  const allDay = document.getElementById("event-all-day").checked;
  const repeatFreq = document.getElementById("event-repeat-freq").value;
  const repeatUntil = document.getElementById("event-repeat-until").value;

  if (repeatFreq === "weekly" && !repeatUntil) {
    errorEl.textContent = "Pick a stop date for the repeat, or set it to \"Does not repeat\".";
    errorEl.hidden = false;
    return;
  }

  const payload = {
    title: document.getElementById("event-title").value.trim(),
    date: document.getElementById("event-date").value,
    all_day: allDay,
    start_time: allDay ? null : document.getElementById("event-start-time").value || null,
    end_time: allDay ? null : document.getElementById("event-end-time").value || null,
    location: document.getElementById("event-location").value.trim(),
    notes: document.getElementById("event-notes").value.trim(),
    repeat_freq: repeatFreq,
    repeat_until: repeatFreq === "weekly" ? repeatUntil : null,
  };

  try {
    if (id) await api.updateEvent(id, payload);
    else await api.createEvent(payload);
    eventModal.close();
    loadCalendarOnly();
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.hidden = false;
  }
});

document.getElementById("event-delete").addEventListener("click", async () => {
  const id = document.getElementById("event-id").value;
  if (id) await api.deleteEvent(id);
  eventModal.close();
  loadCalendarOnly();
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
