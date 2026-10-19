#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAGE_DIR="/tmp/aster_pro_release_stage"
OUT_ZIP="${ROOT_DIR}/宝塔一键部署包_aster_pro.zip"

echo "[1/4] 清理临时目录..."
rm -rf "${STAGE_DIR}"
mkdir -p "${STAGE_DIR}/frontend-app" "${STAGE_DIR}/frontend-admin" "${STAGE_DIR}/storage/uploads"

echo "[2/4] 收集后端 JAR 与前后端混淆编译产物..."
cp -f "${ROOT_DIR}/backend/target/aster-pro-backend.jar" "${STAGE_DIR}/aster-pro-backend.jar"
cp -rf "${ROOT_DIR}/PREMIER-web/dist/"* "${STAGE_DIR}/frontend-app/"
cp -rf "${ROOT_DIR}/PREMIER-admin/dist/"* "${STAGE_DIR}/frontend-admin/"
cp -rf "${ROOT_DIR}/storage/uploads/"* "${STAGE_DIR}/storage/uploads/"
cp -f "${ROOT_DIR}/onekey_deploy.sh" "${STAGE_DIR}/onekey_deploy.sh"
chmod +x "${STAGE_DIR}/onekey_deploy.sh"

echo "[3/4] 正在生成一键部署压缩包: ${OUT_ZIP} ..."
rm -f "${OUT_ZIP}"
(cd "${STAGE_DIR}" && zip -rq "${OUT_ZIP}" .)
rm -rf "${STAGE_DIR}"

echo "[4/4] 打包成功！文件位置: ${OUT_ZIP}"
ls -lh "${OUT_ZIP}"
