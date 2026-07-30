# Brandforge

Generador inteligente y determinista de nombres de marca y dominios. Combina raíces de
ocho fuentes lingüísticas, diez estrategias, reglas fonéticas, puntuación explicable,
riesgo local de marca y consultas de dominio bajo demanda.

La aplicación funciona sin IA y sin proveedor comercial de dominios. Las integraciones
ausentes se muestran como no configuradas o con estado desconocido; nunca se simula
disponibilidad.

## Stack

- Next.js App Router y TypeScript estricto
- Tailwind CSS y componentes shadcn/ui en el repositorio
- Prisma con SQLite
- Zod, Vitest y pnpm

## Inicio rápido

Requisitos: Node.js 22+ y pnpm 10+. Se recomienda Node.js 22 LTS y el contenedor lo
utiliza.

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Comandos

```bash
pnpm dev          # desarrollo
pnpm test         # tests unitarios
pnpm typecheck    # TypeScript estricto
pnpm lint         # ESLint
pnpm build        # build de producción
pnpm db:seed      # raíces, blacklist y proyecto inicial
pnpm db:studio    # inspección de SQLite
```

## Arquitectura

```text
src/app + src/features       presentación y route handlers
          │
src/server                   casos de uso, persistencia, rate limiting
          │
src/lib/naming-engine        dominio puro y extraíble
src/lib/domain-providers     integraciones de dominio
src/lib/brand-risk           evaluación local orientativa
          │
src/data                     datasets JSON versionados
```

El motor no importa React, Next.js, Prisma ni red. Consulta
[`docs/engine-architecture.md`](docs/engine-architecture.md) y el resto de decisiones
en [`docs/`](docs/).

## Generación y reproducibilidad

La pestaña **Básico** pide proyecto, industria, descripción, sonoridad y estilo. Quince
perfiles locales (3 sonoridades × 5 estilos) convierten ese brief en la configuración
completa. La pestaña **Avanzado** permite editar cada parámetro; al hacerlo la sesión
queda marcada como `custom`.

La entrada completa se valida con Zod. Todas las decisiones aleatorias usan un PRNG
con seed; la misma configuración, versión de motor y seed producen los mismos
candidatos y orden. Una sesión guarda además el origen `local`, `openrouter` o
`custom`, el modelo y la versión del prompt cuando correspondan.

El motor explora tres veces la cantidad solicitada (3.000 borradores internos con la
configuración predeterminada), aplica fallos duros, deduplica y solo expone candidatos
que superan mínimos de pronunciación, escritura, sonoridad y relación conceptual.
Después diversifica por raíz y estrategia y devuelve hasta 100 resultados. La
disponibilidad de dominio parte en 50/100 (`unknown`) y no dispara red.

## Dominios

Estados: `available`, `registered`, `premium`, `unknown`, `error`.

