const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('music-home-card.js','utf8');
const methods=source.slice(source.indexOf('    _screenState(id,domain){'),source.indexOf('    _scriptState(id){'));
const Card=vm.runInNewContext(`(class {${methods}})`,{esc:String});
(async()=>{
 const card=new Card(),calls=[],messages=[];
 const panel={hidden:true,innerHTML:'',setAttribute(){},querySelector(){return{focus(){}};}};
 card.shadowRoot={querySelector(){return panel;}};
 card._config={screensaver_entity:'switch.active',screensaver_effect_entity:'select.effect'};
 card._hass={states:{'switch.active':{state:'off'},'select.effect':{state:'vinyl',attributes:{options:['vinyl','ferrofluid']}}},async callService(domain,service,data){calls.push({domain,service,data});}};
 card._message=m=>messages.push(m);card._closeScreenMenu=()=>{panel.hidden=true;};
 card._openScreenMenu();assert(panel.innerHTML.includes('data-effect="vinyl"'));assert(!panel.innerHTML.includes('data-effect="aurora"'),'Do not invent options from known labels');
 await card._startScreen('aurora');assert.equal(calls.length,0);assert.equal(card._screenPending,false);
 // Even with a display script, rejection must not activate the overlay.
 card._config.display_script='script.display';card._scriptState=()=>{};card._callDisplay=async()=>calls.push('display');
 await card._startScreen('aurora');assert.equal(calls.length,0);delete card._config.display_script;
 const state=card._hass.states['select.effect'];state.attributes.options.push('aurora');card._openScreenMenu();assert(panel.innerHTML.includes('data-effect="aurora"'));
 // Options may disappear after opening the menu.
 state.attributes.options=['vinyl'];await card._startScreen('aurora');assert.equal(calls.length,0);
 // A backend rejection cannot leave the busy flag set or activate anything afterwards.
 card._hass.callService=async()=>{throw Error('backend rejected');};await card._startScreen('vinyl');assert.equal(card._screenPending,false);assert.equal(calls.length,0);
 card._hass.callService=async(domain,service,data)=>calls.push({domain,service,data});await card._startScreen('vinyl');
 assert.equal(calls.length,2);assert.equal(calls[0].service,'select_option');assert.equal(calls[1].service,'turn_on');assert.equal(card._screenPending,false);
 calls.length=0;state.attributes.options=[];await card._startScreen('vinyl');assert.equal(calls.length,0);
 console.log('Screensaver live options, stale menu, rejection, routing and recovery tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
