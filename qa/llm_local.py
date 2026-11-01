#!/usr/bin/env python3
"""
Envía una tarea al modelo LOCAL (Ollama, sin créditos ni salida a internet).

    python3 qa/llm_local.py <salida.md> <instrucciones> <archivo> [archivo...]

Solo para código y textos del sitio: nunca pasarle data/ ni datos de miembros.
"""
import json
import sys
import urllib.request

MODELO = "gemma3:12b"
salida, instr, archivos = sys.argv[1], sys.argv[2], sys.argv[3:]
partes = [instr, ""]
for f in archivos:
    if "/data/" in f or f.endswith("members.json"):
        sys.exit(f"Rechazado: {f} puede contener datos personales.")
    partes.append(f"===== {f} =====\n" + open(f, encoding="utf8", errors="replace").read())
cuerpo = json.dumps({"model": MODELO, "prompt": "\n".join(partes), "stream": False,
                     "options": {"num_ctx": 32768, "temperature": 0.2}}).encode()
req = urllib.request.Request("http://127.0.0.1:11434/api/generate", data=cuerpo,
                             headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=1800) as r:
    d = json.load(r)
open(salida, "w", encoding="utf8").write(f"<!-- modelo local {MODELO} -->\n" + d["response"])
print(f"{salida}: {d.get('eval_count')} tokens en {d.get('total_duration', 0) / 1e9:.0f}s")
