const grid             = document.getElementById('anime-grid');
const pills            = document.querySelectorAll('.pill');
const mainSection      = document.querySelector('main');
const watchlistSection = document.getElementById('watchlist-section');
const watchlistGrid    = document.getElementById('watchlist-grid');

let allAnime    = [];
let activeGenre = 'All';

// --- localStorage helpers ---
function getWatchlist() {
  const saved = localStorage.getItem('watchlist');
  return saved ? JSON.parse(saved) : [];
}

function addToWatchlist(anime) {
  const watchlist = getWatchlist();
  const alreadySaved = watchlist.some(function(item) {
    return item.mal_id === anime.mal_id;
  });
  if (!alreadySaved) {
    watchlist.push(anime);
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }
}

function removeFromWatchlist(id) {
  const watchlist = getWatchlist();
  const updated = watchlist.filter(function(item) {
    return item.mal_id !== id;
  });
  localStorage.setItem('watchlist', JSON.stringify(updated));
}

// --- render cards ---
function renderCards(animeList) {
  grid.innerHTML = '';

  if (animeList.length === 0) {
    grid.innerHTML = '<p class="loading">No results found.</p>';
    return;
  }

  const watchlist = getWatchlist();

  animeList.forEach(function(anime) {
    const title   = anime.title;
    const score   = anime.score ?? 'N/A';
    const image   = anime.images.jpg.image_url;
    const genre   = anime.genres[0] ? anime.genres[0].name : 'Anime';
    const year    = anime.year ?? 'N/A';
    const id      = anime.mal_id;
    const isSaved = watchlist.some(function(item) { return item.mal_id === id; });

    grid.innerHTML += `
      <div class="card">
        <div class="card-img-wrapper">
          <img src="${image}" alt="${title}" />
          <button class="bookmark-btn ${isSaved ? 'saved' : ''}" data-id="${id}">
            ${isSaved ? '★' : '☆'}
          </button>
        </div>
        <div class="card-body">
          <span class="genre-tag">${genre}</span>
          <h3>${title}</h3>
          <p class="meta">${year} · ★ ${score}</p>
        </div>
      </div>
    `;
  });

  document.querySelectorAll('.bookmark-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const id    = parseInt(btn.dataset.id);
      const anime = allAnime.find(function(a) { return a.mal_id === id; });
      if (btn.classList.contains('saved')) {
        removeFromWatchlist(id);
        btn.classList.remove('saved');
        btn.textContent = '☆';
      } else {
        addToWatchlist(anime);
        btn.classList.add('saved');
        btn.textContent = '★';
      }
    });
  });
}

// --- filters ---
function applyFilters() {
  const searchText = document.getElementById('search-input').value.toLowerCase();

  let filtered = allAnime;

  // genre filter — case insensitive comparison
  if (activeGenre !== 'All') {
    filtered = filtered.filter(function(anime) {
      return anime.genres.some(function(g) {
        return g.name.toLowerCase() === activeGenre.toLowerCase();
      });
    });
  }

  // search filter
  if (searchText !== '') {
    filtered = filtered.filter(function(anime) {
      return anime.title.toLowerCase().includes(searchText);
    });
  }

  renderCards(filtered);
}

// --- watchlist page ---
function showWatchlist() {
  const watchlist = getWatchlist();
  watchlistGrid.innerHTML = '';

  if (watchlist.length === 0) {
    watchlistGrid.innerHTML = '<p class="loading">Your watchlist is empty. Click ☆ on any anime to save it.</p>';
  } else {
    watchlist.forEach(function(anime) {
      watchlistGrid.innerHTML += `
        <div class="card">
          <div class="card-img-wrapper">
            <img src="${anime.images.jpg.image_url}" alt="${anime.title}" />
            <button class="bookmark-btn saved remove-btn" data-id="${anime.mal_id}">★</button>
          </div>
          <div class="card-body">
            <span class="genre-tag">${anime.genres[0] ? anime.genres[0].name : 'Anime'}</span>
            <h3>${anime.title}</h3>
            <p class="meta">${anime.year ?? 'N/A'} · ★ ${anime.score ?? 'N/A'}</p>
          </div>
        </div>
      `;
    });

    document.querySelectorAll('.remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        removeFromWatchlist(parseInt(btn.dataset.id));
        showWatchlist();
      });
    });
  }

  mainSection.style.display      = 'none';
  watchlistSection.style.display = 'block';
}

// --- event listeners ---
pills.forEach(function(pill) {
  pill.addEventListener('click', function() {
    pills.forEach(function(p) { p.classList.remove('active'); });
    pill.classList.add('active');
    activeGenre = pill.dataset.genre;
    applyFilters();
  });
});

// search input
document.getElementById('search-input').addEventListener('input', function() {
  applyFilters();
});

function setActiveNav(id) {
  document.querySelectorAll('.site-nav a').forEach(function(a) {
    a.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

document.getElementById('nav-home').addEventListener('click', function(e) {
  e.preventDefault();
  setActiveNav('nav-home');
  mainSection.style.display      = 'block';
  watchlistSection.style.display = 'none';
  renderCards(allAnime);
});

document.getElementById('nav-watchlist').addEventListener('click', function(e) {
  e.preventDefault();
  setActiveNav('nav-watchlist');
  showWatchlist();
});

document.getElementById('nav-top').addEventListener('click', function(e) {
  e.preventDefault();
  setActiveNav('nav-top');
  showTopRated();
});

// clear all button
document.getElementById('clear-btn').addEventListener('click', function() {
  localStorage.removeItem('watchlist');
  showWatchlist();
});

// --- fetch on load ---
async function fetchAnime() {
  grid.innerHTML = Array(12).fill(`
    <div class="skeleton">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>
  `).join('');

  try {
    const response = await fetch('https://api.jikan.moe/v4/top/anime?limit=24');

    if (!response.ok) {
      throw new Error('API returned an error');
    }

    const data = await response.json();
    allAnime   = data.data;
    renderCards(allAnime);

  } catch (error) {
    grid.innerHTML = `
      <p class="error-msg">
        Could not load anime. Check your connection and
        <button onclick="fetchAnime()">try again</button>.
      </p>
    `;
  }
}

async function showTopRated() {
  // switch view back to main section
  mainSection.style.display      = 'block';
  watchlistSection.style.display = 'none';

  // show skeletons while loading
  grid.innerHTML = Array(12).fill(`
    <div class="skeleton">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>
  `).join('');

  try {
    const response = await fetch('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=24');

    if (!response.ok) {
      throw new Error('Failed to fetch top rated');
    }

    const data = await response.json();
    allAnime   = data.data;
    renderCards(allAnime);

  } catch (error) {
    grid.innerHTML = '<p class="error-msg">Could not load. <button onclick="showTopRated()">Try again</button></p>';
  }
}

fetchAnime();