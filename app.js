// app.js - client-side logic for NoticeHub (localStorage-based, no backend required)
// Drop this file next to index.html and indexstyle.css
const API_BASE = '';
(function () {
  // ---------- Constants & localStorage keys ----------
  const USERS_KEY = 'nh_users_v1';
  const AUTH_KEY = 'nh_auth_v1';
  const NOTICES_KEY = 'nh_notices_v1';
  const THEME_KEY = 'nh_theme_v1';

  // ---------- DOM helpers ----------
  const $ = id => document.getElementById(id);
  const by = sel => document.querySelector(sel);
  const all = sel => Array.from(document.querySelectorAll(sel));

  // DOM elements used frequently
  const loginBtn = $('loginBtn');
  const signupBtn = $('signupBtn');
  const createNoticeBtn = $('createNoticeBtn');
  const loginModal = $('loginModal');
  const signupModal = $('signupModal');
  const closeLoginModal = $('closeLoginModal');
  const closeSignupModal = $('closeSignupModal');
  const userLoginForm = $('userLoginForm');
  const adminLoginForm = $('adminLoginForm');
  const signupForm = $('signupForm');
  const profileArea = $('profileArea');
  const noticesGrid = $('noticesGrid');
  const noticeModal = $('noticeModal');
  const noticeForm = $('noticeForm');
  const closeModal = $('closeModal');
  const cancelNotice = $('cancelNotice');
  const modalTitle = $('modalTitle');
  const globalSearch = $('globalSearch');
  const searchInput = $('searchInput');
  const categoryFilter = $('categoryFilter');
  const statusFilter = $('statusFilter');
  const themeToggle = $('themeToggle');
  const getStartedBtn = $('getStartedBtn');

  // ---------- Utilities ----------
  function nowIso() { return new Date().toISOString(); }
  function uid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 9); }
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function saveJSON(key, v) { localStorage.setItem(key, JSON.stringify(v)); }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  // ---------- Data layer (localStorage) ----------
  function loadUsers() { return loadJSON(USERS_KEY, []); }
  function saveUsers(list) { saveJSON(USERS_KEY, list); }

  function loadNotices() { return loadJSON(NOTICES_KEY, []); }
  function saveNotices(list) { saveJSON(NOTICES_KEY, list); }

  function getAuth() { return loadJSON(AUTH_KEY, null); }
  function setAuth(obj) { saveJSON(AUTH_KEY, obj); }
  function clearAuth() { localStorage.removeItem(AUTH_KEY); }

  // ---------- Seed some demo users and notices (only if none exist) ----------
  (function seedIfEmpty() {
    if (!loadUsers().length) {
      const demoUsers = [
        { id: uid('u_'), name: 'Alice Student', email: 'alice@example.com', password: btoa('User@123'), role: 'user' },
        { id: uid('u_'), name: 'Bob Admin', email: 'admin@example.com', password: btoa('Admin@123'), role: 'admin' }
      ];
      saveUsers(demoUsers);
    }

    if (!loadNotices().length) {
      const demo = [
        { id: uid('n_'), title: 'Midterm Examination Schedule', content: 'Midterm schedule published.', category: 'academic', author: 'Academic Office', date: '2024-10-15', status: 'approved', expiry: '2025-12-31', createdAt: nowIso() },
        { id: uid('n_'), title: 'Annual Sports Day', content: 'Register for sports day.', category: 'event', author: 'Sports Committee', date: '2024-11-20', status: 'approved', expiry: '2025-12-31', createdAt: nowIso() },
        { id: uid('n_'), title: 'Library Maintenance', content: 'Library closed for renovation.', category: 'administrative', author: 'Library Dept', date: '2024-11-01', status: 'pending', expiry: '2025-12-31', createdAt: nowIso() }
      ];
      saveNotices(demo);
    }
  })();

  // ---------- Theme ----------
  function applySavedTheme() {
    const t = localStorage.getItem(THEME_KEY) || 'light';
    if (t === 'dark') document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
    const icon = themeToggle && themeToggle.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-sun', t === 'dark');
      icon.classList.toggle('fa-moon', t !== 'dark');
    }
  }
  applySavedTheme();
  themeToggle && themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    applySavedTheme();
  });

  // ---------- Modals open/close ----------
  function openModal(m) { if (!m) return; m.style.display = 'flex'; }
  function closeModalEl(m) { if (!m) return; m.style.display = 'none'; }

  // wire modals
  loginBtn && loginBtn.addEventListener('click', () => openModal(loginModal));
  signupBtn && signupBtn.addEventListener('click', () => { signupForm.reset(); openModal(signupModal); });
  closeLoginModal && closeLoginModal.addEventListener('click', () => closeModalEl(loginModal));
  closeSignupModal && closeSignupModal.addEventListener('click', () => closeModalEl(signupModal));
  closeModal && closeModal.addEventListener('click', () => closeModalEl(noticeModal));
  cancelNotice && cancelNotice.addEventListener('click', () => closeModalEl(noticeModal));

  window.addEventListener('click', (e) => {
    if (e.target === loginModal) closeModalEl(loginModal);
    if (e.target === signupModal) closeModalEl(signupModal);
    if (e.target === noticeModal) closeModalEl(noticeModal);
  });

  // login tab switching
  all('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      all('.login-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      all('.login-form').forEach(f => f.classList.remove('active'));
      const form = $(`${tabName}LoginForm`);
      if (form) form.classList.add('active');
    });
  });

  // ---------- Auth: sign up ----------
  signupForm && signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('signupName').value.trim();
    const email = $('signupEmail').value.trim().toLowerCase();
    const pwd = $('signupPassword').value;
    const pwd2 = $('signupPasswordConfirm').value;
    const role = $('signupRole').value || 'user';

    // validation
    if (!name) return alert('Enter your name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Enter a valid email');
    const pwPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!pwPattern.test(pwd)) return alert('Password must contain upper, lower, number, special char and be 6+ chars');
    if (pwd !== pwd2) return alert('Passwords do not match');

    const users = loadUsers();
    if (users.some(u => u.email === email)) {
      // If user exists, suggest login
      closeModalEl(signupModal);
      alert('Email already exists. Please login.');
      openModal(loginModal);
      return;
    }

    const newUser = { id: uid('u_'), name, email, password: btoa(pwd), role };
    users.push(newUser);
    saveUsers(users);

    // After successful signup: close signup, open login (so user can login)
    closeModalEl(signupModal);
    alert('Account created. Please log in now.');
    openModal(loginModal);
    // prefill login email for convenience
    setTimeout(() => { $('userEmail').value = email; $('userPassword').focus(); }, 200);
  });

  // ---------- Auth: login ----------
  function performLogin(email, password, expectedRole = 'user') {
    const users = loadUsers();
    const found = users.find(u => u.email === email.trim().toLowerCase());
    if (!found) return { ok: false, msg: 'No account with that email' };
    if (found.password !== btoa(password)) return { ok: false, msg: 'Incorrect password' };
    // if admin form used, check role
    if (expectedRole === 'admin' && found.role !== 'admin') return { ok: false, msg: 'Not an admin account' };
    // success
    const token = { name: found.name, email: found.email, role: found.role, token: uid('t_') };
    setAuth(token);
    return { ok: true, token };
  }

  userLoginForm && userLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('userEmail').value;
    const password = $('userPassword').value;
    const r = performLogin(email, password, 'user');
    if (!r.ok) return alert(r.msg);
    closeModalEl(loginModal);
    updateUIForAuth();
    renderNoticesFromState();
    alert('User logged in successfully');
  });

  adminLoginForm && adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('adminEmail').value;
    const password = $('adminPassword').value;
    const r = performLogin(email, password, 'admin');
    if (!r.ok) return alert(r.msg);
    closeModalEl(loginModal);
    updateUIForAuth();
    renderNoticesFromState();
    alert('Admin logged in successfully');
  });

  // ---------- Logout ----------
  function logout() {
    clearAuth();
    updateUIForAuth();
    renderNoticesFromState();
    showAdminPanel(); // Hide admin panel on logout
  }

  // ---------- Profile & header update ----------
  function updateUIForAuth() {
    const auth = getAuth();
    const ca = profileArea;
    if (!ca) return;
    ca.innerHTML = ''; // rebuild
    if (auth && auth.name) {
      const nameSpan = document.createElement('div');
      nameSpan.className = 'greeting';
      nameSpan.style.color = 'white';
      nameSpan.textContent = `Hi ${auth.name.split(' ')[0] || auth.name}`;

      const menu = document.createElement('div');
      menu.className = 'profile-menu';

      // avatar / initials
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = (auth.name || 'U').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();

      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'btn btn-outline';
      logoutBtn.textContent = 'Logout';
      logoutBtn.addEventListener('click', logout);

      // admin extra label
      const roleBadge = document.createElement('div');
      roleBadge.className = 'muted';
      roleBadge.style.color = 'white';
      roleBadge.style.fontWeight = '700';
      roleBadge.style.fontSize = '13px';
      roleBadge.textContent = auth.role === 'admin' ? 'Admin' : 'User';

      menu.appendChild(avatar);
      menu.appendChild(roleBadge);
      menu.appendChild(logoutBtn);

      ca.appendChild(nameSpan);
      ca.appendChild(menu);
    } else {
      // show login / signup buttons
      const l = document.createElement('button');
      l.className = 'btn btn-outline';
      l.id = 'loginBtn';
      l.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
      l.addEventListener('click', () => openModal(loginModal));

      const s = document.createElement('button');
      s.className = 'btn btn-outline';
      s.id = 'signupBtn';
      s.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
      s.addEventListener('click', () => { signupForm.reset(); openModal(signupModal); });

      ca.appendChild(l);
      ca.appendChild(s);
    }

    // Enable/disable create notice button for regular users
    const authRole = auth ? auth.role : null;
    if (authRole === 'admin') {
      createNoticeBtn.style.display = 'inline-flex';
    } else {
      // you might still want users to view notices but not create
      createNoticeBtn.style.display = 'none';
    }

    // Show/hide admin panel based on role
    showAdminPanel();
  }

  // initialize UI on load
  updateUIForAuth();

  // ---------- Notices rendering & operations ----------
  function renderNotices(list) {
    noticesGrid.innerHTML = '';
    if (!list || !list.length) {
      noticesGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-light)">No notices found.</p>';
      return;
    }

    const auth = getAuth();
    list.forEach(n => {
      const el = document.createElement('div');
      el.className = `notice-card ${n.status || ''}`;

      const statusClass = `status-${n.status || 'pending'}`;
      const statusText = (n.status || 'pending').toUpperCase();

      el.innerHTML = `
        <span class="notice-status ${statusClass}">${statusText}</span>
        <h3 class="notice-title">${escapeHtml(n.title)}</h3>
        <div class="notice-meta">
          <span><i class="fas fa-user"></i> ${escapeHtml(n.author || 'Unknown')}</span>
          <span><i class="fas fa-calendar"></i> ${escapeHtml((n.date || '').slice(0,10) || '')}</span>
          <span><i class="fas fa-tag"></i> ${escapeHtml((n.category || '').charAt(0).toUpperCase() + (n.category || '').slice(1))}</span>
        </div>
        <div class="notice-content"><p>${escapeHtml(n.content)}</p></div>
      `;

      // actions area
      const actions = document.createElement('div');
      actions.className = 'notice-actions';

      // Show admin actions if logged in as admin
      if (auth && auth.role === 'admin') {
        if (n.status === 'pending') {
          const approveBtn = document.createElement('button');
          approveBtn.className = 'btn-small btn-approve';
          approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
          approveBtn.addEventListener('click', () => updateNoticeStatus(n.id, 'approved'));
          actions.appendChild(approveBtn);

          const rejectBtn = document.createElement('button');
          rejectBtn.className = 'btn-small btn-reject';
          rejectBtn.innerHTML = '<i class="fas fa-times"></i> Reject';
          rejectBtn.addEventListener('click', () => updateNoticeStatus(n.id, 'rejected'));
          actions.appendChild(rejectBtn);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-small btn-edit';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editBtn.addEventListener('click', () => editNotice(n.id));
        actions.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-small btn-delete';
        delBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        delBtn.addEventListener('click', () => deleteNotice(n.id));
        actions.appendChild(delBtn);
      } else {
        // For users: maybe allow saving/bookmarking later - minimal for now
        // (left intentionally simple)
      }

      el.appendChild(actions);
      noticesGrid.appendChild(el);
    });
  }

  function renderNoticesFromState() {
    const allNotices = loadNotices();
    // filter out expired notices
    const today = new Date().toISOString().slice(0,10);
    const active = allNotices.filter(n => !n.expiry || n.expiry >= today);
    renderNotices(active);
  }

  // initial render
  renderNoticesFromState();

  // ---------- Notice actions ----------
  createNoticeBtn && createNoticeBtn.addEventListener('click', () => {
    // only admins can open create modal (we hide button for non-admins)
    modalTitle.textContent = 'Create New Notice';
    $('noticeId').value = '';
    $('noticeTitle').value = '';
    $('noticeCategory').value = '';
    $('noticeContent').value = '';
    $('noticeExpiry').value = '';
    openModal(noticeModal);
  });

  noticeForm && noticeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('noticeId').value;
    const title = $('noticeTitle').value.trim();
    const category = $('noticeCategory').value;
    const content = $('noticeContent').value.trim();
    const expiry = $('noticeExpiry').value || null;
    const auth = getAuth();

    if (!auth || auth.role !== 'admin') {
      return alert('Only admins can create or edit notices.');
    }
    if (!title || !category || !content) return alert('Please fill all fields');

    const notices = loadNotices();
    if (id) {
      // edit existing
      const idx = notices.findIndex(n => n.id === id);
      if (idx >= 0) {
        notices[idx].title = title;
        notices[idx].category = category;
        notices[idx].content = content;
        notices[idx].expiry = expiry;
        notices[idx].updatedAt = nowIso();
        saveNotices(notices);
        alert('Notice updated');
      } else {
        alert('Notice not found');
      }
    } else {
      // create new
      const newNotice = {
        id: uid('n_'),
        title, category, content, expiry,
        author: auth.name || auth.email,
        date: new Date().toISOString().slice(0,10),
        status: 'pending',
        createdAt: nowIso()
      };
      notices.unshift(newNotice);
      saveNotices(notices);
      alert('Notice created and pending approval');
    }

    closeModalEl(noticeModal);
    renderNoticesFromState();
  });

  function editNotice(id) {
    const notices = loadNotices();
    const n = notices.find(x => x.id === id);
    if (!n) return alert('Notice not found');
    modalTitle.textContent = 'Edit Notice';
    $('noticeId').value = n.id;
    $('noticeTitle').value = n.title;
    $('noticeCategory').value = n.category;
    $('noticeContent').value = n.content;
    $('noticeExpiry').value = n.expiry || '';
    openModal(noticeModal);
  }

  function deleteNotice(id) {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    let notices = loadNotices();
    notices = notices.filter(n => n.id !== id);
    saveNotices(notices);
    alert('Notice deleted');
    renderNoticesFromState();
  }

  function updateNoticeStatus(id, newStatus) {
    const notices = loadNotices();
    const idx = notices.findIndex(n => n.id === id);
    if (idx === -1) return alert('Notice not found');
    notices[idx].status = newStatus;
    notices[idx].updatedAt = nowIso();
    saveNotices(notices);
    alert(`Notice ${newStatus}`);
    renderNoticesFromState();
  }

  // ---------- Search & Filters ----------
  function filterAndRender() {
    let list = loadNotices().slice();
    // remove expired
    const today = new Date().toISOString().slice(0,10);
    list = list.filter(n => !n.expiry || n.expiry >= today);

    const cat = categoryFilter ? categoryFilter.value : 'all';
    const st = statusFilter ? statusFilter.value : 'all';
    const search = (searchInput && searchInput.value || '').trim().toLowerCase();
    const gSearch = (globalSearch && globalSearch.value || '').trim().toLowerCase();

    if (cat && cat !== 'all') list = list.filter(n => n.category === cat);
    if (st && st !== 'all') list = list.filter(n => (n.status||'').toLowerCase() === st.toLowerCase());
    if (search) {
      list = list.filter(n => (n.title + ' ' + n.content + ' ' + (n.author||'')).toLowerCase().includes(search));
    }
    if (gSearch) {
      list = list.filter(n => (n.title + ' ' + n.content + ' ' + (n.author||'')).toLowerCase().includes(gSearch));
    }

    // sort by createdAt desc
    list.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    renderNotices(list);
  }

  if (categoryFilter) categoryFilter.addEventListener('change', filterAndRender);
  if (statusFilter) statusFilter.addEventListener('change', filterAndRender);
  if (searchInput) searchInput.addEventListener('input', filterAndRender);
  if (globalSearch) globalSearch.addEventListener('input', filterAndRender);

  // hook header search to the same logic
  if (globalSearch) globalSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
  });

  // 'Get Started' opens signup
  getStartedBtn && getStartedBtn.addEventListener('click', () => { signupForm.reset(); openModal(signupModal); });

  // ---------- Admin Panel Functions ----------
  function showAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    const auth = getAuth();
    
    if (auth && auth.role === 'admin') {
      adminPanel.style.display = 'block';
      renderUsersTable();
    } else {
      adminPanel.style.display = 'none';
    }
  }

  function renderUsersTable() {
    const users = loadUsers();
    const tableBody = document.getElementById('usersTableBody');
    const auth = getAuth(); // Current logged in user
    
    if (!tableBody) return;

    // Update stats
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('adminCount').textContent = users.filter(u => u.role === 'admin').length;
    document.getElementById('userCount').textContent = users.filter(u => u.role === 'user').length;

    tableBody.innerHTML = '';

    users.forEach(user => {
      const row = document.createElement('tr');
      
      // Prevent modifying current user
      const isCurrentUser = auth && auth.email === user.email;
      
      row.innerHTML = `
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>
          <span class="role-badge role-${user.role}">${user.role}</span>
        </td>
        <td>
          <div class="user-actions">
            <button class="btn-promote" ${user.role === 'admin' || isCurrentUser ? 'disabled' : ''} 
                    onclick="promoteUser('${user.id}')">
              <i class="fas fa-arrow-up"></i> Promote
            </button>
            <button class="btn-demote" ${user.role === 'user' || isCurrentUser ? 'disabled' : ''} 
                    onclick="demoteUser('${user.id}')">
              <i class="fas fa-arrow-down"></i> Demote
            </button>
            <button class="btn-delete-user" ${isCurrentUser ? 'disabled' : ''} 
                    onclick="deleteUser('${user.id}')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
  }

  function promoteUser(userId) {
    if (!confirm('Promote this user to admin?')) return;
    
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].role = 'admin';
      saveUsers(users);
      renderUsersTable();
      alert('User promoted to admin successfully');
    }
  }

  function demoteUser(userId) {
    if (!confirm('Demote this admin to regular user?')) return;
    
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].role = 'user';
      saveUsers(users);
      renderUsersTable();
      alert('Admin demoted to user successfully');
    }
  }

  function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      const userEmail = users[userIndex].email;
      users.splice(userIndex, 1);
      saveUsers(users);
      renderUsersTable();
      alert(`User ${userEmail} deleted successfully`);
    }
  }

  // ---------- initialize rendering and UI ----------
  updateUIForAuth();
  renderNoticesFromState();

})();

// ---------- newsletter subscribe small handler ----------
(function(){
  const nlForm = document.getElementById('newsletterForm');
  const nlEmail = document.getElementById('newsletterEmail');
  const nlBtn = document.getElementById('newsletterBtn');
  if (!nlForm || !nlEmail || !nlBtn) return;

  const NEWS_KEY = 'nh_newsletter_v1';
  function loadSubs(){ try { return JSON.parse(localStorage.getItem(NEWS_KEY) || '[]'); } catch(e){ return []; } }
  function saveSubs(list){ localStorage.setItem(NEWS_KEY, JSON.stringify(list)); }

  nlBtn.addEventListener('click', () => {
    const em = nlEmail.value.trim().toLowerCase();
    if (!em) return alert('Please enter an email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return alert('Enter a valid email');
    const subs = loadSubs();
    if (subs.includes(em)) { alert('You are already subscribed'); return; }
    subs.push(em);
    saveSubs(subs);
    nlEmail.value = '';
    alert('Thanks — you have been subscribed to NoticeHub updates!');
  });
})();

// Make admin functions globally accessible
window.promoteUser = promoteUser;
window.demoteUser = demoteUser;
window.deleteUser = deleteUser;