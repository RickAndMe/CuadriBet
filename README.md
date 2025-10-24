# CuadriBET - Sistema de Apuestas entre Amigos

Aplicación web completa para gestionar apuestas democráticas entre grupos de amigos con notificaciones automáticas por email.

## 🎯 Características Principales

- ✅ **Registro y Autenticación** con JWT
- ✅ **Gestión de Grupos** con códigos de invitación
- ✅ **Sistema de Apuestas** con votación democrática
- ✅ **Notificaciones por Email** automáticas (recordatorios, resultados)
- ✅ **Dashboard Interactivo** con estadísticas
- ✅ **Resolución de Apuestas** por el creador
- ✅ **Scheduler Automático** cada hora para verificar fechas límite
- ✅ **UI Moderna** con Tailwind CSS
- ✅ **Persistencia Completa de Datos** en local y producción

## 🗄️ Persistencia de Datos

### **En Desarrollo/Local:**
- ✅ **SQLite persistente** como archivo `bets.db`
- ✅ **Datos conservados** entre reinicios del servidor
- ✅ **Archivo localizado** en `backend/bets.db`

### **En Producción:**
- ✅ **Configuraciones para PostgreSQL/MySQL** según plataforma
- ✅ **Variables de entorno** para conexión segura
- ✅ **Soporte para múltiples proveedores** de BD

### **Backups y Recuperación:**

```bash
# Crear backup instantáneo
npm run backup-db backup

# Listar backups disponibles
npm run backup-db list

# Restaurar desde backup específico
npm run backup-db restore 1

# Información completa del sistema
npm run backup-db info
```

## 🛠️ Tecnologías

### Backend
- **Node.js + Express** - API REST
- **SQLite** - Base de datos persistente
- **JWT** - Autenticación segura
- **bcrypt** - Hash de contraseñas
- **Nodemailer** - Envío de emails
- **Node-cron** - Scheduler automático

### Frontend
- **React 18 + TypeScript** - Componentes tipados
- **React Router** - Navegación SPA
- **Axios** - Cliente HTTP
- **Tailwind CSS** - UI moderna
- **date-fns** - Manejo de fechas

## 🚀 Inicio Rápido

### Requisitos
- Node.js 16+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd betapp

# Backend
cd backend
npm install
npm run dev

# Frontend (nueva terminal)
cd ../frontend
npm install
npm start
```

### Configuración

Copiar `.env` del backend y configurar emails:
```bash
JWT_SECRET=tu_clave_jwt_segura
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_gmail
PORT=8000
```

## 📱 Uso de la Aplicación

### 1. Registrar Usuario
- Ve a `http://localhost:3001`
- Crea cuenta con nombre, email y contraseña

### 2. Crear Grupo
- En "Grupos" del menú
- Crea grupo con nombre → se genera código único

### 3. Invitar Amigos
- Comparte el código de invitación
- Amigos se unen usando el código

### 4. Crear Apuesta
- Dentro del grupo: "Crear Apuesta"
- Define descripción, fecha límite y premio
- Ejemplo: "Madrid gana La Liga" - Vence 30/06/2025 - Premió: "5€ por cabeza"

### 5. Votar
- Miembros votan "A favor" o "En contra"
- Sistema registra votos en tiempo real

### 6. Resolver y Notificar
- Creador marca si se cumplió o no
- Sistema envía emails automáticos con resultados
- Ganadores reciben confirmación

## 📧 Sistema de Notificaciones

### Emails Automáticos:
- **🔔 Recordatorio 24h**: Antes de que expire una apuesta
- **⚠️ Expiración**: Cuando pasa la fecha límite (nueva apuesta)
- **🏆 Resultados**: Con ganadores/perdedores y premios

### Configuración Email:
```bash
# Para Gmail, usar "App Password"
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
```

## 🏗️ Arquitectura

```
📁 betapp/
├── 📁 backend/                 # API REST
│   ├── 📄 server.js           # Servidor principal
│   ├── 📄 database.js         # Config BD SQLite
│   ├── 📁 routes/             # Endpoints API
│   ├── 📁 emailService.js     # Envío emails
│   └── 📄 .env               # Configuración
├── 📁 frontend/                # React App
│   ├── 📁 src/components/     # Componentes React
│   ├── 📁 src/context/        # Estado global
│   ├── 📁 src/api/           # Cliente API
│   └── 📄 package.json       # Dependencias
└── 📄 README.md               # Este archivo
```

## 🔄 Flujo de Datos API

### Autenticación
```
POST /api/auth/register → {user, token}
POST /api/auth/login → {user, token}
GET /api/auth/profile → Usuario actual
```

### Grupos
```
GET /api/groups → Lista grupos del usuario
POST /api/groups → Crear grupo
POST /api/groups/join → Unirse con código
GET /api/groups/:id → Detalles grupo
DELETE /api/groups/:id → Eliminar grupo
```

### Apuestas
```
POST /api/bets → Crear apuesta
POST /api/bets/:id/vote → Votar
GET /api/bets/group/:groupId → Apuestas del grupo
GET /api/bets/:id → Detalles apuesta
POST /api/bets/:id/resolve → Resolver apuesta
```

## 🚢 Deployment Producción

### Opción 1: Heroku (Recomendado)
```bash
# Instalar Heroku CLI
brew install heroku
heroku login

# Backend
git init
git add .
heroku create betapp-api
heroku config:set JWT_SECRET=tu_clave_segura
heroku config:set EMAIL_USER=tu_email
heroku config:set EMAIL_PASS=tu_app_password
git push heroku main

# Frontend (Vercel/Static)
vercel --prod
```

### Opción 2: VPS Completo
```bash
# Ubuntu/Debian
sudo apt install nodejs sqlite3 nginx

# PM2 para backend
npm install -g pm2
pm2 start server.js --name betapp

# Nginx proxy
# SSL con Let's Encrypt
```

## 🐛 Debugging

### Ver Logs Backend:
```bash
# Consola del servidor
# Los logs aparecen en tiempo real
```

### Ver Logs Frontend:
```bash
# Abrir DevTools (F12) → Console
# Los errors aparecerán con stack traces
```

### Database Debug:
```bash
cd backend
sqlite3 bets.db
.schema      # Ver estructura tablas
SELECT * FROM users;    # Ver usuarios
SELECT * FROM groups;   # Ver grupos
SELECT * FROM bets;     # Ver apuestas
```

## 📝 Estado Actual

✅ **Backend**: API completa, BD, emails, scheduler
✅ **Frontend**: UI completa, navegación, estados
✅ **Testing**: Funcional end-to-end básico verificado
⚠️ **Deployment**: Necesita configurar emails para producción

## 🎉 Próximos pasos

1. **Configurar emails reales** para notificaciones
2. **Deploy a Heroku/Vercel** para producción
3. **Testing exhaustivo** con múltiples usuarios
4. **Features adicionales**: Fotos de perfil, estadísticas avanzadas

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea rama feature (`git checkout -b feature/nueva-funcion`)
3. Commit cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcion`)
5. Abre Pull Request

## 📄 Licencia

MIT License - ver LICENSE para más detalles.

---

**¡CuadriBET está listo para usar! 🚀**

Creado con ❤️ para gestionar apuestas democráticas entre amigos.
