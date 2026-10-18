# Aster Pro 部署说明

目标结构：

```text
/opt/aster-pro/backend/aster-pro-backend.jar
/opt/aster-pro/frontend-app/
/opt/aster-pro/frontend-admin/
/etc/aster-pro/backend.env
/etc/systemd/system/aster-pro-backend.service
/etc/nginx/conf.d/aster-pro.conf
```

## 1. 服务器依赖

- JDK 17
- Maven 3.8+
- Node.js 18+
- MySQL 8.0
- Redis 7
- Nginx

## 2. 初始化数据库

```bash
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS aster_pro DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -uroot -p aster_pro < sql/init.sql
mysql -uroot -p aster_pro < sql/seed.sql
```

默认后台账号：

默认后台账号已移除。部署后请通过受控脚本或后台用户管理创建管理员，并使用强密码。

## 3. 构建

```bash
chmod +x deploy/scripts/*.sh
./deploy/scripts/build.sh
```

如果服务器默认 `node` 不是 18+，指定 Node 路径：

```bash
NODE_HOME=$HOME/.nvm/versions/node/v18.20.8 ./deploy/scripts/build.sh
```

构建产物：

- `backend/target/aster-pro-backend.jar`
- `frontend-app/dist`
- `frontend-admin/dist`

## 4. 部署

```bash
DEST_DIR=/opt/aster-pro ./deploy/scripts/deploy-local.sh
```

编辑生产环境变量：

```bash
sudo vim /etc/aster-pro/backend.env
```

至少修改：

- `MYSQL_USERNAME`
- `MYSQL_PASSWORD`
- `ALLTICK_TOKEN`

## 5. 启动后端

```bash
sudo systemctl enable --now aster-pro-backend
sudo systemctl status aster-pro-backend
journalctl -u aster-pro-backend -f
```

健康检查：

```bash
curl http://127.0.0.1:7777/api/quote/public/tick?symbol=BTCUSDT
```

## 6. Nginx

```bash
sudo cp deploy/nginx/aster-pro.conf /etc/nginx/conf.d/aster-pro.conf
sudo nginx -t
sudo systemctl reload nginx
```

访问：

- 用户端：`http://your-domain/`
- 管理端：`http://your-domain/admin/`
- REST API：`http://your-domain/api/...`
- WebSocket：`ws(s)://your-domain/api/ws/quote`

后台前端构建时会使用 `VITE_BASE_PATH=/admin/`，因此静态资源路径和 React Router 都按 `/admin/` 子路径工作。

## 7. 常用运维命令

```bash
sudo systemctl restart aster-pro-backend
sudo systemctl stop aster-pro-backend
journalctl -u aster-pro-backend -n 200 --no-pager
sudo tail -f /var/log/nginx/aster-pro.error.log
```

## 8. 上线前检查

- 修改后台默认密码
- 确认 `application-prod.yml` 不写死数据库密码或 AllTick token
- 确认 `/etc/aster-pro/backend.env` 权限仅服务用户可读
- 确认 Nginx 开启 HTTPS
- 确认 Redis 不暴露公网
- 确认 MySQL 仅内网监听或防火墙限制
