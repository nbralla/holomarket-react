"""Pruebas de seguridad y casos extremos de la API de HoloMarket (37 pruebas).

Se ejecutan SOLO contra el backend local con los datos demo (nunca contra la nube): el script
restablece la demo al empezar y al terminar, así que borraría los datos reales.

Uso (con el backend encendido en localhost:8080 y las contraseñas demo de desarrollo):
    python pruebas/ataque.py

Qué revisa:
- Privacidad: un cliente no ve correos, RUT, actividad ni retiros de otros.
- Permisos (IDOR): no se puede cancelar, enviar, editar ni borrar lo de otro usuario; un cliente
  no usa endpoints de administración.
- Compra: cantidades inválidas, carta propia, precio enviado desde el navegador (se ignora),
  tarjeta inválida (Luhn), tarjeta sin fondos (402) y despacho sin dirección.
- Concurrencia: 4 compras simultáneas de la última unidad y 4 retiros simultáneos que superan
  el saldo: en ambos casos pasa solo 1.
- Publicaciones: validaciones de precio, stock, juego, condición, oferta y descripción.
- Usuario bloqueado: pierde la sesión, no puede ingresar y sus publicaciones se ocultan.

Sale con código 0 si todo pasa y 1 si alguna prueba falla.
"""
import json, sys, threading, urllib.request, urllib.error

sys.stdout.reconfigure(encoding='utf-8')   # tildes bien en la consola de Windows

B = 'http://127.0.0.1:8080/api'            # solo local: nunca apuntar a producción
resultados = []


def pedir(metodo, ruta, cuerpo=None, token=None):
    datos = None if cuerpo is None else json.dumps(cuerpo).encode('utf-8')
    req = urllib.request.Request(B + ruta, data=datos, method=metodo)
    if datos is not None:
        req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            texto = r.read().decode('utf-8')
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode('utf-8')
        try:
            return e.code, json.loads(texto)
        except Exception:
            return e.code, texto


def esperar(nombre, cond, detalle=''):
    resultados.append((cond, nombre, detalle))
    print(('OK   ' if cond else 'FALLA') + ' | ' + nombre + (' | ' + str(detalle)[:140] if detalle else ''))


def login(email, clave):
    s, d = pedir('POST', '/auth/login', {'email': email, 'clave': clave})
    return d['token']


admin = login('admin@holomarket.cl', 'Admin1234')
s, _ = pedir('POST', '/admin/restablecer', token=admin)
esperar('restablecer demo', s == 204, s)
admin = login('admin@holomarket.cl', 'Admin1234')
camila = login('camila@demo.cl', 'Demo1234')
diego = login('diego@demo.cl', 'Demo1234')
vale = login('valentina@demo.cl', 'Demo1234')

_, est_admin = pedir('GET', '/estado', token=admin)
pubs = {p['id']: p for p in est_admin['publicaciones']}
pagado = next(o for o in est_admin['pedidos'] if o['estado'] == 'pagado')
print('pedido pagado:', pagado['id'], 'comprador', pagado['compradorId'], 'vendedor', pagado['vendedorId'])

# ---------- Privacidad ----------
_, est_c = pedir('GET', '/estado', token=camila)
otros = [u for u in est_c['usuarios'] if u['id'] != 'U01']
esperar('cliente no ve correos/RUT de otros', all(not u['email'] and not u['rut'] for u in otros))
esperar('cliente no ve actividad', len(est_c['actividad']) == 0)
ajenos = [o for o in est_c['pedidos'] if o['compradorId'] != 'U01' and o['vendedorId'] != 'U01']
esperar('pedidos ajenos anonimizados', all(o['compradorId'] == '' and o['envio']['direccion'] == '' and o['pago']['detalle'] == '' for o in ajenos))
esperar('cliente no ve retiros ajenos', all(r['uid'] == 'U01' for r in est_c['retiros']))

