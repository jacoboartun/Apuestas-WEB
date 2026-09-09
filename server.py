#!/usr/bin/env python3
"""
AETHERIS CASINO - Servidor Backend Local y Base de Datos (Linux)
================================================================
Este servidor reemplaza a Google Apps Script y aloja la aplicación web
junto con su base de datos local directamente en Linux.

Características:
- Sirve los archivos estáticos del frontend (HTML, CSS, JS).
- Maneja la API REST en `/api` (solicitudes GET y POST).
- Módulo de Alerta de Emergencia SMTP a jacobocastelblanco@gmail.com.
- Detección de manipulaciones externas e IP sosopechosas.
- Historial extendido por jugador para administración.
"""

import http.server
import socketserver
import json
import os
import sys
import time
import hashlib
import uuid
import threading
import urllib.request
import urllib.error
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import parse_qs, urlparse

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'aetheris_db.json')
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

PASSWORD_PEPPER = 'LOCAL_LINUX_AETHERIS_SECRET_2026'
SESSION_TTL_MS = 12 * 60 * 60 * 1000       # 12 horas
VERIFICATION_TTL_MS = 10 * 60 * 1000    # 10 minutos
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCK_MS = 15 * 60 * 1000          # 15 minutos
MASTER_ALERT_EMAIL = 'jacobocastelblanco@gmail.com'

GAME_MAX_MULTIPLIER = {
    'slots': 50, 'crash': 100, 'plinko': 500, 'mines': 25, 'roulette': 36,
    'blackjack': 3, 'poker': 100, 'baccarat': 9, 'craps': 30, 'videopoker': 800,
    'sicbo': 180, 'scratch': 50, 'coinflip': 2, 'bingo': 100, 'lottery': 1000,
    'keno': 1000, 'quinielas': 50, 'sports': 50, 'wheel': 50, 'livedealer': 20
}

db_lock = threading.Lock()

# ============================= MÓDULO DE ALERTAS SMTP =============================

def send_emergency_email_async(db, subject, body_text):
    def runner():
        smtp_cfg = db.get('smtpConfig', {})
        server_host = smtp_cfg.get('server', '').strip()
        port = int(smtp_cfg.get('port', 587))
        user = smtp_cfg.get('username', '').strip()
        password = smtp_cfg.get('password', '').strip()
        target_email = smtp_cfg.get('alertEmail') or MASTER_ALERT_EMAIL

        full_log_msg = f"\n🚨 ==================================================\n🚨 ALERTA DE EMERGENCIA PARA: {target_email}\nASUNTO: {subject}\n\n{body_text}\n==================================================\n"
        print(full_log_msg)

        if not server_host or not user or not password:
            print("ℹ️ [SISTEMA SEGURIDAD] SMTP no configurado en Admin Panel. Alerta registrada en auditoría local.")
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = f"Coolbet Security Shield <{user}>"
            msg['To'] = target_email
            msg['Subject'] = f"🚨 ALERTA CASINO: {subject}"
            msg.attach(MIMEText(body_text, 'plain', 'utf-8'))

            with smtplib.SMTP(server_host, port, timeout=12) as s:
                s.starttls()
                s.login(user, password)
                s.sendmail(user, [target_email], msg.as_string())
            print(f"✅ Correo de emergencia enviado correctamente a {target_email}")
        except Exception as err:
            print(f"❌ Error al enviar correo de emergencia SMTP: {err}")

    t = threading.Thread(target=runner, daemon=True)
    t.start()

def send_email_direct(db, to_email, subject, body_text):
    send_automated_email(db, to_email, 'custom', {'subject': subject, 'body': body_text})
    return True

