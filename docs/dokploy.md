# Despliegue en Dokploy

La configuración recomendada usa una aplicación de tipo **Docker Compose** y la
gestión nativa de dominios de Dokploy. No hacen falta etiquetas Traefik manuales:
Dokploy las agrega durante el despliegue.

## Crear la aplicación

1. Crea un proyecto en Dokploy.
2. Agrega un servicio de tipo **Compose**.
3. Selecciona **Docker Compose**, no Docker Stack.
4. Conecta el repositorio y la rama.
5. Usa `./docker-compose.yml` como Compose Path.
6. En **Environment** puedes operar completamente sin claves externas:

   ```env
   DOMAIN_PROVIDER_ORDER=hostinger,cloudflare,porkbun,namecheap,rdap
   DOMAIN_CACHE_TTL_SECONDS=86400
   DOMAIN_RATE_LIMIT_REQUESTS=10
   DOMAIN_RATE_LIMIT_WINDOW_SECONDS=60
   AI_RATE_LIMIT_REQUESTS=5
   AI_RATE_LIMIT_WINDOW_SECONDS=60
   ```

   `DATABASE_URL=file:/data/brandforge.db` ya está fijada en Compose para impedir que
   una variable de desarrollo saque SQLite del volumen persistente.

7. Para proteger la aplicación, agrega:

   ```env
   APP_ACCESS_USERNAME=tu_usuario
   APP_ACCESS_PASSWORD=una_clave_larga_y_unica
   ```

   Si configuras Hostinger, Cloudflare, Porkbun, Namecheap u OpenRouter en producción,
   estas dos variables pasan a ser obligatorias y la app falla de forma cerrada si
   falta alguna.

8. Agrega solamente las integraciones que usarás. Por ejemplo:

   ```env
   HOSTINGER_API_TOKEN=
   OPENROUTER_API_KEY=
   OPENROUTER_MODEL=openrouter/free
   OPENROUTER_LOG_PAYLOADS=false
   ```

   Mantén los secretos únicamente en Environment de Dokploy; no los escribas en el
   Compose ni uses prefijos `NEXT_PUBLIC_`.

   Para depurar temporalmente lo enviado a OpenRouter, cambia
   `OPENROUTER_LOG_PAYLOADS=true`, vuelve a desplegar y busca el evento
   `openrouter.request` en los logs. Después vuelve a `false`: el payload contiene la
   descripción escrita por el usuario, aunque nunca incluye la API key.

9. Ejecuta el primer deploy.

El contenedor prepara el archivo SQLite, aplica `prisma migrate deploy` y luego inicia
Next.js. El healthcheck valida tanto el servidor como el acceso a SQLite mediante
`GET /api/health`.

El build usa la red del host únicamente mientras instala dependencias y compila. El
contenedor final sigue conectado a la red administrada por Dokploy, por lo que Domains
y Traefik continúan funcionando normalmente.

## Asignar el dominio

En la pestaña **Domains** de la aplicación Compose:

1. Pulsa **Create Domain** o **Add Domain**.
2. Selecciona el servicio `app`.
3. Usa `/` como Path.
4. Usa `3000` como Container Port.
5. Para un dominio gratuito generado por Dokploy, usa el botón del dado de
   `traefik.me`, deja HTTPS desactivado y Certificate en `None`.
6. Guarda y vuelve a desplegar la aplicación.

Los cambios de dominio en una aplicación Compose requieren un redeploy para que
Traefik lea las etiquetas nuevas.

## Persistencia y backups

SQLite vive en el volumen nombrado `brandforge-data`, montado en `/data`. No cambies
`DATABASE_URL` a una ruta dentro del filesystem efímero del contenedor.

Dokploy puede realizar backups de volúmenes nombrados desde **Volume Backups**. Haz
backup del volumen que Dokploy crea para `brandforge-data`; el nombre real puede llevar
el prefijo del proyecto Compose.

No escales este servicio a más de una réplica mientras use SQLite y rate limiting en
memoria. Para múltiples réplicas, migra la base a PostgreSQL y el rate limiter a un
almacén compartido.

## Diagnóstico

- Estado del contenedor: revisa que pase a `healthy`.
- Endpoint: `https://tu-dominio/api/health`.
- El healthcheck queda excluido de la autenticación HTTP básica.
- Migraciones: busca `sqlite.prepared` y `prisma migrate deploy` en los logs.
- Dominio sin respuesta: confirma servicio `app`, puerto `3000` y realiza un redeploy.
- Dominio gratuito: `traefik.me` es HTTP por defecto.
- Todos los proveedores comerciales vacíos: es correcto; RDAP seguirá como auxiliar y
  devolverá `unknown` cuando no pueda confirmar registro.
- HTTP `503` con claves externas: configura ambos valores `APP_ACCESS_*` y vuelve a
  desplegar.
- `EAI_AGAIN registry.npmjs.org`: es un fallo de DNS/red del builder, no del lockfile.
  Compose usa la red del host durante el build; además, el Dockerfile prepara pnpm con
  hasta cinco intentos y configura reintentos para las dependencias. El runtime no usa
  `network_mode: host`, porque debe permanecer accesible para Traefik.
