"""Validate the delivered HA YAML and Jinja payloads with representative input."""
import json
from pathlib import Path
from urllib.parse import quote
import yaml
from jinja2 import Environment
class Loader(yaml.SafeLoader): pass
Loader.add_constructor('!secret', lambda loader,node:'SECRET:'+loader.construct_scalar(node))
commands=yaml.load(Path('music_home_bridge.yaml').read_text(),Loader=Loader)['rest_command']
env=Environment();env.filters['to_json']=json.dumps
env.filters['urlencode']=lambda x:quote(str(x),safe='')
prompt='Rolig "jazz"\nmed ældre stemmer'
payload=json.loads(env.from_string(commands['music_home_ai_suggest']['payload']).render(prompt=prompt,count=12))
assert payload=={'prompt':prompt,'count':12}
payload=json.loads(env.from_string(commands['music_home_recommendation_items']['payload']).render(provider='spotify',item_id='more/for-you'))
assert payload=={'command':'music/recommendations/items','args':{'provider':'spotify','item_id':'more/for-you'}}
assert env.from_string(commands['music_home_ai_job']['url']).render(job_id='safe_job-1').endswith('/safe_job-1')
assert json.loads(commands['music_home_recent']['payload'])=={'command':'music/recently_played_items','args':{'limit':30}}
for name,command in commands.items():
 assert command['headers']['Authorization'].startswith('SECRET:')
 assert command['timeout']<=30
assert 'api_token' not in Path('music-home-card.js').read_text()
print('HA package YAML, secret references and JSON payload templates passed.')

env.filters['bool']=bool
for suffix,command,data,args in [
 ('items','player_queues/items',{'queue_id':'group-1','offset':50,'limit':50},{'queue_id':'group-1','offset':50,'limit':50}),
 ('state','player_queues/get',{'queue_id':'group-1'},{'queue_id':'group-1'}),
 ('config','config/player_queues/get',{'queue_id':'group-1'},{'queue_id':'group-1'}),
 ('save','config/player_queues/save',{'queue_id':'group-1','values':{'autoplay_mode':'playlist','autoplay_playlist':'library://playlist/4'}},{'queue_id':'group-1','values':{'autoplay_mode':'playlist','autoplay_playlist':'library://playlist/4'}}),
 ('autoplay','player_queues/autoplay',{'queue_id':'group-1','enabled':False},{'queue_id':'group-1','autoplay_enabled':False}),
]:
 payload=json.loads(env.from_string(commands['music_home_queue_'+suffix]['payload']).render(**data))
 assert payload=={'command':command,'args':args}
print('Autoplay queue-scoped payloads and false boolean passed.')
