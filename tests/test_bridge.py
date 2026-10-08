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
