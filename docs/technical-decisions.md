# Decisiones técnicas

## TD-001 — App Router con route handlers

Se usan route handlers para conservar una API explícita y reutilizable. Las mutaciones
de UI no dependen de server actions privadas.

## TD-002 — Motor funcional y sin infraestructura

El motor es una librería pura. Prisma, red, logs y caché viven fuera. Esto reduce el
costo de tests y prepara una extracción posterior.

## TD-003 — JSON versionado como fuente lingüística

Raíces, fragmentos seguros, perfiles fonéticos, prefijos, sufijos, listas problemáticas,
léxico genérico, patrones y presets se distribuyen en JSON. Cada fragmento conserva
significado, idioma, categorías, posición y terminaciones compatibles. Prisma contiene
una proyección administrable, no es requisito para ejecutar el motor.

## TD-004 — SQLite local y Prisma

SQLite permite una experiencia de desarrollo sin servicios externos. Los campos
estructurados complejos se guardan como JSON serializado porque SQLite no ofrece el
tipo `Json` de Prisma.

## TD-005 — shadcn/ui como código del proyecto

Los componentes base siguen las convenciones de shadcn/ui y viven en
`src/components/ui`; no se incorpora una dependencia runtime opaca para ellos.

## TD-006 — Integraciones explícitas y cadena autoritativa

Hostinger, Cloudflare, Porkbun y Namecheap solo se habilitan con credenciales
completas. La cadena conserva la primera respuesta definitiva y registra todos los
proveedores intentados. RDAP puede confirmar `registered` o devolver `unknown`; DNS
nunca devuelve `available`. Los errores se persisten como estados y mensajes visibles.

## TD-007 — Caché persistida y rate limiting en memoria

La caché de dominios se guarda en SQLite con TTL configurable. El rate limiter de esta
versión es por proceso, suficiente para desarrollo y despliegue de una sola instancia;
un despliegue distribuido deberá sustituirlo por Redis u otro almacén compartido.

## TD-008 — Sin IA en el camino crítico

`AIConfigurationOptimizer` y `AINameEvaluator` son contratos opcionales distintos.
OpenRouter solo optimiza una configuración validada a partir del brief. Generación,
filtrado y puntuación funcionan sin IA.

## TD-009 — Puntuación de dominio neutral hasta consultar

No se infiere disponibilidad durante la generación. `domainAvailability` comienza en
50 (`unknown`) y puede recalcularse al incorporar comprobaciones explícitas.

## TD-010 — Configuración progresiva

Los perfiles locales deterministas traducen sonoridad y estilo a la configuración
completa. La edición avanzada cambia el origen a `custom`; cualquier cambio al brief
invalida la optimización anterior y recalcula el perfil local.

## TD-011 — Protección HTTP dentro de Next.js

La instalación Compose se protege con Basic Auth en `proxy.ts`, excepto `/api/health`.
En producción, la presencia de claves externas sin credenciales de acceso produce un
estado de configuración inválida y deniega las solicitudes.

## TD-012 — Calidad antes que volumen visible

La cantidad solicitada define el mínimo de exploración, no una obligación de mostrar
resultados mediocres. El motor genera un pool interno mayor, aplica umbrales de
pronunciación, escritura, sonoridad, relación conceptual y riesgo negativo, y después
diversifica los 100 visibles. La versión del motor cambia cuando estas reglas alteran
el resultado reproducible.
