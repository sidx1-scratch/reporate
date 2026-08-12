// app.js — vanilla JS, no build step, no dependencies.

const form = document.getElementById('search-form');
const input = document.getElementById('repo-input');
const tryExampleBtn = document.getElementById('try-example');

const emptyState = document.getElementById('empty-state');
const loadingState = document.getElementById('loading-state');
const loadingText = document.getElementById('loading-text');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const results = document.getElementById('results');

const LOADING_MESSAGES = [
  "Reading the README…",
  "Counting the stars (the GitHub kind)…",
  "Interviewing imaginary customers…",
  "Checking if anyone read the install instructions…",
  "Why do i even bother reviewing?",
];

const LANG_COLORS = [
  '#ff7a3d', '#1a7f5a', '#0b1726', '#d98a1f',
  '#5b8def', '#a45ee5', '#57667a', '#c2554b',
];

function setView(view) {
  emptyState.hidden = view !== 'empty';
  loadingState.hidden = view !== 'loading';
  errorState.hidden = view !== 'error';
  results.hidden = view !== 'results';
}

function cycleLoadingMessages() {
  let i = 0;
  loadingText.textContent = LOADING_MESSAGES[0];
  return setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    loadingText.textContent = LOADING_MESSAGES[i];
  }, 1800);
}

function starString(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function renderHistogram(reviews) {
  const counts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  );
  const max = Math.max(1, ...counts);
  const histogram = document.getElementById('histogram');
  histogram.innerHTML = '';

  [5, 4, 3, 2, 1].forEach((star, idx) => {
    const row = document.createElement('div');
    row.className = 'histogram-row';

    const label = document.createElement('span');
    label.textContent = star;

    const track = document.createElement('div');
    track.className = 'histogram-track';
    const fill = document.createElement('div');
    fill.className = 'histogram-fill';
    fill.style.width = `${(counts[idx] / max) * 100}%`;
    track.appendChild(fill);

    const count = document.createElement('span');
    count.textContent = counts[idx];

    row.append(label, track, count);
    histogram.appendChild(row);
  });
}

function renderLanguageBar(languageBreakdown) {
  const bar = document.getElementById('lang-bar');
  const legend = document.getElementById('lang-legend');
  bar.innerHTML = '';
  legend.innerHTML = '';

  if (!languageBreakdown || languageBreakdown.length === 0) {
    bar.style.display = 'none';
    const li = document.createElement('li');
    li.textContent = 'Unknown ingredients';
    legend.appendChild(li);
    return;
  }
  bar.style.display = 'flex';

  languageBreakdown.slice(0, 6).forEach((lang, idx) => {
    const color = LANG_COLORS[idx % LANG_COLORS.length];

    const seg = document.createElement('div');
    seg.className = 'lang-bar-seg';
    seg.style.width = `${lang.percent}%`;
    seg.style.background = color;
    bar.appendChild(seg);

    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'lang-dot';
    dot.style.background = color;
    li.append(dot, document.createTextNode(`${lang.name} — ${lang.percent}%`));
    legend.appendChild(li);
  });
}

function renderReviews(reviews) {
  const list = document.getElementById('review-list');
  list.innerHTML = '';

  reviews.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'review-card';

    const avatar = document.createElement('div');
    avatar.className = 'review-avatar';
    avatar.textContent = initials(r.name);

    const content = document.createElement('div');

    const meta = document.createElement('div');
    meta.className = 'review-meta';
    meta.innerHTML =
      `<span class="review-name">${escapeHtml(r.name)}</span> — ${escapeHtml(r.location)}` +
      (r.verified ? `<span class="verified-badge">Verified Install</span>` : '');

    const stars = document.createElement('div');
    stars.className = 'stars';
    stars.textContent = starString(r.rating);

    const title = document.createElement('p');
    title.className = 'review-title';
    title.textContent = r.title;

    const body = document.createElement('p');
    body.className = 'review-body';
    body.textContent = r.body;

    const footer = document.createElement('p');
    footer.className = 'review-footer';
    footer.textContent = `${r.helpfulVotes} people found this helpful`;

    content.append(meta, stars, title, body, footer);
    li.append(avatar, content);
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderResults(data) {
  document.getElementById('repo-name').textContent = data.repo;
  document.getElementById('repo-description').textContent =
    data.description || 'No description provided. Bold choice.';
  document.getElementById('stat-stars').textContent = data.stars;
  document.getElementById('stat-forks').textContent = data.forks;
  document.getElementById('stat-issues').textContent = data.openIssues;
  document.getElementById('stat-license').textContent = data.license || 'None';

  const avg =
    data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length;
  document.getElementById('avg-rating').textContent = avg.toFixed(1);
  document.getElementById('avg-stars').textContent = starString(avg);
  document.getElementById('rating-count').textContent =
    `${data.reviews.length} ratings`;

  renderHistogram(data.reviews);
  renderLanguageBar(data.languageBreakdown);
  renderReviews(data.reviews);

  setView('results');
}

async function submitRepo(repoValue) {
  if (!repoValue.trim()) return;

  setView('loading');
  const interval = cycleLoadingMessages();

  try {
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: repoValue.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    renderResults(data);
  } catch (err) {
    errorMessage.textContent = err.message;
    setView('error');
  } finally {
    clearInterval(interval);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  submitRepo(input.value);
});

tryExampleBtn.addEventListener('click', () => {
  input.value = 'sidx1-scratch/prefrontal';
  submitRepo(input.value);
});