def send_automated_email(db, to_email, event_type, data=None):
    if data is None: data = {}
    def runner():
        smtp_cfg = db.get('smtpConfig', {})
        server_host = (smtp_cfg.get('server') or 'smtp.gmail.com').strip()
        port = int(smtp_cfg.get('port') or 587)
        user = (smtp_cfg.get('username') or 'betc34781@gmail.com').strip()
        password = (smtp_cfg.get('password') or '').strip()

        print(f"\n==================================================")
        print(f"📧 [SMTP AUTOMÁTICO] EVENTO: {event_type} -> PARA: [{to_email}]")
        print(f"EMISOR: {user}")
        print(f"==================================================\n")

        if not password:
            print(f"ℹ️ [SMTP] Notificación generada para {to_email}. Configura la Contraseña de Aplicación de betc34781@gmail.com en el Panel Admin (#admin) para entrega física.")
            return

        subject = ""
        html_body = ""
        plain_text = ""

        if event_type == 'verification_code':
            code = data.get('code', '0000')
            subject = "🔑 Código de Verificación - Coolbet Casino"
            plain_text = f"Hola,\n\nTu código de verificación para completar tu registro en Coolbet Casino es: {code}\n\nIngrésalo en la plataforma para recibir tu Bono de Bienvenida de $5,000 COP."
            html_body = f"""
            <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #334155;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #8b5cf6; margin: 0; font-size: 24px; font-weight: 800;">COOLBET CASINO</h1>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Verificación de Cuenta de Usuario</p>
              </div>
              <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #475569;">
                <h2 style="color: #ffffff; font-size: 16px; margin-top: 0;">Tu Código de Activación</h2>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4ade80; background: #0f172a; padding: 14px; border-radius: 8px; margin: 16px 0; border: 1px solid #00c853;">
                  {code}
                </div>
                <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">Ingresa este código en la plataforma para activar tu cuenta y reclamar tu <strong>Bono de Bienvenida de $5,000 COP</strong>.</p>
                <p style="color: #94a3b8; font-size: 11px; margin-top: 14px;">Este código vence en 10 minutos por razones de seguridad.</p>
              </div>
              <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">© 2026 Coolbet Colombia S.A.S. - Notificación enviada desde betc34781@gmail.com</p>
            </div>
            """

        elif event_type == 'password_reset':
            code = data.get('code', '0000')
            subject = "🔑 Código de Recuperación de Contraseña - Coolbet Casino"
            plain_text = f"Hola,\n\nTu código de recuperación para definir una nueva contraseña en Coolbet Casino es: {code}"
            html_body = f"""
            <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #334155;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #8b5cf6; margin: 0; font-size: 24px; font-weight: 800;">COOLBET CASINO</h1>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Restablecimiento de Contraseña</p>
              </div>
              <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #475569;">
                <h2 style="color: #ffffff; font-size: 16px; margin-top: 0;">Código de Recuperación</h2>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #f59e0b; background: #0f172a; padding: 14px; border-radius: 8px; margin: 16px 0; border: 1px solid #f59e0b;">
                  {code}
                </div>
                <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">Ingresa este código en la ventana de recuperación para actualizar tu clave de acceso.</p>
                <p style="color: #94a3b8; font-size: 11px; margin-top: 14px;">Si no solicitaste este cambio, por favor ignora este correo.</p>
              </div>
              <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">© 2026 Coolbet Colombia S.A.S. - Notificación enviada desde betc34781@gmail.com</p>
            </div>
            """

        elif event_type == 'recharge_requested':
            amount = f"{float(data.get('amount', 0)):,.2f}"
            method = data.get('method', 'PSE / Mercado Pago')
            bank = data.get('bank', 'Entidad Bancaria')
            ref = data.get('paymentId') or data.get('cus') or 'PAY-REF'
            subject = "📩 Solicitud de Recarga Recibida - Coolbet Casino"
            plain_text = f"Hola,\n\nHemos recibido tu solicitud de recarga por ${amount} COP vía {method} ({bank}). Referencia: {ref}."
            html_body = f"""
            <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #334155;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #8b5cf6; margin: 0; font-size: 24px; font-weight: 800;">COOLBET CASINO</h1>
                <p style="color: #38bdf8; font-size: 13px; margin-top: 4px;">📩 Solicitud de Recarga Recibida</p>
              </div>
              <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #475569;">
                <p style="color: #f8fafc; font-size: 14px; margin-top: 0;">Hola,</p>
                <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">Tu solicitud de recarga por <strong>${amount} COP</strong> ha sido registrada exitosamente.</p>
                
                <div style="background: #0f172a; padding: 14px; border-radius: 8px; margin: 16px 0; border: 1px solid #38bdf8; font-size: 12px; line-height: 1.6;">
                  <div><strong>Método de Pago:</strong> <span style="color:#ffffff;">{method} ({bank})</span></div>
                  <div><strong>Referencia de Pago:</strong> <span style="color:#f59e0b; font-family: monospace;">{ref}</span></div>
                  <div><strong>Monto Solicitado:</strong> <span style="color:#4ade80; font-weight: bold;">${amount} COP</span></div>
                  <div><strong>Estado:</strong> <span style="color:#38bdf8;">En proceso de autorización bancaria</span></div>
                </div>
                
                <p style="color: #cbd5e1; font-size: 12px;">Una vez que la transacción sea autorizada en la pasarela o aprobada por el administrador, tus fondos se acreditarán inmediatamente.</p>
              </div>
              <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">© 2026 Coolbet Colombia S.A.S. - Notificación enviada desde betc34781@gmail.com</p>
            </div>
            """

        elif event_type == 'recharge_approved':
            amount = f"{float(data.get('amount', 0)):,.2f}"
            new_bal = f"{float(data.get('newBalance', 0)):,.2f}"
            method = data.get('method', 'PSE / Mercado Pago')
            subject = "✅ ¡Recarga Aprobada y Fondo Acreditado! - Coolbet Casino"
            plain_text = f"¡Hola!\n\nTu recarga de ${amount} COP ha sido aprobada y acreditada. Tu nuevo saldo disponible es: ${new_bal} COP."
            html_body = f"""
            <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #334155;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #8b5cf6; margin: 0; font-size: 24px; font-weight: 800;">COOLBET CASINO</h1>
                <p style="color: #4ade80; font-size: 13px; margin-top: 4px;">✅ ¡Recarga Aprobada y Fondo Acreditado!</p>
              </div>
              <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #00c853;">
                <p style="color: #f8fafc; font-size: 14px; margin-top: 0;">¡Hola!</p>
                <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">¡Tu pago de recarga ({method}) ha sido verificado y los fondos han sido acreditados a tu saldo!</p>
                
                <div style="background: #0f172a; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #00c853; text-align: center;">
                  <div style="color: #94a3b8; font-size: 12px;">Monto Acreditado:</div>
                  <div style="font-size: 24px; font-weight: bold; color: #4ade80; margin: 4px 0;">${amount} COP</div>
                  <div style="color: #cbd5e1; font-size: 13px; border-top: 1px solid #334155; padding-top: 8px; margin-top: 8px;">
                    Nuevo Saldo Disponible: <strong style="color:#ffffff;">${new_bal} COP</strong>
                  </div>
                </div>
                
                <p style="color: #cbd5e1; font-size: 12px; text-align: center;">¡Te deseamos la mejor de las suertes en tus apuestas!</p>
              </div>
              <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">© 2026 Coolbet Colombia S.A.S. - Notificación enviada desde betc34781@gmail.com</p>
            </div>
            """
        else:
            subject = data.get('subject', 'Notificación Coolbet')
            body = data.get('body', '')
            plain_text = body
            html_body = f"<div style='font-family:Arial;padding:20px;background:#0f172a;color:#fff;'><h2>{subject}</h2><p>{body}</p></div>"

        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"Coolbet Casino <{user}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(plain_text, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))

            with smtplib.SMTP(server_host, port, timeout=12) as s:
                s.starttls()
                s.login(user, password)
                s.sendmail(user, [to_email], msg.as_string())
            print(f"✅ Correo enviado exitosamente a {to_email}")
        except Exception as err:
            print(f"❌ Error al enviar correo por SMTP ({user}): {err}")

    t = threading.Thread(target=runner, daemon=True)
    t.start()

# ============================= INTEGRACIÓN MERCADO PAGO =============================

def create_real_mp_preference(access_token, amount, email, return_url):
    url = "https://api.mercadopago.com/checkout/preferences"
    external_ref = f"{email}|{amount:.2f}|{uuid.uuid4()}"
    payload = {
        "items": [{
            "title": "Depósito Coolbet Casino",
            "quantity": 1,
            "currency_id": "COP",
            "unit_price": amount
        }],
        "external_reference": external_ref,
        "back_urls": {
            "success": return_url,
            "failure": return_url,
            "pending": return_url
        },
        "auto_return": "approved"
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            init_point = data.get('init_point') or data.get('sandbox_init_point')
            if not init_point:
                raise Exception("Mercado Pago no devolvió una URL de checkout válida.")
            return init_point, external_ref
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"Error Mercado Pago: {err_body}")
        raise Exception("Error al conectar con Mercado Pago. Revisa tu Access Token en el Panel Admin (#admin).")