- La cadena predeterminada es
  **[Hostinger](https://developers.hostinger.com/) →
  [Cloudflare](https://developers.cloudflare.com/registrar/registrar-api/) →
  [Porkbun](https://porkbun.com/api/json/v3/documentation) → Namecheap → RDAP**.
- Los proveedores comerciales sin credenciales se omiten. Un resultado definitivo no
  se contradice; solo `unknown`, `error`, rate limit o TLD no soportado avanza al
  proveedor siguiente.
- Hostinger agrupa varios TLD de una misma marca por llamada. Cloudflare consulta hasta
  20 dominios por batch. Porkbun y Namecheap se habilitan con sus claves opcionales.
- RDAP solo confirma `registered`; un 404 permanece `unknown`. DNS es señal secundaria
  y nunca demuestra disponibilidad.

Los resultados se cachean en SQLite con `DOMAIN_CACHE_TTL_SECONDS`. El rate limiting
por proceso se controla con `DOMAIN_RATE_LIMIT_REQUESTS` y
`DOMAIN_RATE_LIMIT_WINDOW_SECONDS`. Para múltiples réplicas debe migrarse a un almacén
compartido como Redis.

## OpenRouter opcional

`OPENROUTER_API_KEY` habilita **Optimizar con IA**. Se usa
[`openrouter/free`](https://openrouter.ai/docs/guides/routing/routers/free-router) por
defecto y no existe fallback a modelos pagos. Solo se envía el brief básico; la IA
ajusta parámetros con
[salida estructurada](https://openrouter.ai/docs/guides/features/structured-outputs)
validada por Zod, pero no genera los candidatos ni controla seed, cantidad, dominios,
blacklist o puntuación.

Sin clave, timeout, 401, 429, 503 o JSON inválido, la configuración local se conserva y
el error se muestra. El rate limit independiente usa `AI_RATE_LIMIT_REQUESTS` y
`AI_RATE_LIMIT_WINDOW_SECONDS`.

Para depurar el payload exacto enviado, configura
`OPENROUTER_LOG_PAYLOADS=true`. Se escribe un evento estructurado
`openrouter.request` sin API key ni header `Authorization`. El log sí contiene el brief
del usuario, incluida la descripción, por lo que debe mantenerse desactivado cuando no
sea necesario.

## Protección de acceso

`APP_ACCESS_USERNAME` y `APP_ACCESS_PASSWORD` habilitan autenticación HTTP básica para
toda la aplicación excepto `GET /api/health`. En producción, si existe cualquier clave
externa y falta una de esas credenciales, el proxy responde `503` y cierra la
instalación. No coloques secretos en variables `NEXT_PUBLIC_*`.

## Riesgo de marca

La evaluación local busca coincidencias exactas, distancia de Levenshtein y una clave
fonética contra una lista de marcas conocidas. No es una búsqueda jurídica y no afirma
disponibilidad. La UI y las exportaciones incluyen la advertencia de realizar una
revisión profesional por jurisdicción.

## API

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/configuration/optimize` | Optimizar el brief con OpenRouter |
| `POST` | `/api/projects` | Crear proyecto |
| `POST` | `/api/generate` | Generar y persistir candidatos |
| `PUT` | `/api/favorites` | Guardar notas, estado y puntuación manual |
| `PATCH` | `/api/candidates/:id` | Cambiar estado/descartar |
| `POST` | `/api/variations` | Generar variaciones con nuevo seed |
| `POST` | `/api/domains/check` | Consultar dominios bajo demanda |
| `POST` | `/api/compare` | Cargar entre 2 y 5 candidatos |
| `POST` | `/api/export` | Exportar CSV, JSON o Markdown |

## Dataset

La distribución inicial contiene 160 raíces (20 por fuente), más de 60 fragmentos
seguros y trazables, perfiles fonéticos para español, inglés y combinación bilingüe,
52 sufijos, 32 prefijos, más de 100 palabras genéricas, 110 términos problemáticos, 50
patrones fonéticos y 10 presets. Las raíces incluyen forma original, normalizada,
romanizada, significado, idioma, categorías, pronunciación, sentimiento y uso como
prefijo/sufijo. Los fragmentos definen posición, sonoridades compatibles y
terminaciones recomendadas; extender ese catálogo mejora calidad sin hardcodear
nombres finales.

## Docker

Después de crear `pnpm-lock.yaml`:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

El contenedor usa un volumen SQLite en `/data`. Su comando de arranque prepara el
archivo vacío cuando hace falta, ejecuta explícitamente `prisma migrate deploy` y luego
inicia el servidor standalone; todos los pasos quedan visibles en los logs.

El archivo principal [`docker-compose.yml`](docker-compose.yml) no publica puertos al
host y está preparado para routing interno mediante Dokploy/Traefik. El override
`docker-compose.local.yml` publica `3000:3000` solo para uso local.

Consulta [`docs/dokploy.md`](docs/dokploy.md) para crear la aplicación Compose, asignar
el servicio `app` al puerto interno `3000`, generar el dominio y configurar backups del
volumen SQLite.

## Límites conocidos

- SQLite y el rate limiter en memoria están orientados a desarrollo/una instancia.
- La pronunciación y las connotaciones son aproximaciones heurísticas.
- RDAP y DNS no sustituyen la verificación con un registrador.
- El riesgo de marca es orientación técnica, no asesoramiento legal.
