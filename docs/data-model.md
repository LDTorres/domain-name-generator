# Modelo de datos

## Entidades

### Project

Agrupa el trabajo de naming. Guarda nombre, descripción, industria y timestamps.

### GenerationSession

Captura una ejecución reproducible: seed, configuración JSON validada, cantidad
solicitada, cantidad generada y relación con sus candidatos.

### Keyword

Palabras de entrada asociadas al proyecto, con tipo (`concept`, `keyword`) y peso.

### LinguisticRoot

Proyección persistible del diccionario: valor, forma normalizada, idioma, significado,
categorías, pronunciación, sentimiento y capacidad de prefijo/sufijo. El dataset JSON
es la fuente distribuible; esta tabla permite administración futura.

### Candidate

Nombre generado, nombre normalizado, estrategia, raíces y configuración de origen en
JSON, significado, pronunciación, cantidad de sílabas, estado y explicación. La
restricción única por sesión y nombre impide duplicados.

### CandidateScore

Puntuación total y las once subpuntuaciones: memorabilidad, pronunciación en español e
inglés, escritura, longitud, sonoridad, distintividad, relación conceptual,
escalabilidad internacional, riesgo de confusión, riesgo negativo y disponibilidad de
dominio.

### DomainCheck

Resultado cacheado por candidato, dominio y proveedor: estado, precios opcionales,
moneda, fecha de consulta, vencimiento de caché, mensaje y señal secundaria.

### Favorite

Metadatos de decisión por candidato: comentario, puntuación manual y estado `new`,
`finalist` o `discarded`.

### BrandRisk

Nivel `low`, `medium`, `high` o `unknown`, coincidencias exactas, similares y
explicación. Es orientación, no disponibilidad legal.

### BlacklistedTerm

Término administrable, idioma, severidad, categoría y estado activo. El dataset JSON
permite operar sin base de datos.

## Relaciones y ownership

```text
Project
  ├── Keyword*
  └── GenerationSession*
        └── Candidate*
              ├── CandidateScore  (1:1)
              ├── BrandRisk       (1:1)
              ├── Favorite        (0:1)
              └── DomainCheck*
```

Prisma es infraestructura. Los tipos del dominio no importan Prisma; la conversión se
realiza en servicios/repositorios del servidor.
