const {chromium}=require('playwright');
const {spawn}=require('child_process');
const assert=require('assert');const fs=require('fs');
(async()=>{const server=spawn('python3',['tests/fixture.py'],{stdio:'inherit'});let browser,page;try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:18104/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});page=await browser.newPage({viewport:{width:720,height:1280}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:18104/');await page.getByText('Dine playlister',{exact:true}).waitFor();
 assert.equal(await page.locator('.shortcut').count(),8);assert.equal(await page.evaluate(()=>calls.filter(x=>x.service==='play_media').length),0,'Never auto-play');
 assert.equal(await page.locator('.volume').isVisible(),false);assert.equal(await page.locator('.app-link').getAttribute('href'),'app://com.spotify.music');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No page horizontal overflow');
 fs.mkdirSync('dist/qa',{recursive:true});await page.screenshot({path:'dist/qa/music-home-portrait.png'});console.log('MUSIC_QA_PREVIEW portrait '+(await page.screenshot({type:'jpeg',quality:80})).toString('base64'));
 await page.locator('.shortcut').first().click();await page.locator('.detail-items .row').first().waitFor();assert.equal(await page.evaluate(()=>calls.filter(x=>x.service==='play_media').length),0,'Browse must not start playback');
 await page.getByRole('button',{name:'Som næste',exact:true}).click();assert.deepEqual(await page.evaluate(()=>calls.find(x=>x.service==='play_media').service_data),{entity_id:'media_player.stueetagen_ma',media_id:'library://playlist/0',media_type:'playlist',enqueue:'next'});
 await page.getByRole('button',{name:'Tilføj til kø',exact:true}).click();assert.equal(await page.evaluate(()=>calls.filter(x=>x.service==='play_media').at(-1).service_data.enqueue),'add');
 await page.getByRole('button',{name:'Spil',exact:true}).click();assert.equal(await page.evaluate(()=>calls.filter(x=>x.service==='play_media').at(-1).service_data.enqueue),'replace');
 await page.screenshot({path:'dist/qa/music-home-playlist.png'});
 await page.getByRole('button',{name:'Bibliotek',exact:true}).click();await page.locator('.library-tools').waitFor();await page.getByRole('button',{name:'Album',exact:true}).click();await page.locator('.row').first().waitFor();
 await page.getByRole('button',{name:'Vis covers'}).click();assert.equal(await page.locator('.grid .tile').count(),6);await page.getByRole('button',{name:'Vis liste'}).click();await page.screenshot({path:'dist/qa/music-home-library.png'});
 await page.getByRole('button',{name:'Søg',exact:true}).click();await page.getByRole('searchbox').fill('Lucie');await page.locator('.search-results .row').first().waitFor();assert.equal(await page.evaluate(()=>calls.filter(x=>x.service==='search').length),1,'Search debounce');
 // HA pushes must preserve the focused search and current library rendering.
 await page.getByRole('searchbox').focus();await page.evaluate(()=>{for(let i=0;i<50;i++)card.hass={...testHass};});assert.equal(await page.getByRole('searchbox').inputValue(),'Lucie');assert(await page.getByRole('searchbox').evaluate(e=>e===e.getRootNode().activeElement));
 // Old responses must not overwrite a newer query.
 await page.evaluate(()=>{delays['slow']=900;card._search('slow');card._search('fast');});await page.getByText('fast',{exact:true}).waitFor();await page.waitForTimeout(1050);assert.equal(await page.getByText('slow',{exact:true}).count(),0);
 await page.evaluate(()=>card._search('<img src=x onerror=alert(1)>'));await page.getByText('<img src=x onerror=alert(1)>',{exact:true}).waitFor();assert.equal(await page.locator('.search-results img[src="x"]').count(),0,'Escape backend music names');
 await page.getByRole('searchbox').fill('Lucie');await page.getByRole('searchbox').press('Enter');await page.locator('.search-results .row strong').filter({hasText:'Lucie'}).first().waitFor();await page.screenshot({path:'dist/qa/music-home-search.png'});
 await page.getByRole('button',{name:'Pause',exact:true}).click();assert.equal(await page.evaluate(()=>calls.find(x=>x.service==='media_play_pause').data.entity_id),'media_player.stueetagen_ma');
 await page.getByRole('button',{name:'Vis volumen',exact:true}).click();assert(await page.locator('.volume').isVisible());await page.locator('.volume input').evaluate(e=>{e.value='35';});await page.locator('.volume input').dispatchEvent('change');assert.equal(await page.evaluate(()=>calls.find(x=>x.service==='volume_set').data.volume_level),.35);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Hjem',exact:true}).click();await page.getByText('Dine playlister',{exact:true}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'dist/qa/music-home-phone.png'});console.log('MUSIC_QA_PREVIEW phone '+(await page.screenshot({type:'jpeg',quality:80})).toString('base64'));
 await page.setViewportSize({width:1280,height:720});await page.screenshot({path:'dist/qa/music-home-landscape.png'});
 await page.evaluate(()=>{failLibrary=true;card._cache.clear();});await page.getByRole('button',{name:'Opdater bibliotek'}).click();await page.getByText('MA er offline',{exact:true}).waitFor();await page.evaluate(()=>failLibrary=false);await page.getByRole('button',{name:'Prøv igen',exact:true}).click();await page.getByText('Dine playlister',{exact:true}).waitFor();
 await page.evaluate(()=>{lists.playlist=Array.from({length:45},(_,i)=>'Playlist '+i);card._cache.clear();});await page.getByRole('button',{name:'Bibliotek',exact:true}).click();await page.getByRole('button',{name:'Playlister',exact:true}).click();await page.waitForFunction(()=>card.shadowRoot.querySelectorAll('.rows .row').length===40);await page.getByRole('button',{name:'Vis flere',exact:true}).click();await page.waitForFunction(()=>card.shadowRoot.querySelectorAll('.rows .row').length===45);
 // Reconfiguration must not register another click handler or leave the player blank.
 await page.evaluate(()=>card.setConfig({entity:'media_player.stueetagen_ma',name:'Musik igen'}));await page.getByText('Dine playlister',{exact:true}).waitFor();assert.equal(await page.locator('.player strong').textContent(),'Maison');
 const before=await page.evaluate(()=>calls.filter(x=>x.service==='media_next_track').length);await page.getByRole('button',{name:'Næste nummer'}).click();assert.equal(await page.evaluate(()=>calls.filter(x=>x.service==='media_next_track').length),before+1);

 // New home sections use MA library sort/favorite filters and genuine provider rows.
 await page.getByText('Mere af det, du synes godt om',{exact:true}).waitFor();
 assert((await page.locator('.header-volume-value').textContent()).includes('%'));
 assert(await page.evaluate(()=>calls.some(x=>x.service==='get_library'&&x.service_data.order_by==='timestamp_added_desc')));
 await page.getByRole('button',{name:'Favoritter',exact:true}).click();await page.getByRole('button',{name:'Alle favoritter',exact:true}).waitFor();
 assert(await page.evaluate(()=>calls.filter(x=>x.service==='get_library'&&x.service_data.limit===40).some(x=>x.service_data.favorite===true&&x.service_data.media_type==='album')));
 await page.getByRole('button',{name:'Album',exact:true}).click();await page.locator('.library-tools').waitFor();
 assert(await page.evaluate(()=>calls.filter(x=>x.service==='get_library'&&x.service_data.media_type==='album').at(-1).service_data.favorite===true));
 await page.getByRole('button',{name:'Hjem',exact:true}).click();await page.getByText('Mere af det, du synes godt om',{exact:true}).waitFor();
 await page.locator('[data-rec="rec-0"]').click();assert.equal(await page.locator('main .tile').count(),25,'See all real row items');
 // AI is opt-in and never invoked while typing, never auto-queues.
 await page.evaluate(()=>card.setConfig({entity:'media_player.stueetagen_ma',ai_dj:true}));
 await page.getByRole('button',{name:'Søg',exact:true}).click();await page.getByRole('button',{name:'AI DJ',exact:true}).click();
 const aiBefore=await page.evaluate(()=>aiJobs),playBefore=await page.evaluate(()=>calls.filter(x=>x.service==='play_media').length);
 await page.getByRole('searchbox').fill('rolig jazz');await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>aiJobs),aiBefore);
 await page.getByRole('button',{name:'Find med AI DJ',exact:true}).click();await page.getByText('Rolig jazz med AI',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>aiJobs),aiBefore+1);assert.equal(await page.evaluate(()=>calls.filter(x=>x.service==='play_media').length),playBefore);
 assert.equal(await page.locator('.search-results img').getAttribute('src'),'https://example.com/cover.jpg');
 await page.locator('.search-results [data-add]').click();assert.equal(await page.evaluate(()=>calls.filter(x=>x.service==='play_media').at(-1).service_data.enqueue),'add');
 await page.screenshot({path:'dist/qa/music-home-ai.png'});
 await page.evaluate(()=>bridgeError=true);await page.getByRole('searchbox').fill('fejl');await page.getByRole('searchbox').press('Enter');await page.getByText('Adgang afvist. Kontrollér tokenet i HA secrets.',{exact:true}).waitFor();
 await page.evaluate(()=>{bridgeError=false;delete testHass.services.rest_command.music_home_ai_job;});await page.getByRole('searchbox').press('Enter');await page.getByText('AI DJ-forbindelsen mangler.',{exact:false}).waitFor();
 await page.evaluate(()=>card.setConfig({entity:'media_player.stueetagen_ma',ai_dj:false}));await page.getByRole('button',{name:'Søg',exact:true}).click();assert.equal(await page.getByRole('button',{name:'AI DJ',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('Music Home browser checks passed: read-only startup, MA schemas, navigation, playback placement, responsive views, escaping, stale search and HA push handling. Mock HA/MA, not live speakers.');
}catch(e){if(page)console.log('MUSIC_QA_DEBUG '+JSON.stringify(await page.evaluate(()=>({calls:calls.slice(-15),content:card.shadowRoot.querySelector('main').textContent,view:card._view,request:card._request}))));throw e;}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exit(1);});
