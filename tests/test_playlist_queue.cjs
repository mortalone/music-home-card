const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('music-home-card.js', 'utf8');

// We simulate a mock environment to test _playTrack logic
const esc = s => String(s ?? '');
const icon = () => '<svg></svg>';
const LABELS = { playlist: 'Playlister', track: 'Sange', album: 'Album' };

// Create class with mock methods
class MockCard {
  constructor() {
    this._config = { entity: 'media_player.stueetagen_ma' };
    this._hass = {
      states: {
        'media_player.stueetagen_ma': {
          attributes: { shuffle: false, friendly_name: 'Stueetagen' }
        }
      }
    };
    this._detail = null;
    this._detailChildren = null;
    this._pending = false;
    this.playedCalls = [];
  }

  async _service(service, data) {
    this.playedCalls.push({ service, data });
  }

  _message(msg) {
    this.lastMessage = msg;
  }
}

// Extract _playTrack and _play implementation from source or evaluate
const playTrackMatch = source.match(/async _playTrack\([^)]*\)\{[\s\S]*?\n    \}/);
const playMatch = source.match(/async _play\(item,enqueue[^\n]+/);

assert(playTrackMatch, '_playTrack must be found in music-home-card.js');
assert(playMatch, '_play must be found in music-home-card.js');

const extracted = vm.runInNewContext(`({
  ${playTrackMatch[0]},
  ${playMatch[0]}
})`);

MockCard.prototype._playTrack = extracted._playTrack;
MockCard.prototype._play = extracted._play;

(async () => {
  const card = new MockCard();

  const tracks = [
    { name: 'Track 0', uri: 'spotify://track/0', type: 'track' },
    { name: 'Track 1', uri: 'spotify://track/1', type: 'track' },
    { name: 'Track 2', uri: 'spotify://track/2', type: 'track' },
    { name: 'Track 3', uri: 'spotify://track/3', type: 'track' },
    { name: 'Track 4', uri: 'spotify://track/4', type: 'track' },
  ];

  card._detail = { name: 'My Playlist', uri: 'library://playlist/1', type: 'playlist' };
  card._detailChildren = tracks;

  // Test 1: Shuffle is OFF, click Track 0 (top of list)
  card._hass.states['media_player.stueetagen_ma'].attributes.shuffle = false;
  card.playedCalls = [];
  await card._playTrack(tracks[0]);

  assert.equal(card.playedCalls.length, 1);
  assert.equal(card.playedCalls[0].service, 'play_media');
  assert.deepEqual(card.playedCalls[0].data.media_id, [
    'spotify://track/0',
    'spotify://track/1',
    'spotify://track/2',
    'spotify://track/3',
    'spotify://track/4'
  ]);
  assert.equal(card.playedCalls[0].data.enqueue, 'replace');

  // Test 2: Shuffle is OFF, click Track 3 (2 from bottom)
  card.playedCalls = [];
  await card._playTrack(tracks[3]);

  assert.equal(card.playedCalls.length, 1);
  assert.deepEqual(card.playedCalls[0].data.media_id, [
    'spotify://track/3',
    'spotify://track/4'
  ]);
  assert.equal(card.playedCalls[0].data.enqueue, 'replace');

  // Test 3: Shuffle is OFF, click Track 4 (bottom)
  card.playedCalls = [];
  await card._playTrack(tracks[4]);

  assert.equal(card.playedCalls.length, 1);
  assert.deepEqual(card.playedCalls[0].data.media_id, [
    'spotify://track/4'
  ]);

  // Test 4: Shuffle is ON, click Track 2
  card._hass.states['media_player.stueetagen_ma'].attributes.shuffle = true;
  card.playedCalls = [];
  await card._playTrack(tracks[2]);

  assert.equal(card.playedCalls.length, 1);
  const queuedUris = card.playedCalls[0].data.media_id;
  assert.equal(queuedUris.length, 5, 'All 5 tracks must be queued when shuffle is ON');
  assert.equal(queuedUris[0], 'spotify://track/2', 'First queued track must be the clicked track');
  assert.deepEqual(new Set(queuedUris), new Set(tracks.map(t => t.uri)), 'All tracks must be included');

  // Test 5: Clicked track outside of detail view (e.g. search result)
  card._detail = null;
  card._detailChildren = null;
  card.playedCalls = [];
  const searchTrack = { name: 'Search Song', uri: 'spotify://track/99', type: 'track' };
  await card._playTrack(searchTrack);

  assert.equal(card.playedCalls.length, 1);
  assert.equal(card.playedCalls[0].data.media_id, 'spotify://track/99', 'Single track URI when no detail active');

  console.log('All playlist queue tests passed successfully!');
})();
