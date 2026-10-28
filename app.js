/* ================================================================
   NIEEE ATBU — app.js
   Handles: routing, all public pages, admin dashboard
   Depends on: config.js (loaded first)
================================================================ */
'use strict';

/* ──────────────────────────────────────────────────────────────
   GLOBALS
────────────────────────────────────────────────────────────── */
let currentUser   = null;   // Supabase auth user object
let siteSettings  = {};     // key → value from site_settings table
let currentPage   = 'home';

/* ──────────────────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  // Load site settings (name, tagline, contact etc.)
  await loadSiteSettings();

  // Check if a user is already logged in
  const { data: { session } } = await db.auth.getSession();
  if (session) await handleAuthUser(session.user);

  // Listen for auth state changes
  db.auth.onAuthStateChange((_event, session) => {
    if (session) handleAuthUser(session.user);
    else { currentUser = null; updateAdminNav(false); }
  });

  // Route from URL hash  (#home, #about, etc.)
  const hash = window.location.hash.replace('#', '') || 'home';
  navigate(hash);
});

/* ──────────────────────────────────────────────────────────────
   SITE SETTINGS
────────────────────────────────────────────────────────────── */
async function loadSiteSettings() {
  const rows = await dbSelect('site_settings');
  if (!rows) return;
  rows.forEach(r => { siteSettings[r.key] = r.value; });
  applySettingsToDOM();
}

function applySettingsToDOM() {
  const s = siteSettings;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
  const setHref = (id, val) => { const el = document.getElementById(id); if (el && val) el.href = val; };
  set('footer-tagline', s.tagline);
  set('footer-email', s.contact_email);
  set('footer-phone', s.contact_phone);
  set('footer-address', s.contact_address);
  setHref('footer-email', `mailto:${s.contact_email}`);
  setHref('footer-phone', `tel:${s.contact_phone}`);
  setHref('footer-fb', s.facebook_url);
  setHref('footer-tw', s.twitter_url);
  setHref('footer-ig', s.instagram_url);
  setHref('footer-li', s.linkedin_url);
  setHref('footer-wa', s.whatsapp_url);
  if (s.site_name) document.title = `${s.site_name} — Official Website`;
}

/* ──────────────────────────────────────────────────────────────
   AUTH
────────────────────────────────────────────────────────────── */
async function handleAuthUser(user) {
  // Check if this user's email is in the admins table
  const admin = await dbSelect('admins', { eq: ['email', user.email], single: true });
  if (admin) {
    currentUser = { ...user, isAdmin: true, adminRole: admin.role };
    updateAdminNav(true);
  } else {
    currentUser = user;
    updateAdminNav(false);
  }
}

function updateAdminNav(isAdmin) {
  document.getElementById('nav-admin-btn').style.display    = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('mobile-admin-btn').style.display = isAdmin ? 'block' : 'none';
}

/* ──────────────────────────────────────────────────────────────
   ROUTER
────────────────────────────────────────────────────────────── */
const publicPages  = ['home','about','team','events','announcements','resources','membership'];
const protectedPages = ['admin'];

function navigate(page) {
  // Guard admin page
  if (page === 'admin' && (!currentUser || !currentUser.isAdmin)) {
    renderAdminLogin(); currentPage = 'admin'; updateNavLinks(page); return;
  }
  currentPage = page;
  window.location.hash = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateNavLinks(page);

  const renders = {
    home:          renderHome,
    about:         renderAbout,
    team:          renderTeam,
    events:        renderEvents,
    announcements: renderAnnouncements,
    resources:     renderResources,
    membership:    renderMembership,
    admin:         renderAdmin,
  };
  const fn = renders[page] || renderHome;
  fn();
}

function updateNavLinks(page) {
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

/* ──────────────────────────────────────────────────────────────
   MOBILE NAV
────────────────────────────────────────────────────────────── */
let mobileNavOpen = false;
function toggleMobileNav() {
  mobileNavOpen = !mobileNavOpen;
  document.getElementById('mobile-nav').classList.toggle('open', mobileNavOpen);
  document.getElementById('hamburger').setAttribute('aria-expanded', mobileNavOpen);
}
document.addEventListener('click', e => {
  if (mobileNavOpen && !e.target.closest('#mobile-nav') && !e.target.closest('#hamburger')) {
    mobileNavOpen = false;
    document.getElementById('mobile-nav').classList.remove('open');
  }
});

/* ──────────────────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────────────────── */
function showToast(msg, type = 'info', ms = 4000) {
  const icons = { success: '✅', error: '❌', info: '💡' };
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'💡'}</span><span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.animation='toastOut 0.3s ease forwards'; setTimeout(()=>t.remove(),300); }, ms);
}

/* ──────────────────────────────────────────────────────────────
   HELPER — render main content
────────────────────────────────────────────────────────────── */
function setContent(html) {
  document.getElementById('main-content').innerHTML = html;
}

