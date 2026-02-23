import os
import json

h = r'C:\Users\ASUS\AppData\Roaming\Code\User\History'
max_len = 0
best_file = None

for d in os.listdir(h):
    ep = os.path.join(h, d, 'entries.json')
    if os.path.isfile(ep):
        with open(ep, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except:
                continue
            if 'Tubes-Sistem-Basis-Data' in data.get('resource', '') and 'server.js' in data.get('resource', ''):
                for e in data.get('entries', []):
                    fp = os.path.join(h, d, e['id'])
                    if os.path.isfile(fp):
                        with open(fp, 'r', encoding='utf-8') as cf:
                            c = cf.read()
                            if len(c) > max_len:
                                max_len = len(c)
                                best_file = c

if best_file:
    print(f"Found server.js with length {max_len}")
    with open('logic/server_original.js', 'w', encoding='utf-8') as f:
        f.write(best_file)
else:
    print("Not found")