def check_and_process_mp_payment(db, payment_id):
    access_token = db.get('mercadoPagoConfig', {}).get('accessToken')
    if not access_token: return False

    url = f"https://api.mercadopago.com/v1/payments/{payment_id}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        method="GET"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payment = json.loads(resp.read().decode('utf-8'))
            ref = payment.get('external_reference')
            if ref and ref in db.get('pendingPayments', {}):
                pending = db['pendingPayments'][ref]
                if not pending.get('consumed') and payment.get('status') == 'approved':
                    user = find_user(db, pending['email'])
                    if user:
                        user['balance'] = round(user['balance'] + pending['amount'], 2)
                        pending['consumed'] = True
                        log_event(db, 'MP_PAYMENT_APPROVED', f"{user['email']} - Depósito real de Mercado Pago verificado: ${pending['amount']:.2f}")
                        save_db(db)
                        return True
    except Exception as e:
        print(f"Error al verificar webhook Mercado Pago: {e}")
    return False

# ============================= UTILIDADES DE SEGURIDAD =============================

def hash_password(password, salt):
    data = f"{password}:{salt}:{PASSWORD_PEPPER}".encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def verify_password(user, password):
    if user.get('salt'):
        return hash_password(password, user['salt']) == user.get('passwordHash')
    legacy_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    if legacy_hash == user.get('passwordHash'):
        user['salt'] = str(uuid.uuid4())
        user['passwordHash'] = hash_password(password, user['salt'])
        return True
    return False

def is_valid_email(email):
    return '@' in email and '.' in email

def generate_code():
    import random
    return str(random.randint(1000, 9999))

def new_token():
    return uuid.uuid4().hex + uuid.uuid4().hex

# ============================= PERSISTENCIA LOCAL (JSON DB) =============================

def build_default_user(email, password, role):
    salt = str(uuid.uuid4())
    return {
        'email': email,
        'passwordHash': hash_password(password, salt),
        'salt': salt,
        'role': role,
        'balance': 5000.0 if role == 'user' else 0.0,
        'bonusBalance': 5000.0 if role == 'user' else 0.0,
        'winnings': 0,
        'losses': 0,
        'vipLevel': 10 if role == 'admin' else 1,
        'xp': 999999 if role == 'admin' else 0,
        'history': [],
        'failedLoginAttempts': 0,
        'lockedUntil': 0
    }

def build_default_db():
    return {
        'version': 4,
        'users': [
            build_default_user('user@coolbet.com', 'user123', 'user'),
            build_default_user('admin@coolbet.com', 'admin123', 'admin'),
            build_default_user('jacobocastelblanco@gmail.com', 'admin1234', 'admin')
        ],
        'sessions': {},
        'pendingVerifications': {},
        'pendingPayments': {},
        'rtpSettings': {
            'globalRtp': 0.95,
            'gameRtps': {
                'slots': 0.96, 'crash': 0.97, 'plinko': 0.98, 'mines': 0.96, 'roulette': 0.973,
                'blackjack': 0.99, 'poker': 0.95, 'baccarat': 0.989, 'craps': 0.986, 'videopoker': 0.995,
                'sicbo': 0.972, 'scratch': 0.85, 'coinflip': 0.98, 'bingo': 0.90, 'lottery': 0.70,
                'keno': 0.80, 'quinielas': 0.75, 'sports': 0.92, 'wheel': 0.94, 'livedealer': 0.97
            }
        },
        'platformStats': {'totalBets': 0, 'totalWins': 0, 'totalVolume': 0, 'totalPayouts': 0, 'houseProfit': 0},
        'gameVisibility': {},
        'mercadoPagoConfig': {'publicKey': '', 'accessToken': ''},
        'smtpConfig': {'server': '', 'port': 587, 'username': '', 'password': '', 'alertEmail': MASTER_ALERT_EMAIL},
        'auditLogs': [{'timestamp': int(time.time() * 1000), 'action': 'SYSTEM_INITIALIZATION', 'details': 'Servidor local Linux Coolbet iniciado (v4 Security Active)'}]
    }

def get_db():
    with db_lock:
        if not os.path.exists(DB_FILE):
            db = build_default_db()
            save_db_unlocked(db)
            return db
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                db = json.load(f)
        except Exception:
            db = build_default_db()
            save_db_unlocked(db)
            return db

        # Migrar si faltan claves
        if 'sessions' not in db: db['sessions'] = {}
        if 'pendingVerifications' not in db: db['pendingVerifications'] = {}
        if 'pendingPayments' not in db: db['pendingPayments'] = {}
        if 'mercadoPagoConfig' not in db: db['mercadoPagoConfig'] = {'publicKey': '', 'accessToken': ''}
        if 'smtpConfig' not in db: db['smtpConfig'] = {'server': '', 'port': 587, 'username': '', 'password': '', 'alertEmail': MASTER_ALERT_EMAIL}
        if 'gameVisibility' not in db: db['gameVisibility'] = {}
        if 'platformStats' not in db: db['platformStats'] = {'totalBets': 0, 'totalWins': 0, 'totalVolume': 0, 'totalPayouts': 0, 'houseProfit': 0}
        if 'auditLogs' not in db: db['auditLogs'] = []
        if 'pqrTickets' not in db: db['pqrTickets'] = []
        if 'rtpSettings' not in db: db['rtpSettings'] = build_default_db()['rtpSettings']
        
        for u in db.get('users', []):
            if 'failedLoginAttempts' not in u: u['failedLoginAttempts'] = 0
            if 'lockedUntil' not in u: u['lockedUntil'] = 0
            if 'history' not in u: u['history'] = []
            if 'bonusBalance' not in u: u['bonusBalance'] = 5000.0 if u.get('role') == 'user' else 0.0

        return db

def save_db(db):
    with db_lock:
        save_db_unlocked(db)