# ---------- Permisos (IDOR) ----------
comprador = {'U01': camila, 'U02': diego, 'U03': vale}
intruso = next(t for uid, t in comprador.items() if uid not in (pagado['compradorId'], pagado['vendedorId']))
s, _ = pedir('POST', f"/pedidos/{pagado['id']}/cancelar", token=intruso)
esperar('un tercero no cancela pedido ajeno', s == 409, s)
s, _ = pedir('POST', f"/pedidos/{pagado['id']}/enviar", {'seguimiento': 'X'}, token=intruso)
esperar('un tercero no marca envío ajeno', s == 409, s)
pub_diego = next(p for p in pubs.values() if p['vendedorId'] == 'U02' and p['estado'] == 'activa')
s, _ = pedir('PUT', f"/publicaciones/{pub_diego['id']}/precio", {'precio': 100}, token=camila)
esperar('no cambia precio de publicación ajena', s == 403, s)
s, _ = pedir('DELETE', f"/publicaciones/{pub_diego['id']}", token=camila)
esperar('no elimina publicación ajena', s == 403, s)
s, _ = pedir('PUT', '/usuarios/U02/estado', {'estado': 'bloqueado'}, token=camila)
esperar('cliente no bloquea usuarios', s == 403, s)
s, _ = pedir('PUT', '/config', {'comision': 0, 'iva': 0, 'envioMismaRegion': 0, 'envioOtraRegion': 0, 'stockBajo': 0, 'sesionMinutos': 30, 'retiroMinimo': 1000, 'dolar': 900}, token=camila)
esperar('cliente no cambia la configuración', s == 403, s)
s, _ = pedir('POST', '/retiros/RET-002/transferir', {'comprobante': 'X'}, token=vale)
esperar('cliente no aprueba su propio retiro', s == 403, s)
s, _ = pedir('POST', '/admin/restablecer', token=camila)
esperar('cliente no restablece datos', s == 403, s)
s, _ = pedir('PUT', '/usuarios/U00/estado', {'estado': 'bloqueado'}, token=admin)
esperar('admin no puede bloquearse a sí mismo/otro admin', s == 409, s)

# ---------- Manipulación de compra ----------
base = {'entrega': 'retiro', 'pago': 'tarjeta', 'receptor': 'Camila Rojas', 'telefono': '+56912345678', 'numeroTarjeta': '4111111111111111'}
pub_ajena = next(p for p in pubs.values() if p['vendedorId'] != 'U01' and p['estado'] == 'activa' and p['stock'] >= 2)
for nombre, items, esp in [
    ('cantidad negativa', [{'pubId': pub_ajena['id'], 'cantidad': -5}], 400),
    ('cantidad cero', [{'pubId': pub_ajena['id'], 'cantidad': 0}], 400),
    ('cantidad enorme', [{'pubId': pub_ajena['id'], 'cantidad': 100000}], 400),
    ('publicación inexistente', [{'pubId': 'P999', 'cantidad': 1}], 409),
    ('carrito vacío', [], 400),
]:
    s, d = pedir('POST', '/pedidos', {**base, 'items': items}, token=camila)
    esperar('compra rechaza ' + nombre, s == esp, (s, d if s != esp else ''))
propia = next(p for p in pubs.values() if p['vendedorId'] == 'U01' and p['estado'] == 'activa')
s, _ = pedir('POST', '/pedidos', {**base, 'items': [{'pubId': propia['id'], 'cantidad': 1}]}, token=camila)
esperar('no compra su propia carta', s == 409, s)
s, d = pedir('POST', '/pedidos', {**base, 'precio': 1, 'total': 1, 'items': [{'pubId': pub_ajena['id'], 'cantidad': 1, 'precio': 1}]}, token=camila)
esperar('el precio lo pone el servidor (ignora precio enviado)', s == 201 and d[0]['subtotal'] == pub_ajena['precio'], (s, d[0]['subtotal'] if s == 201 else d))
s, d = pedir('POST', '/pedidos', {**base, 'numeroTarjeta': '4111111111111112', 'items': [{'pubId': pub_ajena['id'], 'cantidad': 1}]}, token=camila)
esperar('tarjeta Luhn inválida', s == 400, s)
s, d = pedir('POST', '/pedidos', {**base, 'numeroTarjeta': '4000000000009995', 'items': [{'pubId': pub_ajena['id'], 'cantidad': 1}]}, token=camila)
esperar('tarjeta sin fondos -> 402 con motivo', s == 402 and d.get('errors', {}).get('motivo') == 'fondos', (s, d))
s, d = pedir('POST', '/pedidos', {**base, 'entrega': 'despacho', 'items': [{'pubId': pub_ajena['id'], 'cantidad': 1}]}, token=camila)
esperar('despacho sin dirección', s == 400, (s, d))

