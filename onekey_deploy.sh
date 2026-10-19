#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "   PREMIER / Aster Pro 一键自动部署脚本   "
echo "=========================================="

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_ROOT="/opt/aster-pro"
ENV_DIR="/etc/aster-pro"
ENV_FILE="${ENV_DIR}/backend.env"
SERVICE_FILE="/etc/systemd/system/aster-pro-backend.service"

# 0. 若当前目录下有未解压的一键部署包，自动解压
if [ ! -f "${BASE_DIR}/aster-pro-backend.jar" ] && [ -f "${BASE_DIR}/宝塔一键部署包_aster_pro.zip" ]; then
  echo "[*] 检测到未解压的部署包，正在自动解压..."
  if ! command -v unzip >/dev/null 2>&1; then
    apt-get update && apt-get install -y unzip || yum install -y unzip || true
  fi
  unzip -oq "${BASE_DIR}/宝塔一键部署包_aster_pro.zip" -d "${BASE_DIR}"
fi

# 1. 检测 Java 17 / 21
JAVA_BIN="$(command -v java || true)"
if [ -z "${JAVA_BIN}" ]; then
  for candidate in /usr/lib/jvm/java-21*/bin/java /usr/lib/jvm/java-17*/bin/java /www/server/java/jdk-*/bin/java; do
    if [ -x "${candidate}" ]; then
      JAVA_BIN="${candidate}"
      break
    fi
  done
fi
if [ -z "${JAVA_BIN}" ]; then
  echo "[!] 未检测到 Java，正在自动安装..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update && (apt-get install -y default-jdk || apt-get install -y openjdk-21-jdk || apt-get install -y openjdk-17-jdk)
  elif command -v yum >/dev/null 2>&1; then
    yum install -y java-17-openjdk
  fi
  JAVA_BIN="$(command -v java || echo /usr/bin/java)"
fi
echo "[✓] 使用 Java 路径: ${JAVA_BIN}"

# 2. 创建标准生产目录
mkdir -p "${TARGET_ROOT}/backend/storage/uploads"
mkdir -p "${TARGET_ROOT}/frontend-app"
mkdir -p "${TARGET_ROOT}/frontend-admin"
mkdir -p "${ENV_DIR}"

# 3. 拷贝后端 JAR、前端静态产物与图片资源
if [ -f "${BASE_DIR}/aster-pro-backend.jar" ]; then
  cp -f "${BASE_DIR}/aster-pro-backend.jar" "${TARGET_ROOT}/backend/aster-pro-backend.jar"
elif [ -f "${BASE_DIR}/backend/target/aster-pro-backend.jar" ]; then
  cp -f "${BASE_DIR}/backend/target/aster-pro-backend.jar" "${TARGET_ROOT}/backend/aster-pro-backend.jar"
fi

if [ -d "${BASE_DIR}/frontend-app" ]; then
  rm -rf "${TARGET_ROOT}/frontend-app/"*
  cp -rf "${BASE_DIR}/frontend-app/"* "${TARGET_ROOT}/frontend-app/"
elif [ -d "${BASE_DIR}/PREMIER-web/dist" ]; then
  rm -rf "${TARGET_ROOT}/frontend-app/"*
  cp -rf "${BASE_DIR}/PREMIER-web/dist/"* "${TARGET_ROOT}/frontend-app/"
fi

if [ -d "${BASE_DIR}/frontend-admin" ]; then
  rm -rf "${TARGET_ROOT}/frontend-admin/"*
  cp -rf "${BASE_DIR}/frontend-admin/"* "${TARGET_ROOT}/frontend-admin/"
elif [ -d "${BASE_DIR}/PREMIER-admin/dist" ]; then
  rm -rf "${TARGET_ROOT}/frontend-admin/"*
  cp -rf "${BASE_DIR}/PREMIER-admin/dist/"* "${TARGET_ROOT}/frontend-admin/"
fi

if [ -d "${BASE_DIR}/storage/uploads" ]; then
  cp -rn "${BASE_DIR}/storage/uploads/"* "${TARGET_ROOT}/backend/storage/uploads/" 2>/dev/null || true
fi

# 4. 自动检测数据库名称并写入环境变量配置
DB_USER="ajjjcozme"
DB_PASS="tBSNXmaMESn5znep"
DB_NAME="ajjjcozme"
if command -v mysql >/dev/null 2>&1; then
  if mysql -u"${DB_USER}" -p"${DB_PASS}" -e "USE ajjjcozme;" >/dev/null 2>&1; then
    DB_NAME="ajjjcozme"
  elif mysql -u"${DB_USER}" -p"${DB_PASS}" -e "USE aster_pro;" >/dev/null 2>&1; then
    DB_NAME="aster_pro"
  fi
fi

cat > "${ENV_FILE}" <<EOF
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=7777
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=${DB_NAME}
MYSQL_USERNAME=${DB_USER}
MYSQL_PASSWORD=${DB_PASS}
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0
UPLOAD_ROOT_DIR=/opt/aster-pro/backend/storage/uploads
EOF
chmod 600 "${ENV_FILE}"
echo "[✓] 已更新生产数据库配置 (${DB_USER} -> 库 ${DB_NAME}): ${ENV_FILE}"

# 5. 设置权限
if id "www" >/dev/null 2>&1; then
  chown -R www:www "${TARGET_ROOT}"
fi

# 6. 写入 systemd 守护进程服务
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Aster Pro Exchange Backend Service
After=network.target mysql.service redis.service

[Service]
Type=simple
WorkingDirectory=${TARGET_ROOT}/backend
EnvironmentFile=${ENV_FILE}
ExecStart=${JAVA_BIN} -Xms512m -Xmx1536m -jar ${TARGET_ROOT}/backend/aster-pro-backend.jar --spring.profiles.active=prod
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable aster-pro-backend
systemctl restart aster-pro-backend

echo "=========================================="
echo "[✓] 部署完成！正在检查后端服务状态..."
sleep 4
systemctl status aster-pro-backend --no-pager || true
echo "=========================================="
