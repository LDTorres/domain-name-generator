# Arquitectura del motor

## Límite del módulo

`src/lib/naming-engine` es TypeScript puro. No importa React, Next.js, Prisma, APIs
externas ni variables de entorno. Recibe datos, configuración y seed; devuelve
candidatos evaluados. Ese límite permite extraerlo después como paquete o servicio.

```text
GenerationConfig (Zod)
        │
        ▼
context builder ── roots/prefixes/suffixes/patterns
        │
        ▼
strategies[] ── seeded PRNG ── raw candidates
        │
        ▼
normalization ── hard phonetic validation
        │
        ▼
negative-term + brand-risk annotations
        │
        ▼
explainable scoring ── stable deduplication/sort
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

Los fallos estructurales (longitud, caracteres, patrones repetidos, demasiadas
consonantes, términos expresamente prohibidos) descartan. Las coincidencias negativas,
ambigüedad ortográfica y posibles colisiones de marca anotan riesgo y penalizan, sin
eliminar automáticamente.

## Puntuación

Cada dimensión produce 0–100 y una explicación. La puntuación total es una media
ponderada. Para riesgos, 100 significa menor riesgo, conservando la dirección positiva
de todas las dimensiones. La disponibilidad de dominio comienza neutral/desconocida y
solo se actualiza con una consulta explícita.
