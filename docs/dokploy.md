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
6. En Environment puedes dejar vacío todo el bloque de Namecheap. Para operar sin
   proveedor comercial basta con:

   ```env
   DOMAIN_PROVIDER=rdap
   DOMAIN_CACHE_TTL_SECONDS=86400
   DOMAIN_RATE_LIMIT_REQUESTS=20
   DOMAIN_RATE_LIMIT_WINDOW_SECONDS=60
   ```

   `DATABASE_URL=file:/data/brandforge.db` ya está fijada en Compose para impedir que
   una variable de desarrollo saque SQLite del volumen persistente.

7. Ejecuta el primer deploy.

El contenedor prepara el archivo SQLite, aplica `prisma migrate deploy` y luego inicia
Next.js. El healthcheck valida tanto el servidor como el acceso a SQLite mediante
`GET /api/health`.

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
- Migraciones: busca `sqlite.prepared` y `prisma migrate deploy` en los logs.
- Dominio sin respuesta: confirma servicio `app`, puerto `3000` y realiza un redeploy.
- Dominio gratuito: `traefik.me` es HTTP por defecto.
- Namecheap vacío: es correcto; RDAP seguirá funcionando como consulta auxiliar y
  devolverá `unknown` cuando no pueda confirmar el estado.
