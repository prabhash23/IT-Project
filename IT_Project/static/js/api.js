const API = '/api';

// Save the logged-in staff in the browser (replaces utils/session.ts)
function saveSession(staff) { localStorage.setItem('hcs.user', JSON.stringify(staff)); }
function getSession() {
  try { return JSON.parse(localStorage.getItem('hcs.user')); } catch { return null; }
}
function clearSession() { localStorage.removeItem('hcs.user'); }

async function api(path, options = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || ('API error ' + res.status));
    }
    return res.json();
  } catch (err) {
    console.error('API call failed for ' + path + ':', err);
    throw err;
  }
}

// Redirect to login if no session (call at the top of every page script)
function requireLogin() {
  const staff = getSession();
  if (!staff) {
    if (window.location.pathname !== '/login/' && window.location.pathname !== '/') {
      window.location.href = '/login/';
    }
    return null;
  }
  return staff;
}
