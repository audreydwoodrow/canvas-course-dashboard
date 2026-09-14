export function initCalendar(el, events, { onDateClick, onEventClick } = {}) {
  const calendar = new window.FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    height: 850,
    slotMinTime: "00:00:00",
    slotMaxTime: "24:00:00",
    scrollTime: "08:00:00",
    nowIndicator: true,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek",
    },
    events: events.map(toFullCalendarEvent),
    dateClick(info) {
      if (onDateClick) onDateClick(info.dateStr);
    },
    eventClick(info) {
      if (info.event.extendedProps.source === "event") {
        if (onEventClick) {
          onEventClick(info.event.extendedProps.series, info.event.extendedProps.occurrenceDate);
        }
        return;
      }
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
    classNames: [classNameFor(e.source)],
    extendedProps: { source: e.source },
  };
  if (e.end) event.end = e.end;
  if (e.url) event.url = e.url;
  if (e.source === "event") {
    event.extendedProps.occurrenceDate = e.occurrenceDate;
    event.extendedProps.series = {
      id: e.seriesId,
      title: e.title,
      date: e.seriesDate,
      start_time: e.startTime,
      end_time: e.endTime,
      all_day: e.allDay,
      location: e.location,
      notes: e.notes,
      repeat_freq: e.repeatFreq,
      repeat_until: e.repeatUntil,
      repeat_days: e.repeatDays || [],
    };
  }
  return event;
}

function classNameFor(source) {
  if (source === "todo") return "fc-event-todo";
  if (source === "event") return "fc-event-class";
  return "fc-event-canvas";
}
