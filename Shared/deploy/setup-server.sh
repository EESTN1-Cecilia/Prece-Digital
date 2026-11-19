#!/usr/bin/env bash
# Preparacion unica del servidor para desplegar Prece Digital.
# Uso (con el usuario que corre el runner, normalmente septimo):
#   bash setup-server.sh tu-dominio.com.ar
set -euo pipefail

DOMINIO="${1:?Falta el dominio. Uso: bash setup-server.sh tu-dominio.com.ar}"
USUARIO="$(whoami)"
APP_DIR=/opt/prece-digital
WEB_DIR=/var/www/prece-digital

echo ">> Instalando paquetes (nginx, rsync, nodejs)..."
sudo apt-get update
sudo apt-get install -y nginx rsync nodejs npm openssl

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node $NODE_MAJOR es muy viejo; el proyecto necesita Node 20 o mas." >&2
  exit 1
fi

echo ">> Creando carpetas..."
sudo mkdir -p "$APP_DIR/Backend" "$WEB_DIR"
sudo chown -R "$USUARIO": "$APP_DIR" "$WEB_DIR"

echo ">> Creando Backend/.env de produccion (si no existe)..."
ENV_FILE="$APP_DIR/Backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<ENVEOF
APP_ENV=production
API_PORT=3000
JWT_ACCESS_SECRET=$(openssl rand -hex 48)
JWT_REFRESH_SECRET=$(openssl rand -hex 48)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DB_CLIENT=memoria
CORS_ORIGINS=https://$DOMINIO
TRUST_PROXY=true
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
ENVEOF
  chmod 600 "$ENV_FILE"
  echo "   Creado. EDITALO y completa BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD."
else
  echo "   Ya existe, no se toca."
fi

echo ">> Servicio systemd prece-api..."
sudo tee /etc/systemd/system/prece-api.service >/dev/null <<UNIT
[Unit]
Description=Prece Digital API
After=network.target

[Service]
Type=simple
User=$USUARIO
WorkingDirectory=$APP_DIR/Backend
ExecStart=$(command -v node) src/server.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable prece-api

echo ">> Permiso para reiniciar solo ese servicio sin contrasena..."
SUDOERS=/etc/sudoers.d/prece-deploy
echo "$USUARIO ALL=(root) NOPASSWD: /usr/bin/systemctl restart prece-api" | sudo tee "$SUDOERS" >/dev/null
sudo chmod 440 "$SUDOERS"
sudo visudo -cf "$SUDOERS"

echo ">> Configurando Nginx para $DOMINIO..."
sudo tee /etc/nginx/sites-available/prece-digital >/dev/null <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMINIO;

    root $WEB_DIR;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/prece-digital /etc/nginx/sites-enabled/prece-digital
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

echo
echo "Listo. Falta:"
echo " 1) Editar $ENV_FILE (admin inicial)."
echo " 2) En GitHub: Settings > Secrets and variables > Actions > Variables > DOMINIO = $DOMINIO"
echo " 3) HTTPS: sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d $DOMINIO"
