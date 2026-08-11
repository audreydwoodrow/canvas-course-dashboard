export function initCalendar(el, events) {
  const calendar = new window.FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    height: "auto",
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,listMonth" },
    events: events.map(toFullCalendarEvent),
    eventClick(info) {
      if (info.event.url) {
        info.jsEvent.preventDefault();
        window.open(info.event.url, "_blank");
      }
    },
  });
  calendar.render();
  return calendar;
}

export function setCalendarEvents(calendar, events) {
  calendar.removeAllEvents();
  events.map(toFullCalendarEvent).forEach((e) => calendar.addEvent(e));
}

function toFullCalendarEvent(e) {
  const event = {
    id: e.id,
    title: e.source === "canvas" ? `${e.title} (${e.course})` : e.title,
    start: e.start,
    allDay: e.allDay,
    classNames: [e.source === "todo" ? "fc-event-todo" : "fc-event-canvas"],
  };
  if (e.url) event.url = e.url;
  return event;
}
