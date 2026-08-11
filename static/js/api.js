async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  getSetupStatus: () => request("/api/setup"),
  saveSetup: (canvas_domain, canvas_token) =>
    request("/api/setup", { method: "POST", body: JSON.stringify({ canvas_domain, canvas_token }) }),

  getEvents: () => request("/api/calendar/events"),
  getAnnouncements: () => request("/api/announcements"),

  getGrades: () => request("/api/grades"),
  createGrade: (grade) => request("/api/grades", { method: "POST", body: JSON.stringify(grade) }),
  updateGrade: (id, grade) => request(`/api/grades/${id}`, { method: "PUT", body: JSON.stringify(grade) }),
  deleteGrade: (id) => request(`/api/grades/${id}`, { method: "DELETE" }),

  getTodos: () => request("/api/todos"),
  createTodo: (todo) => request("/api/todos", { method: "POST", body: JSON.stringify(todo) }),
  updateTodo: (id, todo) => request(`/api/todos/${id}`, { method: "PUT", body: JSON.stringify(todo) }),
  deleteTodo: (id) => request(`/api/todos/${id}`, { method: "DELETE" }),

  getWeeklyTodos: () => request("/api/weekly-todos"),
  createWeeklyTodo: (task) => request("/api/weekly-todos", { method: "POST", body: JSON.stringify(task) }),
  updateWeeklyTodo: (id, task) => request(`/api/weekly-todos/${id}`, { method: "PUT", body: JSON.stringify(task) }),
  deleteWeeklyTodo: (id) => request(`/api/weekly-todos/${id}`, { method: "DELETE" }),
  reorderWeeklyTodos: (ids) => request("/api/weekly-todos/reorder", { method: "PUT", body: JSON.stringify({ ids }) }),
  moveWeeklyTodo: (id, day, ids) =>
    request(`/api/weekly-todos/${id}/move`, { method: "PUT", body: JSON.stringify({ day, ids }) }),
};