def save_db_unlocked(db):
    tmp_file = DB_FILE + '.tmp'
    with open(tmp_file, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    os.replace(tmp_file, DB_FILE)

# ============================= AYUDANTES DE DOMINIO =============================

def find_user(db, email):
    email = (email or '').strip().lower()
    for u in db.get('users', []):
        if u.get('email', '').strip().lower() == email:
            return u
    return None

def public_user(u):
    return {
        'email': u['email'],
        'role': u['role'],
        'balance': u['balance'],
        'bonusBalance': float(u.get('bonusBalance', 5000.0 if u.get('role') == 'user' else 0.0)),
        'winnings': u['winnings'],
        'losses': u['losses'],
        'vipLevel': u['vipLevel'],
        'xp': u['xp'],
        'history': u.get('history', []),
        'transactions': u.get('transactions', []),
        'payoutAccount': u.get('payoutAccount', {})
    }

def log_event(db, action, details, user_email=None):
    db['auditLogs'].insert(0, {
        'timestamp': int(time.time() * 1000),
        'action': action,
        'details': details,
        'userEmail': user_email or ''
    })
    if len(db['auditLogs']) > 500:
        db['auditLogs'] = db['auditLogs'][:500]

def create_session(db, user):
    token = new_token()
    db['sessions'][token] = {
        'email': user['email'],
        'role': user['role'],
        'expiresAt': int(time.time() * 1000) + SESSION_TTL_MS
    }
    return token

def require_session(db, token):
    if not token or token not in db['sessions']:
        raise Exception('No autenticado. Vuelve a iniciar sesión.')
    sess = db['sessions'][token]
    if sess['expiresAt'] < int(time.time() * 1000):
        del db['sessions'][token]
        raise Exception('Sesión expirada. Vuelve a iniciar sesión.')
    user = find_user(db, sess['email'])
    if not user:
        raise Exception('Usuario no encontrado.')
    if user.get('lockedUntil') and user['lockedUntil'] > int(time.time() * 1000):
        raise Exception('Cuenta bloqueada temporalmente por seguridad.')
    return user

def require_admin(db, token, client_ip=""):
    try:
        user = require_session(db, token)
        if user['role'] != 'admin':
            raise Exception('Se requiere rol de administrador.')
        return user
    except Exception as e:
        if client_ip and client_ip not in ('127.0.0.1', '::1', 'localhost'):
            details = f"Intento no autorizado de acceso de administrador desde IP externa {client_ip}. Error: {e}"
            log_event(db, 'EXTERNAL_SECURITY_ALERT', details)
            save_db(db)
            send_emergency_email_async(
                db,
                "Intento de Acceso no Autorizado de Administrador",
                f"Se ha detectado un intento de acceso a funciones de administración desde una IP externa.\n\nIP Origen: {client_ip}\nHora: {time.strftime('%Y-%m-%d %H:%M:%S')}\nDetalles: {e}\n\nSi no fuiste tú, revisa inmediatamente la seguridad de la plataforma."
            )
        raise e

def build_public_config(db):
    return {
        'rtpSettings': db['rtpSettings'],
        'gameVisibility': db['gameVisibility'],
        'mercadoPagoConfig': {'publicKey': db['mercadoPagoConfig'].get('publicKey', '')}
    }

# ============================= LÓGICA DE LA API =============================

def handle_api_action(body, client_ip=""):
    db = get_db()
    action = body.get('action')
    is_external = client_ip not in ('127.0.0.1', '::1', 'localhost') if client_ip else False

    if action == 'requestCode':
        email = (body.get('email') or '').strip().lower()
        if not is_valid_email(email): raise Exception('Formato de email inválido.')
        req_type = 'reset' if body.get('type') == 'reset' else 'register'

        if req_type == 'register':
            if find_user(db, email): raise Exception('Este correo ya está registrado.')
            password = body.get('password') or ''
            if len(password) < 6: raise Exception('La contraseña debe tener al menos 6 caracteres.')
            role = 'user'
            salt = str(uuid.uuid4())
            code = generate_code()
            db['pendingVerifications'][email] = {
                'code': code, 'type': 'register', 'role': role,
                'passwordHash': hash_password(password, salt), 'salt': salt,
                'expiresAt': int(time.time() * 1000) + VERIFICATION_TTL_MS
            }
            save_db(db)

            send_automated_email(db, email, 'verification_code', {'code': code})
            return {'success': True, 'code': code, 'smtpSent': True}

        user = find_user(db, email)
        if not user: raise Exception('El correo no está registrado.')
        code = generate_code()
        db['pendingVerifications'][email] = {
            'code': code, 'type': 'reset',
            'expiresAt': int(time.time() * 1000) + VERIFICATION_TTL_MS
        }
        save_db(db)

        send_automated_email(db, email, 'password_reset', {'code': code})
        return {'success': True, 'code': code, 'smtpSent': True}

    elif action == 'completeRegistration':
        email = (body.get('email') or '').strip().lower()
        code = str(body.get('code') or '')
        pending = db['pendingVerifications'].get(email)
        if not pending: raise Exception('No hay una verificación pendiente para este correo.')
        if pending['type'] != 'register': raise Exception('Tipo de verificación inválido.')
        if pending['expiresAt'] < int(time.time() * 1000):
            del db['pendingVerifications'][email]
            raise Exception('El código ha expirado. Solicita uno nuevo.')
        if str(pending['code']) != code: raise Exception('Código incorrecto.')
        
        del db['pendingVerifications'][email]
        if find_user(db, email): raise Exception('Este correo ya está registrado.')

        new_u = {
            'email': email, 'passwordHash': pending['passwordHash'], 'salt': pending['salt'],
            'role': 'user', 'balance': 5000.0, 'bonusBalance': 5000.0,
            'winnings': 0, 'losses': 0, 'vipLevel': 1, 'xp': 0, 'history': [],
            'failedLoginAttempts': 0, 'lockedUntil': 0
        }
        db['users'].append(new_u)
        log_event(db, 'USER_REGISTERED', f"Cuenta creada: {email} ({new_u['role']}) desde IP: {client_ip or 'local'}")
        token = create_session(db, new_u)
        save_db(db)
        return {'success': True, 'token': token, 'user': public_user(new_u)}

    elif action == 'completePasswordReset':
        email = (body.get('email') or '').strip().lower()
        new_password = body.get('newPassword') or ''
        if len(new_password) < 6: raise Exception('La nueva contraseña debe tener al menos 6 caracteres.')
        code = str(body.get('code') or '')

        pending = db['pendingVerifications'].get(email)
        if not pending: raise Exception('No hay una verificación pendiente para este correo.')
        if pending['type'] != 'reset': raise Exception('Tipo de verificación inválido.')
        if pending['expiresAt'] < int(time.time() * 1000):
            del db['pendingVerifications'][email]
            raise Exception('El código ha expirado.')
        if str(pending['code']) != code: raise Exception('Código incorrecto.')

        del db['pendingVerifications'][email]
        user = find_user(db, email)
        if not user: raise Exception('Usuario no encontrado.')

        salt = str(uuid.uuid4())
        user['salt'] = salt
        user['passwordHash'] = hash_password(new_password, salt)
        user['failedLoginAttempts'] = 0
        user['lockedUntil'] = 0
        log_event(db, 'PASSWORD_RESET', f"Contraseña restablecida: {email}")
        token = create_session(db, user)
        save_db(db)
        return {'success': True, 'token': token, 'user': public_user(user)}

    elif action == 'changePassword':
        user = require_session(db, body.get('token'))
        old_password = body.get('oldPassword') or ''
        new_password = body.get('newPassword') or ''
        if len(new_password) < 6: raise Exception('La nueva contraseña debe tener al menos 6 caracteres.')
        if not verify_password(user, old_password): raise Exception('La contraseña actual es incorrecta.')

        salt = str(uuid.uuid4())
        user['salt'] = salt
        user['passwordHash'] = hash_password(new_password, salt)
        log_event(db, 'PASSWORD_CHANGED', f"Contraseña actualizada para: {user['email']}")
        save_db(db)
        return {'success': True}

    elif action == 'login':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        user = find_user(db, email)

        if not user:
            log_event(db, 'LOGIN_FAILED', f"Email no registrado: {email} (IP: {client_ip or 'local'})")
            if is_external:
                send_emergency_email_async(
                    db,
                    "Intento de Inicio de Sesión Fallido desde IP Externa",
                    f"Se ha detectado un intento de inicio de sesión con un correo no registrado.\nEmail: {email}\nIP Origen: {client_ip}\nHora: {time.strftime('%Y-%m-%d %H:%M:%S')}"
                )
            save_db(db)
            raise Exception('Email o contraseña incorrectos.')

        now = int(time.time() * 1000)
        if user.get('lockedUntil') and user['lockedUntil'] > now:
            if is_external:
                send_emergency_email_async(
                    db,
                    "Acceso Denegado a Cuenta Bloqueada",
                    f"Alguien intenta acceder a la cuenta {email} desde la IP externa {client_ip} pero la cuenta se encuentra bloqueada."
                )
            raise Exception('Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta más tarde.')

        if not verify_password(user, password):
            user['failedLoginAttempts'] = user.get('failedLoginAttempts', 0) + 1
            if user['failedLoginAttempts'] >= MAX_LOGIN_ATTEMPTS:
                user['lockedUntil'] = now + LOGIN_LOCK_MS
                log_event(db, 'ACCOUNT_LOCKED', f"Bloqueo temporal por intentos fallidos: {email} (IP: {client_ip or 'local'})")
                send_emergency_email_async(
                    db,
                    f"BLOQUEO DE SEGURIDAD EN CUENTA: {email}",
                    f"La cuenta {email} ha sido bloqueada tras 5 intentos fallidos consecutivos de contraseña.\nIP Origen: {client_ip or 'Local'}\nHora: {time.strftime('%Y-%m-%d %H:%M:%S')}"
                )
            else:
                log_event(db, 'LOGIN_FAILED', f"Contraseña incorrecta: {email} (IP: {client_ip or 'local'})")
            save_db(db)
            raise Exception('Email o contraseña incorrectos.')

        user['failedLoginAttempts'] = 0
        user['lockedUntil'] = 0
        log_event(db, 'USER_LOGIN', f"Sesión iniciada: {email} (IP: {client_ip or 'local'})")
        token = create_session(db, user)
        save_db(db)
        return {'success': True, 'token': token, 'user': public_user(user)}

    elif action == 'logout':
        token = body.get('token')
        if token and token in db['sessions']:
            log_event(db, 'USER_LOGOUT', f"Sesión cerrada: {db['sessions'][token]['email']}")
            del db['sessions'][token]
            save_db(db)
        return {'success': True}

    elif action == 'getMe':
        user = require_session(db, body.get('token'))
        return {'success': True, 'user': public_user(user)}

    elif action == 'settleBet':
        user = require_session(db, body.get('token'))
        game_id = str(body.get('gameId') or '')
        try: bet_amount = float(body.get('betAmount'))
        except (ValueError, TypeError): raise Exception('Monto de apuesta inválido.')
        try: win_amount = float(body.get('winAmount'))
        except (ValueError, TypeError): win_amount = 0.0

        if not game_id or bet_amount <= 0: raise Exception('Apuesta inválida.')
        if win_amount < 0: win_amount = 0.0
        if user['balance'] < bet_amount: raise Exception('Saldo insuficiente.')

        cap = GAME_MAX_MULTIPLIER.get(game_id, 100)
        max_win = round(bet_amount * cap, 2)

        # Detección de intento de manipulación desde el cliente (ganancia reportada > límite del servidor)
        if win_amount > max_win:
            details = f"MANIPULACIÓN DETECTADA: {user['email']} en {game_id}. Apuesta ${bet_amount}, ganancia pretendida ${win_amount} (Máximo permitido: ${max_win}). IP: {client_ip or 'local'}"
            log_event(db, 'EXTERNAL_MANIPULATION_ATTEMPT', details)
            send_emergency_email_async(
                db,
                "ALERTA CRÍTICA: Intento de Manipulación de Resultado de Juego",
                f"Se ha detectado un intento de manipulación de ganancia desproporcionada desde el navegador/cliente.\n\nUsuario: {user['email']}\nJuego: {game_id}\nApuesta: ${bet_amount}\nGanancia pretendida: ${win_amount}\nTope máximo servidor: ${max_win}\nIP Origen: {client_ip or 'Local'}\nHora: {time.strftime('%Y-%m-%d %H:%M:%S')}"
            )
            win_amount = max_win

        user['balance'] = round(user['balance'] - bet_amount + win_amount, 2)
        if win_amount > bet_amount:
            user['winnings'] = round(user['winnings'] + (win_amount - bet_amount), 2)
            user['xp'] += int(bet_amount * 2)
        else:
            user['losses'] = round(user['losses'] + (bet_amount - win_amount), 2)
            user['xp'] += int(bet_amount * 1.5)

        new_level = min(10, (user['xp'] // 1000) + 1)
        if new_level > user['vipLevel']:
            user['vipLevel'] = new_level
            log_event(db, 'VIP_LEVEL_UP', f"Usuario {user['email']} alcanzó VIP {new_level}")

        if 'history' not in user: user['history'] = []
        user['history'].insert(0, {
            'timestamp': int(time.time() * 1000), 'gameId': game_id,
            'bet': bet_amount, 'win': win_amount,
            'net': round(win_amount - bet_amount, 2),
            'details': str(body.get('details') or ''),
            'ip': client_ip or 'local'
        })
        if len(user['history']) > 100: user['history'] = user['history'][:100]

        stats = db['platformStats']
        stats['totalBets'] += 1
        if win_amount > 0: stats['totalWins'] += 1
        stats['totalVolume'] = round(stats['totalVolume'] + bet_amount, 2)
        stats['totalPayouts'] = round(stats['totalPayouts'] + win_amount, 2)
        stats['houseProfit'] = round(stats['totalVolume'] - stats['totalPayouts'], 2)

        log_event(db, 'GAME_SETTLED', f"{user['email']} apostó ${bet_amount} en {game_id}, ganó ${win_amount}")
        save_db(db)
        return {'success': True, 'user': public_user(user)}

    elif action == 'wallet':
        user = require_session(db, body.get('token'))
        try: amount = float(body.get('amount'))
        except (ValueError, TypeError): raise Exception('Monto inválido.')
        if amount <= 0: raise Exception('Monto debe ser mayor a 0.')

        if body.get('isDeposit'):
            if amount > 100000: raise Exception('Monto máximo de depósito: $100,000.')
            user['balance'] = round(user['balance'] + amount, 2)
            user.setdefault('transactions', []).insert(0, {
                'id': f"DEP-{int(time.time()*1000)}",
                'type': 'deposit',
                'amount': amount,
                'status': 'approved',
                'timestamp': int(time.time() * 1000),
                'method': 'Saldo Simulado / Directo',
                'description': 'Depósito directo a saldo'
            })
            log_event(db, 'WALLET_DEPOSIT', f"{user['email']} depositó ${amount:.2f}")
        else:
            bonus = float(user.get('bonusBalance', 5000.0 if user.get('role') == 'user' else 0.0))
            withdrawable = round(max(0.0, user['balance'] - bonus), 2)
            if amount > withdrawable:
                raise Exception(f"El Bono de Bienvenida de $5,000 COP no se puede retirar. Es únicamente redimible en juegos. Saldo retirable disponible: ${withdrawable:.2f}")
            user['balance'] = round(user['balance'] - amount, 2)
            bank_info = user.get('payoutAccount', {})
            method_desc = bank_info.get('bankName', 'Transferencia Bancaria')
            acc_num = bank_info.get('accountNumber', '')
            user.setdefault('transactions', []).insert(0, {
                'id': f"WTH-{int(time.time()*1000)}",
                'type': 'withdrawal',
                'amount': amount,
                'status': 'approved',
                'timestamp': int(time.time() * 1000),
                'method': method_desc,
                'description': f"Retiro a {method_desc} {acc_num}".strip()
            })
            log_event(db, 'WALLET_WITHDRAWAL', f"{user['email']} retiró ${amount:.2f}")

        save_db(db)
        return {'success': True, 'user': public_user(user)}

    elif action == 'createMpPreference':
        user = require_session(db, body.get('token'))
        try: amount = float(body.get('amount'))
        except (ValueError, TypeError): raise Exception('Monto de recarga inválido.')
        if amount < 1000: raise Exception('El monto mínimo de recarga es $1,000 COP.')
        
        access_token = db.get('mercadoPagoConfig', {}).get('accessToken')
        if access_token:
            try:
                init_point, external_ref = create_real_mp_preference(access_token, amount, user['email'], body.get('returnUrl') or '')
                db.setdefault('pendingPayments', {})[external_ref] = {
                    'email': user['email'], 'amount': amount, 'consumed': False, 'createdAt': int(time.time() * 1000)
                }
                log_event(db, 'MP_PREFERENCE_CREATED', f"{user['email']} solicitó orden de Mercado Pago por ${amount:.2f}")
                save_db(db)
                return {'success': True, 'initPoint': init_point}
            except Exception as e:
                print(f"Aviso MP API: {e}. Redirigiendo a pasarela Sandbox.")

        import random
        payment_id = f"PAY-MP-{random.randint(100000, 999999)}"
        mp_link = "https://link.mercadopago.com.co/casinobet"
        order = {
            'paymentId': payment_id,
            'email': user['email'],
            'method': 'Mercado Pago',
            'amount': amount,
            'bank': 'Mercado Pago Colombia (link.mercadopago.com.co/casinobet)',
            'status': 'pending',
            'createdAt': int(time.time() * 1000)
        }
        db.setdefault('pendingRecharges', {})[payment_id] = order
        log_event(db, 'MP_GATEWAY_PENDING', f"{user['email']} inició recarga vía Mercado Pago Link ({mp_link}) por ${amount:.2f} COP")
        save_db(db)
        send_automated_email(db, user['email'], 'recharge_requested', order)
        return {
            'success': True,
            'initPoint': mp_link,
            'paymentId': payment_id,
            'requiresGateway': True,
            'amount': amount,
            'bank': 'Mercado Pago Colombia',
            'method': 'Mercado Pago'
        }

    elif action == 'processPseDeposit':
        user = require_session(db, body.get('token'))
        try: amount = float(body.get('amount'))
        except (ValueError, TypeError): raise Exception('Monto de recarga inválido.')
        if amount < 1000: raise Exception('El monto mínimo de recarga PSE es $1,000 COP.')

        bank = (body.get('bank') or '').strip()
        doc_type = (body.get('docType') or 'CC').strip()
        doc_number = (body.get('docNumber') or '').strip()
        holder_name = (body.get('holderName') or '').strip()
        person_type = (body.get('personType') or 'Natural').strip()

        if not bank or not doc_number or not holder_name:
            raise Exception('Por favor completa todos los campos de información bancaria PSE.')

        import random
        payment_id = f"PAY-PSE-{random.randint(100000, 999999)}"
        cus_code = f"CUS-PSE-{random.randint(10000000, 99999999)}"

        order = {
            'paymentId': payment_id,
            'email': user['email'],
            'method': 'PSE',
            'amount': amount,
            'bank': bank,
            'personType': person_type,
            'docType': doc_type,
            'docNumber': doc_number,
            'holderName': holder_name,
            'cus': cus_code,
            'status': 'pending',
            'createdAt': int(time.time() * 1000)
        }
        db.setdefault('pendingRecharges', {})[payment_id] = order
        log_event(db, 'PSE_GATEWAY_PENDING', f"{user['email']} inició pasarela PSE ({bank}) por ${amount:.2f} COP")
        save_db(db)
        send_automated_email(db, user['email'], 'recharge_requested', order)
        return {
            'success': True,
            'paymentId': payment_id,
            'requiresGateway': True,
            'cus': cus_code,
            'amount': amount,
            'bank': bank,
            'method': 'PSE',
            'holderName': holder_name,
            'docNumber': doc_number
        }

    elif action == 'confirmPaymentGateway':
        user = require_session(db, body.get('token'))
        payment_id = (body.get('paymentId') or '').strip()
        pending_dict = db.get('pendingRecharges', {})

        if not payment_id or payment_id not in pending_dict:
            raise Exception('Transacción de pago no encontrada o expirada.')

        order = pending_dict[payment_id]
        if order['email'] != user['email']:
            raise Exception('No tienes autorización para confirmar esta transacción.')

        if order['status'] == 'approved':
            return {'success': True, 'user': public_user(user), 'order': order}

        if order['status'] != 'pending':
            raise Exception('Esta transacción de pago ya fue cancelada o procesada.')

        order['status'] = 'approved'
        order['approvedAt'] = int(time.time() * 1000)
        user['balance'] = round(user['balance'] + order['amount'], 2)
        user.setdefault('transactions', []).insert(0, {
            'id': order.get('paymentId', f"MP-{int(time.time()*1000)}"),
            'type': 'deposit',
            'amount': order['amount'],
            'status': 'approved',
            'timestamp': int(time.time() * 1000),
            'method': order.get('method', 'Mercado Pago'),
            'description': f"Recarga mediante {order.get('method', 'Mercado Pago')}"
        })

        log_event(db, 'PAYMENT_APPROVED', f"{user['email']} completó pago de ${order['amount']:.2f} COP vía {order['method']} ({order.get('bank', '')})")
        save_db(db)
        send_automated_email(db, user['email'], 'recharge_approved', {
            'amount': order['amount'],
            'newBalance': user['balance'],
            'method': order.get('method', 'PSE / Mercado Pago'),
            'paymentId': order.get('paymentId'),
            'cus': order.get('cus')
        })
        return {'success': True, 'user': public_user(user), 'order': order}

    elif action == 'cancelPaymentGateway':
        user = require_session(db, body.get('token'))
        payment_id = (body.get('paymentId') or '').strip()
        pending_dict = db.get('pendingRecharges', {})

        if payment_id in pending_dict and pending_dict[payment_id]['email'] == user['email']:
            pending_dict[payment_id]['status'] = 'canceled'
            save_db(db)
        return {'success': True}

    elif action == 'adminGetDashboard':
        require_admin(db, body.get('token'), client_ip)
        registered_emails = {u['email'].lower() for u in db['users'] if u.get('email')}

        # Filter audit logs strictly for real registered users & administrative system actions
        filtered_logs = []
        for l in db['auditLogs']:
            details = l.get('details', '')
            u_email = (l.get('userEmail') or '').lower()
            is_reg_user = any(em in details.lower() or em == u_email for em in registered_emails)
            is_admin_sys = l.get('action', '').startswith('ADMIN_') or l.get('action', '').startswith('SYSTEM_') or 'admin' in details.lower()
            if is_reg_user or is_admin_sys:
                filtered_logs.append(l)

        # Filter users list strictly to real registered users
        real_users = [{
            'email': u['email'],
            'role': u['role'],
            'balance': u['balance'],
            'winnings': u.get('winnings', 0),
            'losses': u.get('losses', 0),
            'vipLevel': u['vipLevel'],
            'xp': u.get('xp', 0),
            'failedLoginAttempts': u.get('failedLoginAttempts', 0),
            'lockedUntil': u.get('lockedUntil', 0),
            'payoutAccount': u.get('payoutAccount', {}),
            'history': u.get('history', [])
        } for u in db['users'] if u.get('email') and not u['email'].startswith('guest_')]

        return {
            'success': True,
            'platformStats': db['platformStats'],
            'rtpSettings': db['rtpSettings'],
            'gameVisibility': db['gameVisibility'],
            'mercadoPagoConfig': {
                'publicKey': db['mercadoPagoConfig'].get('publicKey', ''),
                'hasAccessToken': bool(db['mercadoPagoConfig'].get('accessToken'))
            },
            'smtpConfig': {
                'server': db.get('smtpConfig', {}).get('server', ''),
                'port': db.get('smtpConfig', {}).get('port', 587),
                'username': db.get('smtpConfig', {}).get('username', ''),
                'alertEmail': db.get('smtpConfig', {}).get('alertEmail') or MASTER_ALERT_EMAIL,
                'hasPassword': bool(db.get('smtpConfig', {}).get('password'))
            },
            'auditLogs': filtered_logs[:150],
            'users': real_users
        }

    elif action == 'adminSetSmtpConfig':
        require_admin(db, body.get('token'), client_ip)
        cfg = db.setdefault('smtpConfig', {})
        if isinstance(body.get('server'), str): cfg['server'] = body['server'].strip()
        if isinstance(body.get('port'), (int, float)): cfg['port'] = int(body['port'])
        if isinstance(body.get('username'), str): cfg['username'] = body['username'].strip()
        if isinstance(body.get('password'), str) and body['password'].strip():
            cfg['password'] = body['password'].strip()
        if isinstance(body.get('alertEmail'), str) and body['alertEmail'].strip():
            cfg['alertEmail'] = body['alertEmail'].strip()

        log_event(db, 'ADMIN_SMTP_CONFIG_UPDATE', f"Configuración de alertas SMTP actualizada para {cfg.get('alertEmail')}")
        save_db(db)
        return {'success': True}

    elif action == 'adminTestSmtp':
        require_admin(db, body.get('token'), client_ip)
        send_emergency_email_async(
            db,
            "Prueba de Alerta de Emergencia Coolbet",
            f"Este es un correo de prueba enviado manualmente desde el Panel Admin de Coolbet Casino por el administrador.\nHora: {time.strftime('%Y-%m-%d %H:%M:%S')}"
        )
        return {'success': True}

    elif action == 'adminAdjustBalance':
        require_admin(db, body.get('token'), client_ip)
        target = find_user(db, body.get('targetEmail'))
        if not target: raise Exception('Usuario objetivo no encontrado.')
        try: amount = float(body.get('amount'))
        except (ValueError, TypeError): raise Exception('Monto inválido.')
        if amount < 0: raise Exception('Monto inválido.')

        old_bal = target['balance']
        target['balance'] = round(amount, 2)
        log_event(db, 'ADMIN_BALANCE_ADJUSTMENT', f"Saldo de {target['email']} fijado a ${target['balance']:.2f}")
        save_db(db)

        if target['balance'] > old_bal:
            diff = target['balance'] - old_bal
            send_automated_email(db, target['email'], 'recharge_approved', {
                'amount': diff,
                'newBalance': target['balance'],
                'method': 'Aprobación por Administración'
            })
        return {'success': True}

    elif action == 'adminSetRtp':
        require_admin(db, body.get('token'), client_ip)
        if isinstance(body.get('globalRtp'), (int, float)):
            db['rtpSettings']['globalRtp'] = float(body['globalRtp'])
        updates = body.get('gameRtps') or {}
        for k, v in updates.items():
            if k in db['rtpSettings']['gameRtps']:
                try: db['rtpSettings']['gameRtps'][k] = float(v)
                except ValueError: pass
        log_event(db, 'ADMIN_RTP_UPDATE', f"RTP global fijado a {db['rtpSettings']['globalRtp']*100:.0f}%")
        save_db(db)
        return {'success': True}

    elif action == 'adminSetVisibility':
        require_admin(db, body.get('token'), client_ip)
        game_id = str(body.get('gameId') or '')
        is_visible = bool(body.get('isVisible'))
        db['gameVisibility'][game_id] = is_visible
        log_event(db, 'ADMIN_GAME_VISIBILITY', f"Juego {game_id} {'habilitado' if is_visible else 'deshabilitado'}")
        save_db(db)
        return {'success': True}

    elif action == 'adminSetMpConfig':
        require_admin(db, body.get('token'), client_ip)
        if isinstance(body.get('publicKey'), str):
            db['mercadoPagoConfig']['publicKey'] = body['publicKey'].strip()
        if isinstance(body.get('accessToken'), str) and body['accessToken'].strip():
            db['mercadoPagoConfig']['accessToken'] = body['accessToken'].strip()
        log_event(db, 'ADMIN_MP_CONFIG_UPDATE', 'Credenciales de Mercado Pago actualizadas')
        save_db(db)
        return {'success': True}

    elif action == 'adminResetPlatform':
        require_admin(db, body.get('token'), client_ip)
        fresh = build_default_db()
        db['rtpSettings'] = fresh['rtpSettings']
        db['platformStats'] = fresh['platformStats']
        db['auditLogs'] = [{'timestamp': int(time.time() * 1000), 'action': 'ADMIN_RESET', 'details': 'Estadísticas y RTP reiniciados por administrador'}]
        for user in db['users']:
            user['balance'] = 0
            user['winnings'] = 0
            user['losses'] = 0
            user['history'] = []
            user['xp'] = 0
            user['vipLevel'] = 10 if user['role'] == 'admin' else 1
            user['failedLoginAttempts'] = 0
            user['lockedUntil'] = 0
        save_db(db)
        return {'success': True}

    elif action == 'savePayoutAccount':
        user = require_session(db, body.get('token'))
        bank = (body.get('bank') or '').strip()
        account_type = (body.get('accountType') or '').strip()
        account_number = (body.get('accountNumber') or '').strip()
        holder_name = (body.get('holderName') or '').strip()
        doc_number = (body.get('docNumber') or '').strip()

        if not bank or not account_number or not holder_name or not doc_number:
            raise Exception('Por favor completa todos los datos bancarios requeridos para retiros.')

        user['payoutAccount'] = {
            'bank': bank,
            'accountType': account_type,
            'accountNumber': account_number,
            'holderName': holder_name,
            'docNumber': doc_number,
            'updatedAt': int(time.time() * 1000)
        }
        log_event(db, 'PAYOUT_ACCOUNT_UPDATED', f"Datos bancarios de retiro guardados para {user['email']} ({bank} - {account_number})", user['email'])
        save_db(db)
        return {'success': True, 'user': public_user(user)}

    elif action in ('createPqr', 'submitPqr'):
        token = body.get('token')
        email_in = (body.get('email') or '').strip().lower()

        # RESTRICCIÓN ESTRICTA: Solo usuarios reales registrados pueden registrar PQR
        user = None
        if token and token in db.get('sessions', {}):
            sess_email = db['sessions'][token]['email']
            user = find_user(db, sess_email)
        if not user and email_in:
            user = find_user(db, email_in)

        if not user:
            raise Exception('Solo los usuarios reales registrados en la plataforma pueden enviar quejas y reclamos (PQR). Por favor inicia sesión.')

        name = body.get('name', '').strip() or user.get('fullName') or user['email'].split('@')[0]
        email = user['email'] # Garantizar el email real de la cuenta registrada
        category = body.get('category', 'General').strip()
        subject = body.get('subject', '').strip()
        message = body.get('message', '').strip()

        if not subject or not message:
            raise Exception('Por favor completa el asunto y el mensaje detallado de tu PQR.')

        pqr_id = f"PQR-{int(time.time())}"
        ticket = {
            'id': pqr_id,
            'timestamp': int(time.time() * 1000),
            'name': name,
            'email': email,
            'category': category,
            'subject': subject,
            'message': message,
            'status': 'PENDIENTE',
            'response': '',
            'isRealUser': True
        }
        db.setdefault('pqrTickets', []).insert(0, ticket)
        log_event(db, 'PQR_SUBMITTED', f"Nueva PQR [{pqr_id}] de usuario real registrado {email} ({category}: {subject})", user['email'])
        save_db(db)
        return {'success': True, 'ticketId': pqr_id}

    elif action == 'adminGetPqrs':
        require_admin(db, body.get('token'), client_ip)
        registered_emails = {u['email'].lower() for u in db['users'] if u.get('email')}
        filtered_pqrs = [t for t in db.get('pqrTickets', []) if t.get('email', '').lower() in registered_emails]
        return {'success': True, 'pqrTickets': filtered_pqrs}

    elif action == 'adminResolvePqr':
        require_admin(db, body.get('token'), client_ip)
        pqr_id = str(body.get('pqrId') or '')
        status = str(body.get('status') or 'RESUELTO')
        response = str(body.get('response') or '')

        found = False
        for t in db.get('pqrTickets', []):
            if t.get('id') == pqr_id:
                t['status'] = status
                t['response'] = response
                t['resolvedAt'] = int(time.time() * 1000)
                found = True
                break

        if not found:
            raise Exception('Ticket PQR no encontrado.')

        log_event(db, 'PQR_RESOLVED', f"PQR [{pqr_id}] actualizado a {status}")
        save_db(db)
        return {'success': True, 'pqrTickets': db.get('pqrTickets', [])}

    else:
        return {'success': False, 'error': 'Acción desconocida.'}

# ============================= HANDLER DE SOLICITUDES HTTP =============================

class AetherisRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        db = get_db()

        # Webhook de Mercado Pago vía GET
        if 'topic' in params and 'id' in params:
            payment_id = params['id'][0]
            check_and_process_mp_payment(db, payment_id)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
            return

        if parsed.path == '/api':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            response_data = build_public_config(db)
            self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
            return
        
        # Redirigir la raíz al index.html
        if parsed.path == '/':
            self.path = '/index.html'

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api':
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length).decode('utf-8')
            client_ip = self.client_address[0]
            
            try: body = json.loads(raw_body)
            except Exception: body = {}

            # Webhook de Mercado Pago vía POST
            if body and not body.get('action') and (body.get('type') or body.get('topic')):
                payment_id = (body.get('data') or {}).get('id') or body.get('resource')
                if payment_id:
                    db = get_db()
                    check_and_process_mp_payment(db, payment_id)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
                return

            try:
                result = handle_api_action(body, client_ip)
            except Exception as e:
                result = {'success': False, 'error': str(e)}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            return

        self.send_error(440, "Invalid POST path")

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), AetherisRequestHandler) as httpd:
        print(f"\n================================================================")
        print(f"🚀 SERVIDOR Y BASE DE DATOS LOCAL COOLBET EN EJECUCIÓN (v4)")
        print(f"📍 Servidor web local: http://localhost:{PORT}")
        print(f"📁 Base de datos local: {DB_FILE}")
        print(f"📧 Alertas de seguridad dirigidas a: {MASTER_ALERT_EMAIL}")
        print(f"================================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido correctamente.")

if __name__ == '__main__':
    run_server()
