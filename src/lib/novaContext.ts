export function getNOVAContext() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const allTasks = JSON.parse(localStorage.getItem('pp_tasks') || '[]');
  const todayTasks = allTasks.filter((t: any) => t.date === todayStr);
  const overdueTasks = allTasks.filter((t: any) => t.date && t.date < todayStr && !t.completed);
  const doneTodayTasks = todayTasks.filter((t: any) => t.completed);
  const pendingTodayTasks = todayTasks.filter((t: any) => !t.completed);
  const highPriority = allTasks.filter((t: any) => t.priority === true && !t.completed); // Changed 'High' to true based on useTasks.ts

  const allEvents = JSON.parse(localStorage.getItem('pp_events') || '[]');
  // Events from Google Calendar have start.date or start.dateTime
  const parseEventDate = (e: any) => e.start?.date || (e.start?.dateTime ? e.start.dateTime.split('T')[0] : '');
  const todayEvents = allEvents.filter((e: any) => parseEventDate(e) === todayStr);
  const upcomingEvents = allEvents
    .filter((e: any) => parseEventDate(e) >= todayStr)
    .sort((a: any, b: any) => parseEventDate(a).localeCompare(parseEventDate(b)))
    .slice(0, 5);

  const emails = JSON.parse(localStorage.getItem('pp_emails') || '[]');
  const unreadEmails = emails.filter((e: any) => e.unread);

  const transcriptions = JSON.parse(localStorage.getItem('pp_trans') || '[]');
  const recentTrans = transcriptions.slice(0, 3);

  const currentTheme = localStorage.getItem('pp_theme') || 'VOID';
  const currentPage = document.querySelector('.page.active')?.id?.replace('page-', '') || 'dashboard';

  // Stats from focus sessions
  const focusSessions = parseInt(localStorage.getItem('pp_focus_sessions_today') || '0', 10);
  const totalFocusMinutes = parseInt(localStorage.getItem('pp_focus_minutes_today') || '0', 10);

  return `
LIVE USER CONTEXT (as of ${now.toLocaleString()}):
- Current page: ${currentPage}
- Today's date: ${now.toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}
- Current time: ${now.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'})}
- Active theme: ${currentTheme}

TASKS:
- Total tasks today: ${todayTasks.length}
- Completed today: ${doneTodayTasks.length}
- Still pending today: ${pendingTodayTasks.map((t: any) => `"${t.title}" (${t.category}, due ${t.time || 'no time set'})`).join(', ') || 'none'}
- Overdue tasks: ${overdueTasks.length > 0 ? overdueTasks.map((t: any) => `"${t.title}" (was due ${t.date})`).join(', ') : 'none'}
- High priority pending: ${highPriority.map((t: any) => t.title).join(', ') || 'none'}
- Total tasks all time: ${allTasks.length}

CALENDAR:
- Events today: ${todayEvents.map((e: any) => `"${e.summary}" at ${e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString() : 'all day'}`).join(', ') || 'none'}
- Upcoming events: ${upcomingEvents.map((e: any) => `"${e.summary}" on ${parseEventDate(e)}`).join(', ') || 'none'}

INBOX:
- Unread emails: ${unreadEmails.length}
- Recent senders: ${unreadEmails.slice(0, 3).map((e: any) => e.sender || 'Unknown').join(', ') || 'none'}

TRANSCRIPTIONS:
- Recent recordings: ${recentTrans.map((t: any) => `"${t.title}" (${t.tag})`).join(', ') || 'none'}

FOCUS SESSIONS TODAY:
- Sessions completed: ${focusSessions}
- Total focus minutes: ${totalFocusMinutes}
  `;
}
