# Decisiones técnicas

## TD-001 — App Router con route handlers

Se usan route handlers para conservar una API explícita y reutilizable. Las mutaciones
de UI no dependen de server actions privadas.

## TD-002 — Motor funcional y sin infraestructura

El motor es una librería pura. Prisma, red, logs y caché viven fuera. Esto reduce el
costo de tests y prepara una extracción posterior.

## TD-003 — JSON versionado como fuente lingüística

Raíces, prefijos, sufijos, listas problemáticas, patrones y presets se distribuyen en
JSON. Prisma contiene una proyección administrable, no es requisito para ejecutar el
motor.

## TD-004 — SQLite local y Prisma

SQLite permite una experiencia de desarrollo sin servicios externos. Los campos
estructurados complejos se guardan como JSON serializado porque SQLite no ofrece el
tipo `Json` de Prisma.

## TD-005 — shadcn/ui como código del proyecto

Los componentes base siguen las convenciones de shadcn/ui y viven en
`src/components/ui`; no se incorpora una dependencia runtime opaca para ellos.

## TD-006 — Integraciones explícitas

Namecheap solo se habilita con credenciales completas. RDAP puede confirmar
`registered` o devolver `unknown`; DNS nunca devuelve `available`. Los errores se
persisten como estados y mensajes visibles.

## TD-007 — Caché persistida y rate limiting en memoria

La caché de dominios se guarda en SQLite con TTL configurable. El rate limiter de esta
versión es por proceso, suficiente para desarrollo y despliegue de una sola instancia;
un despliegue distribuido deberá sustituirlo por Redis u otro almacén compartido.

## TD-008 — Sin IA en el camino crítico

`AINameEvaluator` es un contrato opcional. La implementación por defecto informa
`not_configured`; generación, filtrado y puntuación funcionan sin IA.

## TD-009 — Puntuación de dominio neutral hasta consultar

No se infiere disponibilidad durante la generación. `domainAvailability` comienza en
50 (`unknown`) y puede recalcularse al incorporar comprobaciones explícitas.
