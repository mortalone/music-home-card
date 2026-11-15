const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('music-home-card.js', 'utf8');

// Extract helper functions
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = name => `<svg data-icon="${name}"></svg>`;
const SEARCH_LABELS = { playlist: 'Playlister', album: 'Album', artist: 'Kunstnere', track: 'Sange', radio: 'Radio', podcast: 'Podcasts', audiobook: 'Lydbøger' };
const LABELS = SEARCH_LABELS;

// Extract providerOf and itemOf from source
const providerOfCode = source.slice(source.indexOf('  const providerOf ='), source.indexOf('  const sortByProvider ='));
const sortByProviderCode = source.slice(source.indexOf('  const sortByProvider ='), source.indexOf('  const ICONS ='));
const itemOfCode = source.slice(source.indexOf('  const itemOf ='), source.indexOf('  const providerOf ='));

const helperContext = { esc, icon, SEARCH_LABELS, LABELS };
vm.runInNewContext(`${itemOfCode}\n${providerOfCode}\n${sortByProviderCode}\nthis.providerOf=providerOf;this.itemOf=itemOf;this.sortByProvider=sortByProvider;`, helperContext);
const { providerOf, itemOf, sortByProvider } = helperContext;

// 1. Test providerOf
assert.equal(providerOf({ uri: 'spotify--RdjNJoeb://artist/2P1puQXmG48EVLBrHbum1J' }).id, 'spotify', 'Spotify uri scheme');
assert.equal(providerOf({ image: 'https://i.scdn.co/image/ab6761610000e5eb' }).id, 'spotify', 'scdn.co image');
assert.equal(providerOf({ image: 'https://pickasso.spotifycdn.com/image/ab67c0de' }).id, 'spotify', 'spotifycdn.com image');
assert.equal(providerOf({ image: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c' }).id, 'spotify', 'image-cdn-ak.spotifycdn.com image');
assert.equal(providerOf({ uri: 'opensubsonic--qKQLMeBC://track/_qphknagXqA', version: 'Official Music Video' }).id, 'youtube', 'OpenSubsonic YouTube bridge');
assert.equal(providerOf({ uri: 'library://playlist/4' }).id, 'library', 'Local library item');
assert.equal(providerOf({ uri: 'radiobrowser://station/123' }).id, 'radio', 'Radio item');

// 2. Test Card search rendering and error preservation
const cardMethods = source.slice(source.indexOf('    _updateSearchPills(){'), source.indexOf('    async _open(item){'));
const Card = vm.runInNewContext(`(class {
  constructor() {
    this._searchCategory = 'all';
    this._searchSource = 'all';
    this._searchResults = null;
    this._searchLoadingOnline = false;
    this._activeSearchQuery = '';
    this._searchError = null;
    this._items = [];
    this._seq = 1;
    this._request = 1;
    this.isConnected = true;
  }
  _hasAnyResults() {
    if (!this._searchResults) return false;
    return Object.values(this._searchResults).some(list => Array.isArray(list) && list.length > 0);
  }
  _updateSearchPills() {}
  _mergeSearchResults(incoming) {
    if (!this._searchResults) this._searchResults = { playlists: [], tracks: [], albums: [], artists: [], radio: [], podcasts: [], audiobooks: [] };
    for (const key of ['playlists', 'tracks', 'albums', 'artists', 'radio', 'podcasts', 'audiobooks']) {
      const existing = this._searchResults[key] ?? [];
      const newItems = incoming[key] ?? [];
      const seen = new Set(existing.map(x => x.uri));
      for (const item of newItems) {
        if (item?.uri && !seen.has(item.uri)) {
          seen.add(item.uri);
          existing.push(item);
        }
      }
      this._searchResults[key] = existing;
    }
  }
  _row(x) { return '<div class="row">' + x.name + '</div>'; }
  _tile(x) { return '<div class="tile">' + x.name + '</div>'; }
  ${cardMethods}
})`, { esc, icon, SEARCH_LABELS, LABELS, providerOf, itemOf, sortByProvider });

(async () => {
  const card = new Card();
  const dest = { innerHTML: '' };
  card.shadowRoot = {
    querySelector: sel => sel === '.search-results' ? dest : { hidden: false },
    querySelectorAll: () => []
  };

  // Test: in-flight search while results are empty shows loading status, NOT empty state
  card._activeSearchQuery = 'Melodi gardot';
  card._searchSource = 'spotify';
  card._searchResults = { playlists: [], tracks: [], albums: [], artists: [], radio: [], podcasts: [], audiobooks: [] };
  card._searchLoadingOnline = true;
  card._renderSearchResults();
  assert(dest.innerHTML.includes('Søger efter &ldquo;Melodi gardot&rdquo; i spotify…'), 'Must show loading indicator while searching');
  assert(!dest.innerHTML.includes('Ingen resultater for spotify'), 'Must NOT say no results while still loading');

  // Test: completed search with 0 results shows clean empty state
  card._searchLoadingOnline = false;
  card._renderSearchResults();
  assert(dest.innerHTML.includes('Ingen resultater for spotify'), 'Shows empty message when loading is complete and 0 results');

  // Test: search error with 0 results displays error message and retry button, NOT empty message
  card._searchError = 'Music Assistant søgning timed out';
  card._renderSearchResults();
  assert(dest.innerHTML.includes('Søgningen fejlede:'), 'Must show error message when search fails');
  assert(dest.innerHTML.includes('Music Assistant søgning timed out'), 'Must include specific error message');
  assert(dest.innerHTML.includes('data-action="search-retry"'), 'Must have retry button');
  assert(!dest.innerHTML.includes('Ingen resultater for spotify'), 'Error must NOT be overwritten with empty message');

  // Test: search error with partial results shows both library results AND warning banner with retry button
  card._searchResults.tracks = [{ name: 'Baby I Am A Fool', uri: 'library://track/1', media_type: 'track' }];
  card._searchSource = 'all';
  card._renderSearchResults();
  assert(dest.innerHTML.includes('Online kilder svarede ikke'), 'Must show warning banner for failed online search');
  assert(dest.innerHTML.includes('Baby I Am A Fool'), 'Must render existing library results');
  assert(dest.innerHTML.includes('data-action="search-retry"'), 'Must have retry button');

  // Test: in-flight deduplication in _search()
  let searchServiceCalls = 0;
  card._configEntry = async () => 'test-entry';
  card._service = async (service, data) => {
    if (service === 'search') {
      searchServiceCalls++;
      await new Promise(r => setTimeout(r, 50));
      return { response: { tracks: [{ name: 'Baby', uri: 'spotify--123://track/1', media_type: 'track' }] } };
    }
    return { response: { items: [] } };
  };

  card._searchLoadingOnline = false;
  card._activeSearchQuery = '';
  card._searchError = null;

  // First search starts
  const p1 = card._search('Melodi gardot');
  assert.equal(card._searchLoadingOnline, true);
  // Duplicate call while still searching must be ignored and not increment requests
  const p2 = card._search('Melodi gardot');
  await Promise.all([p1, p2]);
  assert.equal(card._searchLoadingOnline, false);
  assert.equal(searchServiceCalls, 1, 'Duplicate query while in-flight must result in exactly 1 service call');
  assert(card._hasAnyResults(), 'Results must be merged');

  console.log('Search deduplication, error preservation, provider detection, and loading tests passed.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