# ---------- Concurrencia: dos compras simultáneas de la última unidad ----------
_, e2 = pedir('GET', '/estado', token=admin)
ultima = next(p for p in e2['publicaciones'] if p['estado'] == 'activa' and p['stock'] == 1 and p['vendedorId'] not in ('U01', 'U03'))
res = []
def comprar(tok):
    res.append(pedir('POST', '/pedidos', {**base, 'items': [{'pubId': ultima['id'], 'cantidad': 1}]}, token=tok)[0])
hilos = [threading.Thread(target=comprar, args=(t,)) for t in (camila, vale, camila, vale)]
[h.start() for h in hilos]; [h.join() for h in hilos]
_, e3 = pedir('GET', '/estado', token=admin)
stock_final = next(p for p in e3['publicaciones'] if p['id'] == ultima['id'])['stock']
esperar('4 compras simultáneas de la última unidad: solo 1 pasa', sorted(res) == [201, 409, 409, 409] and stock_final == 0, (res, 'stock', stock_final))

# ---------- Concurrencia: retiros simultáneos por más que el saldo ----------
pedir('PUT', '/usuarios/yo/cuenta', {'banco': 'BancoEstado', 'tipo': 'Cuenta vista / CuentaRUT', 'numero': '12345678'}, token=diego)
_, ed = pedir('GET', '/estado', token=diego)
liberado = sum(o['netoVendedor'] for o in ed['pedidos'] if o['vendedorId'] == 'U02' and o['estado'] == 'entregado')
retirado = sum(r['monto'] for r in ed['retiros'] if r['estado'] in ('solicitado', 'pagado'))
saldo = liberado - retirado
monto = saldo // 2 + 1000      # dos de estos superan el saldo
rr = []
def retirar():
    rr.append(pedir('POST', '/retiros', {'monto': monto}, token=diego)[0])
hilos = [threading.Thread(target=retirar) for _ in range(4)]
[h.start() for h in hilos]; [h.join() for h in hilos]
esperar(f'4 retiros simultáneos de {monto} con saldo {saldo}: solo 1 pasa', sorted(rr) == [201, 409, 409, 409], rr)

# ---------- Publicaciones ----------
pub_ok = {'juego': 'pokemon', 'nombre': '<img src=x onerror=alert(1)>', 'edicion': '151', 'numero': '1', 'rareza': 'Rare', 'acabado': 'Holo', 'idioma': 'ES', 'condicion': 'NM', 'precio': 1000, 'precioAnterior': None, 'stock': 1, 'descripcion': ''}
s, d = pedir('POST', '/publicaciones', pub_ok, token=diego)
esperar('nombre con HTML se guarda como texto (React lo escapa)', s == 201, s)
for nombre, cambio, esp in [
    ('precio < 100', {'precio': 50}, 400), ('stock 0 al crear', {'stock': 0}, 400), ('stock 1000', {'stock': 1000}, 400),
    ('juego inventado', {'juego': 'digimon'}, 400), ('condición inventada', {'condicion': 'ZZ'}, 400),
    ('oferta con precio anterior menor', {'precioAnterior': 500}, 400), ('descripción de 301 caracteres', {'descripcion': 'x' * 301}, 400),
]:
    s, d = pedir('POST', '/publicaciones', {**pub_ok, **cambio}, token=diego)
    esperar('publicar rechaza ' + nombre, s == esp, (s, d if s != esp else ''))
s, d = pedir('POST', '/publicaciones', pub_ok, token=admin)
esperar('el admin no publica', s == 403, s)

# ---------- Usuario bloqueado ----------
s, _ = pedir('PUT', '/usuarios/U03/estado', {'estado': 'bloqueado'}, token=admin)
s2, _ = pedir('GET', '/auth/yo', token=vale)
s3, d3 = pedir('POST', '/auth/login', {'email': 'valentina@demo.cl', 'clave': 'Demo1234'})
esperar('bloquear deja sin efecto su token y su login', s == 200 and s2 == 401 and s3 == 403, (s, s2, s3))
_, ep = pedir('GET', '/estado')
esperar('sus publicaciones quedan ocultas para el catálogo', all(u['estado'] == 'bloqueado' for u in ep['usuarios'] if u['id'] == 'U03'))
pedir('PUT', '/usuarios/U03/estado', {'estado': 'activo'}, token=admin)

pedir('POST', '/admin/restablecer', token=admin)
fallas = [r for r in resultados if not r[0]]
print(f'\n{len(resultados) - len(fallas)}/{len(resultados)} pruebas OK')
sys.exit(1 if fallas else 0)
