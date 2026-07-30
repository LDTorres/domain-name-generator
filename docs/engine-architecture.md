# Arquitectura del motor

## Límite del módulo

`src/lib/naming-engine` es TypeScript puro. No importa React, Next.js, Prisma, APIs
externas ni variables de entorno. Recibe datos, configuración y seed; devuelve
candidatos evaluados. Ese límite permite extraerlo después como paquete o servicio.

```text
GenerationConfig (Zod)
        │
        ▼
context builder ── roots/safe fragments/sound profiles
        │
        ▼
strategies[] ── seeded PRNG ── raw candidates
        │
        ▼
normalization ── profile-aware phonetic validation
        │
        ▼
negative-term + brand-risk annotations
        │
        ▼
quality floor ── explainable scoring ── diversity reranking
        │
        ▼
GenerationResult { generatedCount, rejectedCount, candidates }
```

## Estrategias

Cada estrategia implementa `GenerationStrategy` y declara un identificador estable.
Las estrategias no deciden la calidad final:

1. keyword + sufijo
2. prefijo + keyword
3. raíz + raíz
4. fragmento inicial + fragmento final
5. fusión por sílabas
6. eliminación de letras repetidas
7. sustitución fonética
8. variaciones de vocales
9. invención mediante patrones C/V
10. nombre conceptual indirecto

## Determinismo

Se usa un PRNG pequeño con estado explícito derivado de un hash del seed. Toda
selección, mezcla y variación pasa por ese objeto. El motor ordena entradas y aplica un
desempate léxico estable, de modo que el orden de objetos o del sistema de archivos no
afecta el resultado.

## Filtros

Los fallos estructurales (longitud, caracteres, patrones repetidos, uniones de
consonantes poco naturales, umbral de pronunciación y términos expresamente
prohibidos) descartan. La validación usa el perfil español, inglés o combinado. Las
coincidencias negativas, ambigüedad ortográfica, palabras genéricas y posibles
colisiones de marca anotan riesgo y penalizan, sin afirmar disponibilidad legal.

## Puntuación

Cada dimensión produce 0–100 y una explicación. La puntuación total es una media
ponderada limitada por la dimensión esencial más débil: un nombre no puede compensar
una mala pronunciación con una longitud perfecta. Para riesgos, 100 significa menor
riesgo, conservando la dirección positiva de todas las dimensiones. Solo pasan a la
salida candidatos con mínimos explícitos; la selección final limita repeticiones de una
misma raíz o estrategia. La disponibilidad de dominio comienza neutral/desconocida y
solo se actualiza con una consulta explícita.
