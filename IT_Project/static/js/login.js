const ROLE_PASSWORD = { admin: 'admin123', doctor: 'doctor123', nurse: 'nurse123' };

async function init() {
  try {
    const boot = await api('/bootstrap/');
    const box = document.getElementById('accounts');
    if (!box) return;
    box.innerHTML = boot.staff.map(s => `
      <button class="account" data-u="${s.username}" data-r="${s.role}">
        <span class="account-info">
          <span class="account-name">${s.name}</span>
          <span class="account-sub">${s.username} &bull; pwd: ${ROLE_PASSWORD[s.role] || 'demo123'}</span>
        </span>
        <span class="badge-role badge-${s.role}">${s.role} &rarr;</span>
      </button>`).join('');

    box.addEventListener('click', (e) => {
      const btn = e.target.closest('.account');
      if (!btn) return;
      const u = btn.dataset.u;
      const p = ROLE_PASSWORD[btn.dataset.r] || 'demo123';
      document.getElementById('username').value = u;
      document.getElementById('password').value = p;
      doLogin(u, p);
    });
  } catch (err) {
    console.error('Failed to load demo accounts:', err);
  }

  const signinBtn = document.getElementById('signin');
  if (signinBtn) {
    signinBtn.addEventListener('click', () => {
      doLogin(document.getElementById('username').value.trim().toLowerCase(),
              document.getElementById('password').value);
    });
  }
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('keydown',
      (e) => { if (e.key === 'Enter') document.getElementById('signin')?.click(); });
  }
}

async function doLogin(username, password) {
  const err = document.getElementById('error');
  if (err) err.hidden = true;
  if (!username || !password) {
    if (err) { err.textContent = 'Enter both username and password.'; err.hidden = false; }
    return;
  }
  try {
    const result = await api('/login/', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (result.ok) {
      saveSession(result.staff);
      window.location.href = '/ward/';
    } else {
      if (err) { err.textContent = result.error || 'Sign-in failed.'; err.hidden = false; }
    }
  } catch (ex) {
    if (err) {
      err.textContent = 'Connection error: ' + (ex.message || 'Could not reach server');
      err.hidden = false;
    }
  }
}

init();
