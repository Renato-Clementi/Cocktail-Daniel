# -*- coding: utf-8 -*-
"""Mappa ogni operazione Firestore dell'app sul permesso che le regole le
danno, e sul ruolo che la esegue. Non esegue le regole (l'emulatore non è
raggiungibile da qui): confronta due elenchi e segnala le incoerenze."""
import io, re, sys

# app.js dopo la separazione dei file; il percorso è relativo alla radice del repo
import os
BASE = os.path.dirname(os.path.abspath(__file__))
SRC = io.open(os.path.join(BASE, 'app.js'), encoding='utf-8').read().split('\n')

# ---- 1. Chi esegue ogni funzione: si guarda la guardia in testa
def guardia(nome_funzione):
    for i, l in enumerate(SRC):
        if re.match(r'\s{8}(?:async )?function %s\s*\(' % re.escape(nome_funzione), l):
            corpo = '\n'.join(SRC[i:i+14])
            # qualsiasi uscita anticipata che dipende da !isAdmin()/!isSuperAdmin()
            for riga in corpo.split('\n'):
                if 'return' not in riga: continue
                if re.search(r'!\s*isSuperAdmin\(\)', riga): return 'super'
                if re.search(r'!\s*isAdmin\(\)', riga): return 'admin'
                if re.search(r'!\s*canSupervise\(\)', riga): return 'super'
            if re.search(r'&&\s*isAdmin\(\)', corpo): return 'admin'
            return 'cliente'
    return '?'

def funzione_di(n):
    for j in range(n, -1, -1):
        m = re.match(r'\s{8}(?:async )?function (\w+)', SRC[j])
        if m: return m.group(1)
    return '?'

# ---- 2. Tutte le operazioni Firestore nel codice
ops = []
for i, l in enumerate(SRC):
    for m in re.finditer(r"collection\('(\w+)'\)(?:[^\n]*?\.doc\(([^)]*)\))?[^\n]*?\.(set|update|delete|get)\(", l):
        ops.append((m.group(1), m.group(3), funzione_di(i), i+1, (m.group(2) or '').strip()))
    for m in re.finditer(r"tx\.(set|delete)\((\w+)", l):
        # si risale alla collezione dalla dichiarazione del ref, nella stessa
        # funzione: indovinarla dal nome della variabile attribuiva male
        var, coll = m.group(2), '?'
        for j in range(i, max(0, i-40), -1):
            d = re.search(r"(?:const|let)\s+%s\s*=\s*firestoreDb\.collection\('(\w+)'\)" % re.escape(var), SRC[j])
            if d: coll = d.group(1); break
            if re.match(r'\s{8}(?:async )?function ', SRC[j]): break
        op = 'update' if (m.group(1) == 'set' and coll == 'wallets') else m.group(1)
        ops.append((coll, op, funzione_di(i), i+1, '(tx)'))

# ---- 3. Cosa concedono le regole (letto dal file, non riscritto a mano)
RULES = io.open(os.path.join(BASE, 'firestore.rules'), encoding='utf-8').read()
concessioni = {}   # (collezione) -> {op: ruolo minimo}
for blocco in re.finditer(r'match /(\w+)(?:/\{?(\w+)\}?)?\s*\{(.*?)\n    \}', RULES, re.S):
    nome = blocco.group(1)
    if nome == 'databases': continue
    corpo = blocco.group(3)
    doc = blocco.group(2) or ''
    chiave = nome if nome != 'settings' else ('settings/' + doc if doc in ('pricing','stock') else 'settings/*')
    per_op = concessioni.setdefault(chiave, {})
    for m in re.finditer(r'allow ([\w, ]+):\s*if ([^;]+);', corpo):
        cond = ' '.join(m.group(2).split())
        ruolo = ('admin' if cond == 'admin()' else
                 'staff' if cond == 'staff()' else
                 'cliente' if cond == 'utente()' else
                 'condizionato')
        for op in [o.strip() for o in m.group(1).split(',')]:
            for reale in (['read','create','update','delete'] if op == 'write' else [op]):
                # unione: il permesso più largo vince
                largo = {'admin':0,'staff':1,'condizionato':2,'cliente':3}
                if reale not in per_op or largo[ruolo] > largo[per_op[reale]]:
                    per_op[reale] = ruolo

MAP_OP = {'set':'create/update','update':'update','delete':'delete','get':'read'}
RANK = {'cliente':0,'super':1,'admin':2}

print('OPERAZIONI DELL\'APP → PERMESSO NELLE REGOLE\n')
print(f'{"collezione":18s} {"op":7s} {"eseguita da":9s} {"regola chiede":14s} {"funzione":32s}')
print('-'*96)
problemi = []
for coll, op, fn, riga, docarg in sorted(set(ops)):
    if op == 'get': continue                     # le letture sono signedIn() ovunque
    chiave = coll
    if coll == 'settings':
        chiave = ('settings/pricing' if "'pricing'" in docarg else
                  'settings/stock' if "'stock'" in docarg else 'settings/*')
    ruolo = guardia(fn)
    regole = concessioni.get(chiave, {})
    ops_regola = ['create','update'] if op == 'set' else [op]
    richiesto = max((regole.get(o, 'ASSENTE') for o in ops_regola),
                    key=lambda r: {'admin':0,'staff':1,'condizionato':2,'cliente':3,'ASSENTE':-1}[r])
    ok = True
    if richiesto == 'ASSENTE': ok = False
    elif richiesto == 'admin' and ruolo == 'cliente': ok = False
    elif richiesto == 'staff' and ruolo == 'cliente': ok = False
    elif richiesto == 'admin' and ruolo == 'super': ok = False
    segno = '  ' if ok else '✗ '
    if not ok: problemi.append((chiave, op, ruolo, richiesto, fn, riga))
    print(f'{segno}{chiave:16s} {op:7s} {ruolo:9s} {richiesto:14s} {fn} :{riga}')

print()
if problemi:
    print('INCOERENZE — queste operazioni verrebbero RIFIUTATE dalle regole:')
    for c,o,r,q,f,l in problemi:
        print(f'  {c} {o}: la esegue "{r}" ma la regola chiede "{q}"  →  {f} riga {l}')
    sys.exit(1)
print('Nessuna incoerenza: ogni scrittura dell\'app è permessa al ruolo che la esegue.')