function loadingHTML(msg = 'Loading…') {
  return `<div class="loading-state"><div class="spinner"></div><span>${msg}</span></div>`;
}
function emptyHTML(icon, msg, sub = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div>
    <h3 style="color:var(--text-muted)">${msg}</h3>
    ${sub ? `<p style="margin-top:0.5rem">${sub}</p>` : ''}</div>`;
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-NG', { weekday:'short', day:'numeric', month:'long', year:'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-NG', { hour:'2-digit', minute:'2-digit' });
}

/* ══════════════════════════════════════════════════════════════
   PAGE: HOME
══════════════════════════════════════════════════════════════ */
async function renderHome() {
  setContent(`
    <!-- HERO -->
    <section class="hero">
      <div class="hero-eyebrow">⚡ IEEE Registered Student Chapter</div>
      <h1>Inspiring the Next Generation of <span class="highlight">Nigerian Engineers</span></h1>
      <p>The NIEEE ATBU Student Chapter connects engineering students with technical knowledge, professional skills, and a community that builds the future.</p>
      <div class="hero-btns">
        <a class="btn btn-gold btn-lg" onclick="navigate('membership')">Join Our Chapter</a>
        <a class="btn btn-outline btn-lg" onclick="navigate('about')">Learn More</a>
      </div>
      <div class="hero-stats" id="home-stats">
        <div class="hero-stat"><div class="hero-stat-num">—</div><div class="hero-stat-label">Active Members</div></div>
        <div class="hero-stat"><div class="hero-stat-num">—</div><div class="hero-stat-label">Events Hosted</div></div>
        <div class="hero-stat"><div class="hero-stat-num">—</div><div class="hero-stat-label">Years Active</div></div>
      </div>
    </section>

    <!-- LATEST ANNOUNCEMENTS PREVIEW -->
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="flex-between flex-wrap gap-2 mb-3">
          <div><div class="section-label">Latest News</div><h2>Announcements</h2></div>
          <a class="btn btn-ghost" onclick="navigate('announcements')">View All →</a>
        </div>
        <div class="grid-3" id="home-announcements">${loadingHTML()}</div>
      </div>
    </section>

    <!-- UPCOMING EVENTS PREVIEW -->
    <section class="section" style="background:rgba(22,40,71,0.4);padding:3.5rem 0">
      <div class="container">
        <div class="flex-between flex-wrap gap-2 mb-3">
          <div><div class="section-label">What's On</div><h2>Upcoming Events</h2></div>
          <a class="btn btn-ghost" onclick="navigate('events')">All Events →</a>
        </div>
        <div class="grid-3" id="home-events">${loadingHTML()}</div>
      </div>
    </section>

    <!-- WHY JOIN -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Why Join Us</div>
          <h2>What NIEEE ATBU Offers You</h2>
          <p>We go beyond the classroom to prepare you for a successful engineering career.</p>
        </div>
        <div class="grid-3">
          ${[
            { icon:'🔧', title:'Technical Workshops', desc:'Hands-on sessions in electronics, programming, PCB design, embedded systems, and more.' },
            { icon:'🤝', title:'Professional Network', desc:'Connect with industry professionals, alumni, and IEEE members across Nigeria and the world.' },
            { icon:'🏆', title:'Competitions', desc:'Participate in engineering competitions, hackathons, and design challenges at national level.' },
            { icon:'📚', title:'Academic Support', desc:'Access resources, study groups, and mentorship to excel in your engineering coursework.' },
            { icon:'💼', title:'Career Development', desc:'Resume reviews, career fairs, industry visits, and internship opportunities.' },
            { icon:'🌍', title:'Community Impact', desc:'Lead outreach programs, science exhibitions, and STEM promotion in Bauchi communities.' },
          ].map(f=>`
            <div class="card">
              <div class="card-body">
                <div style="font-size:2.2rem;margin-bottom:0.75rem">${f.icon}</div>
                <h3 style="margin-bottom:0.5rem">${f.title}</h3>
                <p style="font-size:0.9rem">${f.desc}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section-sm">
      <div class="container">
        <div class="card" style="background:linear-gradient(135deg,var(--navy-700),var(--navy-600));border-color:rgba(201,168,76,0.2);padding:3rem 2rem;text-align:center">
          <div class="section-label">Ready to Join?</div>
          <h2 style="margin:0.5rem 0 1rem">Become a Member Today</h2>
          <p style="max-width:480px;margin:0 auto 2rem">Fill in a short membership form and become part of Nigeria's premier engineering student community at ATBU.</p>
          <a class="btn btn-gold btn-lg" onclick="navigate('membership')">Apply for Membership →</a>
        </div>
      </div>
    </section>`);

  // Load data
  loadHomeAnnouncements();
  loadHomeEvents();
}

async function loadHomeAnnouncements() {
  const items = await dbSelect('announcements', {
    order: ['created_at', { ascending: false }], limit: 3,
    eq: ['is_published', true]
  });
  const el = document.getElementById('home-announcements');
  if (!el) return;
  if (!items || !items.length) { el.innerHTML = emptyHTML('📢','No announcements yet','Check back soon.'); return; }
  el.innerHTML = items.map(a => announcementCardHTML(a)).join('');
}

async function loadHomeEvents() {
  const now = new Date().toISOString();
  const { data: items } = await db.from('events')
    .select('*').eq('is_published', true).gte('event_date', now)
    .order('event_date', { ascending: true }).limit(3);
  const el = document.getElementById('home-events');
  if (!el) return;
  if (!items || !items.length) { el.innerHTML = emptyHTML('📅','No upcoming events','Check back soon.'); return; }
  el.innerHTML = items.map(e => eventCardHTML(e)).join('');
}

/* ══════════════════════════════════════════════════════════════
   PAGE: ABOUT
══════════════════════════════════════════════════════════════ */
async function renderAbout() {
  const s = siteSettings;
  setContent(`
    <div class="container">
      <div class="page-header">
        <div class="section-label">About Us</div>
        <h1>${s.site_name || 'NIEEE ATBU Student Chapter'}</h1>
        <p>${s.tagline || 'Inspiring Engineers. Building Futures.'}</p>
      </div>

      <!-- Intro -->
      <div class="grid-2" style="gap:3rem;align-items:center;margin-bottom:4rem">
        <div>
          <div class="section-label">Who We Are</div>
          <h2 style="margin:0.3rem 0 1rem">A Community of Future Engineers</h2>
          <p style="font-size:1rem;line-height:1.8">${s.about_intro || 'Loading…'}</p>
          <a class="btn btn-gold" style="margin-top:1.5rem" onclick="navigate('membership')">Join the Chapter</a>
        </div>
        <div style="background:var(--navy-700);border-radius:var(--radius-lg);height:300px;display:flex;align-items:center;justify-content:center;font-size:5rem;border:1px solid var(--border)">⚡</div>
      </div>

      <!-- Vision & Mission -->
      <div class="grid-2" style="margin-bottom:3rem">
        <div class="card">
          <div class="card-body">
            <div style="font-size:2rem;margin-bottom:0.75rem">🎯</div>
            <div class="section-label">Our Vision</div>
            <p style="margin-top:0.75rem;font-size:0.95rem;line-height:1.75">${s.vision || 'Loading…'}</p>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <div style="font-size:2rem;margin-bottom:0.75rem">🚀</div>
            <div class="section-label">Our Mission</div>
            <p style="margin-top:0.75rem;font-size:0.95rem;line-height:1.75">${s.mission || 'Loading…'}</p>
          </div>
        </div>
      </div>

      <!-- Objectives -->
      <div style="margin-bottom:3rem">
        <div class="section-label">What We Do</div>
        <h2 style="margin:0.3rem 0 2rem">Our Core Objectives</h2>
        <div class="grid-3">
          ${[
            { icon:'💡', t:'Technical Training', d:'Organize workshops, seminars, and bootcamps that sharpen practical engineering skills.' },
            { icon:'🔬', t:'Research & Innovation', d:'Support student research projects and encourage engineering innovation at every level.' },
            { icon:'🤝', t:'Mentorship', d:'Connect students with experienced engineers and professionals for guidance and career advice.' },
            { icon:'🏅', t:'Competitions', d:'Prepare and field teams in national and international engineering competitions.' },
            { icon:'🌐', t:'Community Outreach', d:'Promote STEM education and engineering awareness in schools and communities around Bauchi.' },
            { icon:'📋', t:'Professional Development', d:'Build career-ready skills through internships, career fairs, and industry engagement.' },
          ].map(o=>`<div class="card"><div class="card-body">
            <div style="font-size:1.8rem;margin-bottom:0.6rem">${o.icon}</div>
            <h3 style="margin-bottom:0.5rem">${o.t}</h3>
            <p style="font-size:0.88rem">${o.d}</p>
          </div></div>`).join('')}
        </div>
      </div>

      <!-- Contact -->
      <div class="card" style="border-color:rgba(201,168,76,0.2)">
        <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2rem;text-align:center;flex-wrap:wrap">
          <div>
            <div style="font-size:2rem;margin-bottom:0.5rem">📧</div>
            <div class="section-label">Email</div>
            <a href="mailto:${s.contact_email}" style="color:var(--gold)">${s.contact_email || '—'}</a>
          </div>
          <div>
            <div style="font-size:2rem;margin-bottom:0.5rem">📞</div>
            <div class="section-label">Phone</div>
            <a href="tel:${s.contact_phone}" style="color:var(--gold)">${s.contact_phone || '—'}</a>
          </div>
          <div>
            <div style="font-size:2rem;margin-bottom:0.5rem">📍</div>
            <div class="section-label">Address</div>
            <p style="font-size:0.9rem">${s.contact_address || '—'}</p>
          </div>
        </div>
      </div>
    </div>`);
}

/* ══════════════════════════════════════════════════════════════
   PAGE: TEAM
══════════════════════════════════════════════════════════════ */
async function renderTeam() {
  setContent(`
    <div class="container">
      <div class="page-header">
        <div class="section-label">2026–2027 Leadership</div>
        <h1>Our Team</h1>
        <p>Meet the dedicated students leading the NIEEE ATBU Chapter this academic year.</p>
      </div>
      <div id="team-content">${loadingHTML('Loading team…')}</div>
    </div>`);

  const members = await dbSelect('team_members', {
    eqMany: [['is_published', true], ['academic_year', '2026-2027']],
    order: ['display_order', { ascending: true }]
  });

  const el = document.getElementById('team-content');
  if (!el) return;
  if (!members || !members.length) {
    el.innerHTML = emptyHTML('👥','Team profiles coming soon','Check back later.');
    return;
  }

  const sections = [
    { key:'executive',   label:'Executive Council',             sub:'Elected officers for 2026–2027' },
    { key:'appointee',   label:'Appointees & Coordinators',     sub:'Appointed team leads' },
    { key:'contributor', label:'Other Contributors',            sub:'Volunteers and supporting members' },
  ];

  el.innerHTML = sections.map(sec => {
    const group = members.filter(m => m.category === sec.key);
    if (!group.length) return '';
    return `
      <div style="margin-bottom:3.5rem">
        <div class="section-label">${sec.sub}</div>
        <h2 style="margin:0.3rem 0 2rem">${sec.label}</h2>
        <div class="grid-4">
          ${group.map(m => teamCardHTML(m)).join('')}
        </div>
      </div>`;
  }).join('');
}

function teamCardHTML(m) {
  const imgSrc = m.image_path
    ? getImageUrl('team-photos', m.image_path)
    : null;
  return `
  <div class="team-card">
    <div class="team-photo">
      ${imgSrc
        ? `<img src="${imgSrc}" alt="${m.full_name}" loading="lazy">`
        : '👤'}
    </div>
    <div class="team-name">${m.full_name}</div>
    <div class="team-position">${m.position}</div>
    ${m.bio ? `<div class="team-bio">${m.bio}</div>` : ''}
    ${(m.email || m.linkedin_url || m.twitter_url) ? `
      <div style="display:flex;justify-content:center;gap:0.5rem;margin-top:0.85rem">
        ${m.email ? `<a href="mailto:${m.email}" class="social-btn" title="Email">✉</a>` : ''}
        ${m.linkedin_url ? `<a href="${m.linkedin_url}" target="_blank" class="social-btn" title="LinkedIn">in</a>` : ''}
        ${m.twitter_url ? `<a href="${m.twitter_url}" target="_blank" class="social-btn" title="Twitter">𝕏</a>` : ''}
      </div>` : ''}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   PAGE: EVENTS
══════════════════════════════════════════════════════════════ */
async function renderEvents() {
  setContent(`
    <div class="container">
      <div class="page-header">
        <div class="section-label">Chapter Activities</div>
        <h1>Events</h1>
        <p>Workshops, seminars, competitions, and more — stay involved.</p>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:2rem" id="event-filters">
        <button class="btn btn-gold btn-sm active-filter" onclick="filterEvents('all',this)">All</button>
        <button class="btn btn-ghost btn-sm" onclick="filterEvents('workshop',this)">Workshops</button>
        <button class="btn btn-ghost btn-sm" onclick="filterEvents('seminar',this)">Seminars</button>
        <button class="btn btn-ghost btn-sm" onclick="filterEvents('competition',this)">Competitions</button>
        <button class="btn btn-ghost btn-sm" onclick="filterEvents('conference',this)">Conferences</button>
        <button class="btn btn-ghost btn-sm" onclick="filterEvents('meeting',this)">Meetings</button>
      </div>
      <div class="grid-3" id="events-grid">${loadingHTML()}</div>
      <div id="events-empty" style="display:none"></div>
    </div>`);

  await loadAllEvents();
}

let allEvents = [];
async function loadAllEvents() {
  const items = await dbSelect('events', {
    eq: ['is_published', true],
    order: ['event_date', { ascending: true }]
  });
  allEvents = items || [];
  renderEventsGrid(allEvents);
}

function renderEventsGrid(items) {
  const grid  = document.getElementById('events-grid');
  const empty = document.getElementById('events-empty');
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = '';
    if (empty) { empty.style.display='block'; empty.innerHTML = emptyHTML('📅','No events found','Try a different filter or check back later.'); }
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = items.map(e => eventCardHTML(e)).join('');
}

function filterEvents(type, btn) {
  document.querySelectorAll('#event-filters .btn').forEach(b => b.classList.remove('active-filter','btn-gold'));
  btn.classList.add('active-filter','btn-gold');
  const filtered = type === 'all' ? allEvents : allEvents.filter(e => e.event_type === type);
  renderEventsGrid(filtered);
}

function eventCardHTML(e) {
  const imgSrc = e.image_path ? getImageUrl('event-images', e.image_path) : null;
  const typeIcons = { workshop:'🔧', seminar:'🎓', competition:'🏆', conference:'🚀', meeting:'📋', other:'📅' };
  const isPast = new Date(e.event_date) < new Date();
  return `
  <div class="card" data-type="${e.event_type}">
    <div class="card-img">
      ${imgSrc ? `<img src="${imgSrc}" alt="${e.title}" loading="lazy">` : `<span>${typeIcons[e.event_type]||'📅'}</span>`}
    </div>
    <div class="card-body">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap">
        <span class="badge badge-gold">${e.event_type||'Event'}</span>
        ${isPast ? '<span class="badge badge-blue">Past</span>' : '<span class="badge badge-green">Upcoming</span>'}
        ${e.is_free ? '<span class="badge" style="background:rgba(34,197,94,0.08);color:var(--green);border:1px solid rgba(34,197,94,0.2)">Free</span>' : ''}
      </div>
      <h3 style="margin-bottom:0.5rem">${e.title}</h3>
      <p style="font-size:0.84rem;margin-bottom:0.75rem">
        📅 ${fmtDate(e.event_date)} &nbsp;•&nbsp; 🕐 ${fmtTime(e.event_date)}<br>
        📍 ${e.location || 'ATBU Campus'}
      </p>
      ${e.description ? `<p style="font-size:0.88rem;line-height:1.6;margin-bottom:1rem">${e.description.slice(0,140)}${e.description.length>140?'…':''}</p>` : ''}
      ${e.registration_url && !isPast
        ? `<a href="${e.registration_url}" target="_blank" class="btn btn-gold btn-sm w-full">Register Now</a>`
        : isPast
        ? `<button class="btn btn-ghost btn-sm w-full" disabled>Event Ended</button>`
        : `<button class="btn btn-outline btn-sm w-full" disabled>Registration TBA</button>`}
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   PAGE: ANNOUNCEMENTS
══════════════════════════════════════════════════════════════ */
async function renderAnnouncements() {
  setContent(`
    <div class="container">
      <div class="page-header">
        <div class="section-label">Chapter News</div>
        <h1>Announcements</h1>
        <p>Stay up to date with the latest news, opportunities, and updates from NIEEE ATBU.</p>
      </div>
      <div id="announcements-grid">${loadingHTML()}</div>
    </div>`);

  const items = await dbSelect('announcements', {
    eq: ['is_published', true],
    order: ['created_at', { ascending: false }]
  });
  const el = document.getElementById('announcements-grid');
  if (!el) return;
  if (!items || !items.length) { el.innerHTML = emptyHTML('📢','No announcements yet','Check back soon.'); return; }

  // Pinned first
  const pinned = items.filter(a => a.is_pinned);
  const rest   = items.filter(a => !a.is_pinned);

  el.innerHTML = `
    ${pinned.length ? `<div style="margin-bottom:2rem">
      <div class="section-label" style="margin-bottom:1rem">📌 Pinned</div>
      <div style="display:flex;flex-direction:column;gap:1rem">${pinned.map(a=>announcementCardHTML(a,true)).join('')}</div>
    </div>` : ''}
    <div style="display:flex;flex-direction:column;gap:1rem">${rest.map(a=>announcementCardHTML(a)).join('')}</div>`;
}

function announcementCardHTML(a, big = false) {
  const imgSrc = a.image_path ? getImageUrl('announcement-images', a.image_path) : null;
  return `
  <div class="announcement-card ${big?'big':''}">
    ${imgSrc ? `<img src="${imgSrc}" alt="${a.title}" loading="lazy" style="width:100%;height:${big?'240':'160'}px;object-fit:cover;border-radius:12px 12px 0 0;margin:-1.5rem -1.5rem 1rem;width:calc(100% + 3rem)">` : ''}
    <div style="display:flex;align-items:flex-start;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.5rem">
      <h3>${a.title}</h3>
      ${a.is_pinned ? '<span class="badge badge-gold">📌 Pinned</span>' : ''}
      <span class="badge badge-blue">${a.category||'General'}</span>
    </div>
    <p>${a.body}</p>
    <div class="meta">
      <span>📅 ${fmtDate(a.created_at)}</span>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   PAGE: RESOURCES
══════════════════════════════════════════════════════════════ */
async function renderResources() {
  setContent(`
    <div class="container">
      <div class="page-header">
        <div class="section-label">Member Resources</div>
        <h1>Resources</h1>
        <p>Handbooks, forms, presentations, and useful links for NIEEE members.</p>
      </div>
      <div class="grid-3" id="resources-grid">${loadingHTML()}</div>
    </div>`);

  const items = await dbSelect('resources', {
    eq: ['is_published', true],
    order: ['created_at', { ascending: false }]
  });
  const el = document.getElementById('resources-grid');
  if (!el) return;
  if (!items || !items.length) { el.innerHTML = emptyHTML('📁','No resources uploaded yet','Resources will appear here soon.'); return; }

  const catIcons = { handbook:'📗', presentation:'📊', form:'📋', report:'📄', other:'📁' };
  el.innerHTML = items.map(r => `
    <div class="card">
      <div class="card-body">
        <div style="font-size:2rem;margin-bottom:0.75rem">${catIcons[r.category]||'📁'}</div>
        <div style="margin-bottom:0.5rem"><span class="badge badge-gold">${r.category||'Other'}</span></div>
        <h3 style="margin-bottom:0.5rem">${r.title}</h3>
        ${r.description ? `<p style="font-size:0.88rem;margin-bottom:1rem">${r.description}</p>` : ''}
        ${r.file_path
          ? `<a href="${getImageUrl('resources', r.file_path)}" target="_blank" class="btn btn-gold btn-sm">⬇ Download</a>`
          : r.external_url
          ? `<a href="${r.external_url}" target="_blank" class="btn btn-outline btn-sm">🔗 Open Link</a>`
          : ''}
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════════
   PAGE: MEMBERSHIP APPLICATION
══════════════════════════════════════════════════════════════ */
function renderMembership() {
  setContent(`
    <div class="container">
      <div class="page-header">
        <div class="section-label">Join the Chapter</div>
        <h1>Membership Application</h1>
        <p>Complete the form below to apply for NIEEE ATBU membership. Applications are reviewed by our membership coordinator.</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:3rem;align-items:start">
        <!-- Benefits -->
        <div>
          <div class="section-label" style="margin-bottom:1rem">Member Benefits</div>
          ${[
            '✅ Access to all chapter workshops and seminars',
            '✅ IEEE student membership pathway',
            '✅ Mentorship from professionals',
            '✅ Priority access to competitions',
            '✅ Exclusive resources and study materials',
            '✅ Official NIEEE membership ID',
            '✅ Career and internship opportunities',
          ].map(b=>`<div style="padding:0.65rem 0;border-bottom:1px solid var(--border);font-size:0.92rem">${b}</div>`).join('')}

          <div class="card" style="margin-top:1.5rem">
            <div class="card-body">
              <div class="section-label">Questions?</div>
              <p style="font-size:0.88rem;margin-top:0.5rem">Contact our membership coordinator:</p>
              <a href="mailto:${siteSettings.contact_email||'nieee@atbu.edu.ng'}"
                 style="color:var(--gold);font-size:0.9rem">
                ${siteSettings.contact_email||'nieee@atbu.edu.ng'}
              </a>
            </div>
          </div>
        </div>

        <!-- Form -->
        <div class="card">
          <div class="card-body">
            <h2 style="margin-bottom:1.5rem">Application Form</h2>
            <form id="membership-form" onsubmit="submitMembership(event)">
              <div class="input-row">
                <div class="form-group">
                  <label class="form-label">First Name *</label>
                  <input class="form-control" name="first_name" placeholder="John" required>
                  <div class="form-error" id="err-first-name">Required</div>
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name *</label>
                  <input class="form-control" name="last_name" placeholder="Doe" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <input class="form-control" name="email" type="email" placeholder="you@atbu.edu.ng" required>
                <div class="form-hint">Use your university email if possible.</div>
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input class="form-control" name="phone" type="tel" placeholder="+234 800 000 0000">
              </div>
              <div class="input-row">
                <div class="form-group">
                  <label class="form-label">Matric Number *</label>
                  <input class="form-control" name="matric_number" placeholder="e.g. ATBU/EEE/2022/001" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Current Level *</label>
                  <select class="form-control" name="level" required>
                    <option value="">Select level</option>
                    <option>100 Level</option>
                    <option>200 Level</option>
                    <option>300 Level</option>
                    <option>400 Level</option>
                    <option>500 Level</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Department *</label>
                <select class="form-control" name="department" required>
                  <option value="">Select department</option>
                  <option>Electrical Engineering</option>
                  <option>Electronic Engineering</option>
                  <option>Computer Engineering</option>
                  <option>Mechatronics Engineering</option>
                  <option>Telecommunications Engineering</option>
                  <option>Other Engineering</option>
                </select>
              </div>
              <div id="membership-general-error" class="form-error" style="margin-bottom:1rem"></div>
              <button class="btn btn-gold w-full btn-lg" type="submit" id="membership-submit-btn">
                Submit Application →
              </button>
            </form>

            <div id="membership-success" style="display:none;text-align:center;padding:2rem">
              <div style="font-size:3rem;margin-bottom:1rem">🎉</div>
              <h3>Application Submitted!</h3>
              <p style="margin-top:0.75rem">Thank you for applying. Our membership coordinator will review your application and contact you shortly.</p>
              <a class="btn btn-gold" style="margin-top:1.5rem" onclick="navigate('home')">Back to Home</a>
            </div>
          </div>
        </div>
      </div>
    </div>`);
}

async function submitMembership(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = document.getElementById('membership-submit-btn');
  const errEl = document.getElementById('membership-general-error');
  btn.disabled = true; btn.textContent = 'Submitting…';
  errEl.classList.remove('show');

  const fd = new FormData(form);
  const payload = {
    full_name: `${fd.get('first_name')} ${fd.get('last_name')}`.trim(),
    email:         fd.get('email'),
    phone:         fd.get('phone'),
    matric_number: fd.get('matric_number'),
    department:    fd.get('department'),
    level:         fd.get('level'),
  };

  try {
    await dbInsert('membership_applications', payload);
    form.style.display = 'none';
    document.getElementById('membership-success').style.display = 'block';
    showToast('Application submitted successfully! 🎉', 'success');
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Submission failed. Please try again or contact us directly.';
    errEl.classList.add('show');
    btn.disabled = false; btn.textContent = 'Submit Application →';
    showToast('Submission failed. Please try again.', 'error');
  }
}

/* ══════════════════════════════════════════════════════════════
   ADMIN: LOGIN
══════════════════════════════════════════════════════════════ */
function renderAdminLogin() {
  setContent(`
    <div style="min-height:calc(100vh - 68px);display:flex;align-items:center;justify-content:center;padding:2rem">
      <div class="card" style="width:100%;max-width:420px">
        <div class="card-body">
          <div style="text-align:center;margin-bottom:2rem">
            <div style="width:56px;height:56px;background:var(--gold);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:900;color:var(--navy);margin:0 auto 0.75rem">N</div>
            <h2>Admin Login</h2>
            <p style="font-size:0.88rem">NIEEE ATBU Website Administrator</p>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input class="form-control" id="admin-email" type="email" placeholder="admin@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-control" id="admin-password" type="password" placeholder="Your password">
          </div>
          <div class="form-error show" id="admin-login-error" style="display:none;margin-bottom:1rem"></div>
          <button class="btn btn-gold w-full" onclick="doAdminLogin()" id="admin-login-btn">
            Log In to Dashboard →
          </button>
          <p style="text-align:center;font-size:0.82rem;margin-top:1rem;color:var(--text-muted)">
            Only authorized administrators can access this page.
          </p>
        </div>
      </div>
    </div>`);
}

async function doAdminLogin() {
  const email    = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const btn      = document.getElementById('admin-login-btn');
  const errEl    = document.getElementById('admin-login-error');
  if (!email || !password) {
    showErr(errEl, 'Please enter your email and password.'); return;
  }
  btn.disabled = true; btn.textContent = 'Logging in…';
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    showErr(errEl, 'Invalid credentials. Please try again.');
    btn.disabled = false; btn.textContent = 'Log In to Dashboard →'; return;
  }
  await handleAuthUser(data.user);
  if (currentUser && currentUser.isAdmin) {
    showToast('Welcome back! 👋', 'success');
    renderAdmin();
  } else {
    await db.auth.signOut();
    showErr(errEl, 'Your account is not authorized as an admin.');
    btn.disabled = false; btn.textContent = 'Log In to Dashboard →';
  }
}

function showErr(el, msg) {
  el.textContent = msg; el.style.display = 'block'; el.classList.add('show');
}

/* ══════════════════════════════════════════════════════════════
   ADMIN: DASHBOARD SHELL
══════════════════════════════════════════════════════════════ */
let adminSection = 'overview';

function renderAdmin() {
  if (!currentUser || !currentUser.isAdmin) { renderAdminLogin(); return; }
  setContent(`
    <div class="admin-layout">
      <!-- Sidebar -->
      <aside class="admin-sidebar">
        ${[
          { id:'overview',     icon:'📊', label:'Overview' },
          { id:'announcements',icon:'📢', label:'Announcements' },
          { id:'events',       icon:'📅', label:'Events' },
          { id:'team',         icon:'👥', label:'Team Members' },
          { id:'membership',   icon:'✍️', label:'Applications' },
          { id:'resources',    icon:'📁', label:'Resources' },
          { id:'settings',     icon:'⚙️', label:'Site Settings' },
        ].map(s=>`
          <button class="admin-nav-item ${adminSection===s.id?'active':''}"
                  onclick="switchAdmin('${s.id}')">
            <span>${s.icon}</span>
            <span class="label">${s.label}</span>
          </button>`).join('')}
        <div style="padding:1.5rem 0 0;border-top:1px solid var(--border);margin-top:1rem">
          <button class="admin-nav-item" onclick="doAdminLogout()">
            <span>🚪</span><span class="label">Log Out</span>
          </button>
        </div>
      </aside>

      <!-- Content area -->
      <div class="admin-content">
        <!-- Each section as a div, shown/hidden by JS -->
        <div class="admin-section ${adminSection==='overview'?'active':''}"      id="admin-overview">
          ${loadingHTML('Loading overview…')}
        </div>
        <div class="admin-section ${adminSection==='announcements'?'active':''}" id="admin-announcements">
          ${loadingHTML()}
        </div>
        <div class="admin-section ${adminSection==='events'?'active':''}"        id="admin-events">
          ${loadingHTML()}
        </div>
        <div class="admin-section ${adminSection==='team'?'active':''}"          id="admin-team">
          ${loadingHTML()}
        </div>
        <div class="admin-section ${adminSection==='membership'?'active':''}"    id="admin-membership">
          ${loadingHTML()}
        </div>
        <div class="admin-section ${adminSection==='resources'?'active':''}"     id="admin-resources">
          ${loadingHTML()}
        </div>
        <div class="admin-section ${adminSection==='settings'?'active':''}"      id="admin-settings">
          ${loadingHTML()}
        </div>
      </div>
    </div>`);

  loadAdminSection(adminSection);
}

function switchAdmin(id) {
  adminSection = id;
  document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach((el,i) => {
    const ids = ['overview','announcements','events','team','membership','resources','settings'];
    el.classList.toggle('active', ids[i]===id);
  });
  const target = document.getElementById(`admin-${id}`);
  if (target) { target.classList.add('active'); loadAdminSection(id); }
}

async function loadAdminSection(id) {
  const el = document.getElementById(`admin-${id}`);
  if (!el) return;

  if (id === 'overview')       { el.innerHTML = await buildOverviewHTML(); }
  if (id === 'announcements')  { el.innerHTML = await buildAnnouncementsAdminHTML(); bindAnnouncementAdmin(); }
  if (id === 'events')         { el.innerHTML = await buildEventsAdminHTML(); bindEventsAdmin(); }
  if (id === 'team')           { el.innerHTML = await buildTeamAdminHTML(); bindTeamAdmin(); }
  if (id === 'membership')     { el.innerHTML = await buildMembershipAdminHTML(); }
  if (id === 'resources')      { el.innerHTML = await buildResourcesAdminHTML(); bindResourcesAdmin(); }
  if (id === 'settings')       { el.innerHTML = buildSettingsHTML(); bindSettingsAdmin(); }
}

/* ── ADMIN: OVERVIEW ── */
async function buildOverviewHTML() {
  const [ann, evts, mbrs, apps] = await Promise.all([
    dbSelect('announcements', { select:'id,is_published' }),
    dbSelect('events', { select:'id,is_published' }),
    dbSelect('team_members', { select:'id' }),
    dbSelect('membership_applications', { select:'id,status' }),
  ]);
  const pendingApps = (apps||[]).filter(a=>a.status==='pending').length;
  return `
    <div>
      <div style="margin-bottom:2rem"><h2>Dashboard Overview</h2><p>Welcome back, ${currentUser.email}</p></div>
      <div class="grid-4" style="margin-bottom:2.5rem">
        ${[
          { icon:'📢', label:'Announcements', val:(ann||[]).length, sub:`${(ann||[]).filter(a=>a.is_published).length} published` },
          { icon:'📅', label:'Events', val:(evts||[]).length, sub:`${(evts||[]).filter(e=>e.is_published).length} published` },
          { icon:'👥', label:'Team Members', val:(mbrs||[]).length, sub:'in 2026-2027' },
          { icon:'✍️', label:'Pending Applications', val:pendingApps, sub:'awaiting review' },
        ].map(s=>`
          <div class="card" style="cursor:pointer">
            <div class="card-body">
              <div style="font-size:1.8rem;margin-bottom:0.5rem">${s.icon}</div>
              <div style="font-size:1.8rem;font-weight:800;font-family:'Syne',sans-serif;color:var(--gold)">${s.val}</div>
              <div style="font-weight:600">${s.label}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.2rem">${s.sub}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-body">
          <h3 style="margin-bottom:1rem">Quick Actions</h3>
          <div style="display:flex;flex-wrap:wrap;gap:0.75rem">
            <button class="btn btn-gold"    onclick="switchAdmin('announcements')">➕ New Announcement</button>
            <button class="btn btn-outline" onclick="switchAdmin('events')">➕ New Event</button>
            <button class="btn btn-ghost"   onclick="switchAdmin('team')">👥 Manage Team</button>
            <button class="btn btn-ghost"   onclick="switchAdmin('membership')">✍️ Review Applications</button>
            <button class="btn btn-ghost"   onclick="switchAdmin('settings')">⚙️ Site Settings</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function doAdminLogout() {
  await db.auth.signOut();
  currentUser = null;
  updateAdminNav(false);
  showToast('Logged out.', 'info');
  navigate('home');
}

/* ── ADMIN: ANNOUNCEMENTS ── */
async function buildAnnouncementsAdminHTML() {
  const items = await dbSelect('announcements', { order: ['created_at', { ascending: false }] });
  return `
    <div>
      <div class="flex-between flex-wrap gap-2" style="margin-bottom:1.5rem">
        <h2>Announcements</h2>
        <button class="btn btn-gold" onclick="openAnnouncementModal()">➕ New Announcement</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Pinned</th><th>Published</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody id="ann-table-body">
            ${(items||[]).map(a=>`
              <tr data-id="${a.id}">
                <td><strong>${a.title}</strong></td>
                <td><span class="badge badge-blue">${a.category||'General'}</span></td>
                <td>${a.is_pinned?'📌 Yes':'No'}</td>
                <td><span class="badge ${a.is_published?'badge-green':'badge-red'}">${a.is_published?'Published':'Draft'}</span></td>
                <td style="font-size:0.82rem;color:var(--text-muted)">${fmtDate(a.created_at)}</td>
                <td>
                  <div style="display:flex;gap:0.4rem">
                    <button class="btn btn-ghost btn-sm" onclick="editAnnouncement(${a.id})">Edit</button>
                    <button class="btn btn-ghost btn-sm" onclick="togglePublish('announcements',${a.id},${!a.is_published})">${a.is_published?'Unpublish':'Publish'}</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('announcements',${a.id},this.closest('tr'))">Delete</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <!-- Modal -->
    <div class="modal-backdrop" id="ann-modal">
      <div class="modal">
        <div class="modal-header">
          <h3 id="ann-modal-title">New Announcement</h3>
          <button class="modal-close" onclick="closeModal('ann-modal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="ann-id">
          <div class="form-group"><label class="form-label">Title *</label><input class="form-control" id="ann-title" placeholder="Announcement title"></div>
          <div class="form-group"><label class="form-label">Body *</label><textarea class="form-control" id="ann-body" rows="5" placeholder="Full announcement text…"></textarea></div>
          <div class="input-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-control" id="ann-category">
                <option value="general">General</option>
                <option value="event">Event</option>
                <option value="election">Election</option>
                <option value="academic">Academic</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Image (optional)</label>
              <input class="form-control" type="file" id="ann-image" accept="image/*">
            </div>
          </div>
          <div style="display:flex;gap:1.5rem">
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer"><input type="checkbox" id="ann-published"> Publish immediately</label>
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer"><input type="checkbox" id="ann-pinned"> Pin to top</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('ann-modal')">Cancel</button>
          <button class="btn btn-gold" onclick="saveAnnouncement()">Save Announcement</button>
        </div>
      </div>
    </div>`;
}

function bindAnnouncementAdmin() { /* event listeners already inline */ }

function openAnnouncementModal(data = null) {
  document.getElementById('ann-id').value         = data?.id || '';
  document.getElementById('ann-title').value      = data?.title || '';
  document.getElementById('ann-body').value       = data?.body || '';
  document.getElementById('ann-category').value   = data?.category || 'general';
  document.getElementById('ann-published').checked = data?.is_published || false;
  document.getElementById('ann-pinned').checked   = data?.is_pinned || false;
  document.getElementById('ann-modal-title').textContent = data ? 'Edit Announcement' : 'New Announcement';
  openModal('ann-modal');
}

async function editAnnouncement(id) {
  const data = await dbSelect('announcements', { eq:['id',id], single:true });
  if (data) openAnnouncementModal(data);
}

async function saveAnnouncement() {
  const id       = document.getElementById('ann-id').value;
  const title    = document.getElementById('ann-title').value.trim();
  const body     = document.getElementById('ann-body').value.trim();
  const category = document.getElementById('ann-category').value;
  const published= document.getElementById('ann-published').checked;
  const pinned   = document.getElementById('ann-pinned').checked;
  const imageFile= document.getElementById('ann-image').files[0];

  if (!title || !body) { showToast('Title and body are required.','error'); return; }

  let image_path = undefined;
  if (imageFile) {
    try {
      const ext  = imageFile.name.split('.').pop();
      const path = `${Date.now()}.${ext}`;
      image_path = await uploadFile('announcement-images', imageFile, path);
    } catch(e) { showToast('Image upload failed.','error'); return; }
  }

  const payload = { title, body, category, is_published: published, is_pinned: pinned, ...(image_path !== undefined ? { image_path } : {}) };
  try {
    if (id) await dbUpdate('announcements', id, payload);
    else    await dbInsert('announcements', payload);
    showToast(id ? 'Announcement updated!' : 'Announcement created!', 'success');
    closeModal('ann-modal');
    loadAdminSection('announcements');
  } catch(e) { showToast('Save failed: ' + e.message, 'error'); }
}

/* ── ADMIN: EVENTS ── */
async function buildEventsAdminHTML() {
  const items = await dbSelect('events', { order: ['event_date', { ascending: false }] });
  return `
    <div>
      <div class="flex-between flex-wrap gap-2" style="margin-bottom:1.5rem">
        <h2>Events</h2>
        <button class="btn btn-gold" onclick="openEventModal()">➕ New Event</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Location</th><th>Published</th><th>Actions</th></tr></thead>
          <tbody>
            ${(items||[]).map(e=>`
              <tr>
                <td><strong>${e.title}</strong></td>
                <td><span class="badge badge-gold">${e.event_type||'Other'}</span></td>
                <td style="font-size:0.82rem">${fmtDate(e.event_date)}</td>
                <td style="font-size:0.85rem;color:var(--text-muted)">${e.location||'—'}</td>
                <td><span class="badge ${e.is_published?'badge-green':'badge-red'}">${e.is_published?'Published':'Draft'}</span></td>
                <td>
                  <div style="display:flex;gap:0.4rem">
                    <button class="btn btn-ghost btn-sm" onclick="editEvent(${e.id})">Edit</button>
                    <button class="btn btn-ghost btn-sm" onclick="togglePublish('events',${e.id},${!e.is_published})">${e.is_published?'Unpublish':'Publish'}</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('events',${e.id},this.closest('tr'))">Delete</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <!-- Event Modal -->
    <div class="modal-backdrop" id="event-modal">
      <div class="modal">
        <div class="modal-header">
          <h3 id="event-modal-title">New Event</h3>
          <button class="modal-close" onclick="closeModal('event-modal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="event-id">
          <div class="form-group"><label class="form-label">Title *</label><input class="form-control" id="event-title"></div>
          <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="event-desc" rows="4"></textarea></div>
          <div class="input-row">
            <div class="form-group"><label class="form-label">Date & Time *</label><input class="form-control" id="event-date" type="datetime-local"></div>
            <div class="form-group"><label class="form-label">Event Type</label>
              <select class="form-control" id="event-type">
                <option value="workshop">Workshop</option><option value="seminar">Seminar</option>
                <option value="competition">Competition</option><option value="conference">Conference</option>
                <option value="meeting">Meeting</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Location</label><input class="form-control" id="event-location" placeholder="e.g. EEE Seminar Room, ATBU"></div>
          <div class="form-group"><label class="form-label">Registration URL (optional)</label><input class="form-control" id="event-reg-url" placeholder="https://…"></div>
          <div class="form-group"><label class="form-label">Image (optional)</label><input class="form-control" type="file" id="event-image" accept="image/*"></div>
          <div style="display:flex;gap:1.5rem">
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer"><input type="checkbox" id="event-published"> Publish</label>
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer"><input type="checkbox" id="event-free" checked> Free event</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('event-modal')">Cancel</button>
          <button class="btn btn-gold" onclick="saveEvent()">Save Event</button>
        </div>
      </div>
    </div>`;
}

function bindEventsAdmin() {}

function openEventModal(data=null) {
  document.getElementById('event-id').value          = data?.id||'';
  document.getElementById('event-title').value       = data?.title||'';
  document.getElementById('event-desc').value        = data?.description||'';
  document.getElementById('event-type').value        = data?.event_type||'workshop';
  document.getElementById('event-location').value    = data?.location||'';
  document.getElementById('event-reg-url').value     = data?.registration_url||'';
  document.getElementById('event-published').checked = data?.is_published||false;
  document.getElementById('event-free').checked      = data?.is_free !== false;
  if (data?.event_date) {
    document.getElementById('event-date').value = new Date(data.event_date).toISOString().slice(0,16);
  } else {
    document.getElementById('event-date').value = '';
  }
  document.getElementById('event-modal-title').textContent = data ? 'Edit Event' : 'New Event';
  openModal('event-modal');
}

async function editEvent(id) {
  const data = await dbSelect('events', { eq:['id',id], single:true });
  if (data) openEventModal(data);
}

async function saveEvent() {
  const id          = document.getElementById('event-id').value;
  const title       = document.getElementById('event-title').value.trim();
  const description = document.getElementById('event-desc').value.trim();
  const event_type  = document.getElementById('event-type').value;
  const location    = document.getElementById('event-location').value.trim();
  const reg_url     = document.getElementById('event-reg-url').value.trim();
  const event_date  = document.getElementById('event-date').value;
  const published   = document.getElementById('event-published').checked;
  const is_free     = document.getElementById('event-free').checked;
  const imageFile   = document.getElementById('event-image').files[0];
  if (!title || !event_date) { showToast('Title and date are required.','error'); return; }

  let image_path = undefined;
  if (imageFile) {
    try { image_path = await uploadFile('event-images', imageFile, `${Date.now()}.${imageFile.name.split('.').pop()}`); }
    catch(e) { showToast('Image upload failed.','error'); return; }
  }
  const payload = { title, description, event_type, location, event_date: new Date(event_date).toISOString(),
    registration_url: reg_url||null, is_published: published, is_free,
    ...(image_path !== undefined ? { image_path } : {}) };
  try {
    if (id) await dbUpdate('events', id, payload);
    else    await dbInsert('events', payload);
    showToast(id ? 'Event updated!' : 'Event created!', 'success');
    closeModal('event-modal');
    loadAdminSection('events');
  } catch(e) { showToast('Save failed: '+e.message,'error'); }
}

/* ── ADMIN: TEAM ── */
async function buildTeamAdminHTML() {
  const members = await dbSelect('team_members', { order: ['display_order', { ascending: true }] });
  return `
    <div>
      <div class="flex-between flex-wrap gap-2" style="margin-bottom:1.5rem">
        <h2>Team Members</h2>
        <button class="btn btn-gold" onclick="openTeamModal()">➕ Add Member</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Position</th><th>Category</th><th>Year</th><th>Published</th><th>Order</th><th>Actions</th></tr></thead>
          <tbody>
            ${(members||[]).map(m=>`
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:0.65rem">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--navy-500);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;overflow:hidden">
                      ${m.image_path ? `<img src="${getImageUrl('team-photos',m.image_path)}" style="width:100%;height:100%;object-fit:cover">` : '👤'}
                    </div>
                    <strong>${m.full_name}</strong>
                  </div>
                </td>
                <td style="font-size:0.88rem">${m.position}</td>
                <td><span class="badge badge-gold">${m.category}</span></td>
                <td style="font-size:0.82rem">${m.academic_year}</td>
                <td><span class="badge ${m.is_published?'badge-green':'badge-red'}">${m.is_published?'✓ Yes':'Draft'}</span></td>
                <td style="font-size:0.88rem">${m.display_order}</td>
                <td>
                  <div style="display:flex;gap:0.4rem">
                    <button class="btn btn-ghost btn-sm" onclick="editTeamMember(${m.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('team_members',${m.id},this.closest('tr'))">Delete</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <!-- Team Modal -->
    <div class="modal-backdrop" id="team-modal">
      <div class="modal">
        <div class="modal-header">
          <h3 id="team-modal-title">Add Team Member</h3>
          <button class="modal-close" onclick="closeModal('team-modal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="team-id">
          <div class="input-row">
            <div class="form-group"><label class="form-label">Full Name *</label><input class="form-control" id="team-name"></div>
            <div class="form-group"><label class="form-label">Position *</label><input class="form-control" id="team-position" placeholder="e.g. Chairman"></div>
          </div>
          <div class="input-row">
            <div class="form-group"><label class="form-label">Category</label>
              <select class="form-control" id="team-category">
                <option value="executive">Executive Council</option>
                <option value="appointee">Appointee / Coordinator</option>
                <option value="contributor">Other Contributor</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Academic Year</label>
              <input class="form-control" id="team-year" value="2026-2027">
            </div>
          </div>
          <div class="form-group"><label class="form-label">Short Bio</label><textarea class="form-control" id="team-bio" rows="3" placeholder="1–2 sentences…"></textarea></div>
          <div class="input-row">
            <div class="form-group"><label class="form-label">Email (optional)</label><input class="form-control" id="team-email" type="email"></div>
            <div class="form-group"><label class="form-label">LinkedIn URL</label><input class="form-control" id="team-linkedin"></div>
          </div>
          <div class="input-row">
            <div class="form-group"><label class="form-label">Photo</label><input class="form-control" type="file" id="team-photo" accept="image/*"></div>
            <div class="form-group"><label class="form-label">Display Order</label><input class="form-control" id="team-order" type="number" value="99"></div>
          </div>
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin-top:0.5rem"><input type="checkbox" id="team-published" checked> Published</label>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('team-modal')">Cancel</button>
          <button class="btn btn-gold" onclick="saveTeamMember()">Save Member</button>
        </div>
      </div>
    </div>`;
}

function bindTeamAdmin() {}
function openTeamModal(data=null) {
  document.getElementById('team-id').value        = data?.id||'';
  document.getElementById('team-name').value      = data?.full_name||'';
  document.getElementById('team-position').value  = data?.position||'';
  document.getElementById('team-category').value  = data?.category||'executive';
  document.getElementById('team-year').value      = data?.academic_year||'2026-2027';
  document.getElementById('team-bio').value       = data?.bio||'';
  document.getElementById('team-email').value     = data?.email||'';
  document.getElementById('team-linkedin').value  = data?.linkedin_url||'';
  document.getElementById('team-order').value     = data?.display_order||99;
  document.getElementById('team-published').checked = data?.is_published !== false;
  document.getElementById('team-modal-title').textContent = data ? 'Edit Team Member' : 'Add Team Member';
  openModal('team-modal');
}
async function editTeamMember(id) {
  const data = await dbSelect('team_members', { eq:['id',id], single:true });
  if (data) openTeamModal(data);
}
async function saveTeamMember() {
  const id        = document.getElementById('team-id').value;
  const full_name = document.getElementById('team-name').value.trim();
  const position  = document.getElementById('team-position').value.trim();
  if (!full_name || !position) { showToast('Name and position required.','error'); return; }
  const photoFile = document.getElementById('team-photo').files[0];
  let image_path = undefined;
  if (photoFile) {
    try { image_path = await uploadFile('team-photos', photoFile, `${Date.now()}.${photoFile.name.split('.').pop()}`); }
    catch(e) { showToast('Photo upload failed.','error'); return; }
  }
  const payload = {
    full_name, position,
    category:      document.getElementById('team-category').value,
    academic_year: document.getElementById('team-year').value,
    bio:           document.getElementById('team-bio').value.trim()||null,
    email:         document.getElementById('team-email').value.trim()||null,
    linkedin_url:  document.getElementById('team-linkedin').value.trim()||null,
    display_order: parseInt(document.getElementById('team-order').value)||99,
    is_published:  document.getElementById('team-published').checked,
    ...(image_path !== undefined ? { image_path } : {}),
  };
  try {
    if (id) await dbUpdate('team_members', id, payload);
    else    await dbInsert('team_members', payload);
    showToast(id ? 'Member updated!' : 'Member added!', 'success');
    closeModal('team-modal');
    loadAdminSection('team');
  } catch(e) { showToast('Save failed: '+e.message,'error'); }
}

/* ── ADMIN: MEMBERSHIP APPLICATIONS ── */
async function buildMembershipAdminHTML() {
  const apps = await dbSelect('membership_applications', { order: ['applied_at', { ascending: false }] });
  const statusColors = { pending:'badge-gold', approved:'badge-green', rejected:'badge-red' };
  return `
    <div>
      <h2 style="margin-bottom:1.5rem">Membership Applications</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Matric No.</th><th>Dept.</th><th>Level</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${(apps||[]).length === 0
              ? `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">No applications yet.</td></tr>`
              : (apps||[]).map(a=>`
              <tr>
                <td><strong>${a.full_name}</strong></td>
                <td style="font-size:0.85rem">${a.email}</td>
                <td style="font-size:0.85rem">${a.matric_number||'—'}</td>
                <td style="font-size:0.85rem">${a.department||'—'}</td>
                <td>${a.level||'—'}</td>
                <td><span class="badge ${statusColors[a.status]||'badge-gold'}">${a.status}</span></td>
                <td style="font-size:0.8rem;color:var(--text-muted)">${fmtDate(a.applied_at)}</td>
                <td>
                  <div style="display:flex;gap:0.35rem">
                    <button class="btn btn-success btn-sm" onclick="updateAppStatus(${a.id},'approved',this)">Approve</button>
                    <button class="btn btn-danger btn-sm"  onclick="updateAppStatus(${a.id},'rejected',this)">Reject</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function updateAppStatus(id, status, btn) {
  btn.disabled = true;
  try {
    await dbUpdate('membership_applications', id, { status, reviewed_at: new Date().toISOString(), reviewed_by: currentUser.email });
    showToast(`Application ${status}!`, 'success');
    loadAdminSection('membership');
  } catch(e) { showToast('Update failed.','error'); btn.disabled=false; }
}

/* ── ADMIN: RESOURCES ── */
async function buildResourcesAdminHTML() {
  const items = await dbSelect('resources', { order: ['created_at', { ascending: false }] });
  return `
    <div>
      <div class="flex-between flex-wrap gap-2" style="margin-bottom:1.5rem">
        <h2>Resources</h2>
        <button class="btn btn-gold" onclick="openResourceModal()">➕ Add Resource</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Published</th><th>Actions</th></tr></thead>
          <tbody>
            ${(items||[]).map(r=>`
              <tr>
                <td><strong>${r.title}</strong></td>
                <td><span class="badge badge-gold">${r.category||'Other'}</span></td>
                <td>${r.file_path?'📄 File':'🔗 Link'}</td>
                <td><span class="badge ${r.is_published?'badge-green':'badge-red'}">${r.is_published?'Published':'Draft'}</span></td>
                <td>
                  <div style="display:flex;gap:0.4rem">
                    <button class="btn btn-ghost btn-sm" onclick="editResource(${r.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('resources',${r.id},this.closest('tr'))">Delete</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-backdrop" id="resource-modal">
      <div class="modal">
        <div class="modal-header"><h3>Resource</h3><button class="modal-close" onclick="closeModal('resource-modal')">✕</button></div>
        <div class="modal-body">
          <input type="hidden" id="res-id">
          <div class="form-group"><label class="form-label">Title *</label><input class="form-control" id="res-title"></div>
          <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="res-desc" rows="3"></textarea></div>
          <div class="input-row">
            <div class="form-group"><label class="form-label">Category</label>
              <select class="form-control" id="res-category">
                <option value="handbook">Handbook</option><option value="presentation">Presentation</option>
                <option value="form">Form</option><option value="report">Report</option><option value="other">Other</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">External URL (if no file)</label><input class="form-control" id="res-url" placeholder="https://…"></div>
          </div>
          <div class="form-group"><label class="form-label">File (PDF, DOC etc.)</label><input class="form-control" type="file" id="res-file"></div>
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer"><input type="checkbox" id="res-published" checked> Published</label>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('resource-modal')">Cancel</button>
          <button class="btn btn-gold" onclick="saveResource()">Save</button>
        </div>
      </div>
    </div>`;
}
function bindResourcesAdmin() {}
function openResourceModal(data=null) {
  document.getElementById('res-id').value        = data?.id||'';
  document.getElementById('res-title').value     = data?.title||'';
  document.getElementById('res-desc').value      = data?.description||'';
  document.getElementById('res-category').value  = data?.category||'other';
  document.getElementById('res-url').value       = data?.external_url||'';
  document.getElementById('res-published').checked = data?.is_published !== false;
  openModal('resource-modal');
}
async function editResource(id) {
  const data = await dbSelect('resources',{eq:['id',id],single:true});
  if(data) openResourceModal(data);
}
async function saveResource() {
  const id    = document.getElementById('res-id').value;
  const title = document.getElementById('res-title').value.trim();
  if(!title) { showToast('Title required.','error'); return; }
  const file  = document.getElementById('res-file').files[0];
  let file_path = undefined;
  if(file) {
    try { file_path = await uploadFile('resources', file, `${Date.now()}-${file.name}`); }
    catch(e) { showToast('Upload failed.','error'); return; }
  }
  const payload = { title, description: document.getElementById('res-desc').value.trim()||null,
    category: document.getElementById('res-category').value,
    external_url: document.getElementById('res-url').value.trim()||null,
    is_published: document.getElementById('res-published').checked,
    ...(file_path !== undefined ? { file_path } : {}) };
  try {
    if(id) await dbUpdate('resources',id,payload);
    else   await dbInsert('resources',payload);
    showToast('Resource saved!','success');
    closeModal('resource-modal');
    loadAdminSection('resources');
  } catch(e) { showToast('Save failed.','error'); }
}

/* ── ADMIN: SITE SETTINGS ── */
function buildSettingsHTML() {
  const s = siteSettings;
  return `
    <div>
      <h2 style="margin-bottom:1.5rem">Site Settings</h2>
      <div class="card">
        <div class="card-body">
          <div class="section-label" style="margin-bottom:1rem">Organization Info</div>
          ${['site_name','tagline','about_intro','vision','mission','contact_email','contact_phone','contact_address'].map(k=>`
            <div class="form-group">
              <label class="form-label">${k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</label>
              ${k.includes('intro')||k.includes('vision')||k.includes('mission')
                ? `<textarea class="form-control" id="setting-${k}" rows="4">${s[k]||''}</textarea>`
                : `<input class="form-control" id="setting-${k}" value="${s[k]||''}">`}
            </div>`).join('')}
          <div class="section-label" style="margin:1.5rem 0 1rem">Social Media Links</div>
          ${['facebook_url','twitter_url','instagram_url','linkedin_url','whatsapp_url'].map(k=>`
            <div class="form-group">
              <label class="form-label">${k.replace('_url','').replace(/\b\w/g,c=>c.toUpperCase())}</label>
              <input class="form-control" id="setting-${k}" value="${s[k]||'#'}" placeholder="https://…">
            </div>`).join('')}
          <button class="btn btn-gold" onclick="saveSettings()">💾 Save All Settings</button>
        </div>
      </div>
    </div>`;
}

function bindSettingsAdmin() {}

async function saveSettings() {
  const keys = ['site_name','tagline','about_intro','vision','mission','contact_email','contact_phone','contact_address','facebook_url','twitter_url','instagram_url','linkedin_url','whatsapp_url'];
  const updates = keys.map(k => ({
    key: k, value: (document.getElementById(`setting-${k}`)?.value||'').trim()
  }));
  try {
    for (const u of updates) {
      await db.from('site_settings').upsert({ key: u.key, value: u.value }, { onConflict: 'key' });
      siteSettings[u.key] = u.value;
    }
    applySettingsToDOM();
    showToast('Settings saved! ✅', 'success');
  } catch(e) { showToast('Save failed: '+e.message,'error'); }
}

/* ── ADMIN: SHARED HELPERS ── */
async function togglePublish(table, id, newVal) {
  try {
    await dbUpdate(table, id, { is_published: newVal });
    showToast(newVal ? 'Published!' : 'Unpublished.', 'success');
    loadAdminSection(adminSection);
  } catch(e) { showToast('Failed.','error'); }
}

async function deleteRecord(table, id, row) {
  if (!confirm('Are you sure you want to delete this record? This cannot be undone.')) return;
  try {
    await dbDelete(table, id);
    if (row) row.style.opacity='0.4';
    setTimeout(() => { if (row) row.remove(); }, 400);
    showToast('Deleted.', 'success');
  } catch(e) { showToast('Delete failed.','error'); }
}

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
  }
});
