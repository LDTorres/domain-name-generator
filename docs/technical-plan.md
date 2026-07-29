# Plan técnico

## Objetivo de la primera versión

Entregar una aplicación web local-first que convierta una configuración validada en al
menos 1.000 candidatos deterministas, filtre los inválidos, puntúe cada candidato de
forma explicable y muestre los 100 mejores. La consulta de dominios es siempre bajo
demanda. Favoritos, comparación y exportación persisten en SQLite.

## Etapas

1. **Base del proyecto**: Next.js App Router, TypeScript estricto, Tailwind, componentes
   compatibles con shadcn/ui, Prisma, SQLite, Zod, Vitest y pnpm.
2. **Motor**: PRNG con seed, normalización de entradas y diez estrategias desacopladas.
3. **Calidad**: reglas fonéticas, lista de términos problemáticos, deduplicación,
   puntuación explicable y selección estable.
4. **Persistencia**: proyectos, sesiones, candidatos, puntuaciones, dominios, favoritos,
   riesgo de marca y términos bloqueados.
5. **Producto**: generador, resultados, filtros, favoritos y estados.
6. **Dominios**: contrato común, RDAP, DNS secundario, Namecheap opcional, caché y rate
   limiting.
7. **Decisión**: comparación de 2 a 5 nombres y exportación CSV, JSON y Markdown.
8. **Cierre**: tests, seed, migración, Docker, documentación y validación de producción.

## Flujos principales

### Generación

1. La UI envía una configuración a `POST /api/generate`.
2. Zod aplica defaults y valida límites.
3. El servicio crea o reutiliza el proyecto y registra una sesión.
4. El motor expande raíces relevantes, ejecuta estrategias con el PRNG y produce un
   conjunto sobredimensionado.
5. El pipeline normaliza, descarta fallos duros, anota riesgos blandos, puntúa y
   deduplica.
6. Se guardan los mejores candidatos y se devuelven los 100 primeros.

### Dominio

1. El usuario solicita explícitamente una comprobación.
2. El rate limiter limita por cliente y ventana.
3. La caché devuelve resultados recientes.
4. El proveedor configurado consulta el estado. RDAP puede confirmar registro; DNS
   aporta una señal secundaria, pero nunca demuestra disponibilidad.
5. Sin credenciales o con una respuesta ambigua, el estado es `unknown` o el proveedor
   se presenta como `not_configured`.

### Favoritos y comparación

1. Favoritos guarda estado, comentario y puntuación manual.
2. Comparación acepta entre 2 y 5 candidatos persistidos.
3. Exportación serializa los candidatos seleccionados sin depender del navegador.

## Criterios de finalización

- La misma configuración y seed producen el mismo orden y los mismos nombres.
- El motor genera al menos 1.000 propuestas antes de seleccionar los mejores.
- Ningún candidato aceptado contiene números, guiones o patrones prohibidos.
- Cada puntuación incluye las once dimensiones solicitadas y explicaciones.
- Las consultas externas nunca se ejecutan al generar candidatos.
- Las integraciones ausentes son visibles y no simulan éxito.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, Prisma y `pnpm build` terminan sin errores.
