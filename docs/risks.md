# Riesgos

| Riesgo | Impacto | Mitigación en v1 | Trabajo posterior |
| --- | --- | --- | --- |
| Falsos positivos lingüísticos | Un nombre puede sonar mal en una región | Riesgo configurable, explicación y puntuación separada | Revisión por hablantes y corpus regionales |
| Disponibilidad de dominio ambigua | RDAP/DNS no garantizan compra | Estados `unknown`; DNS solo como señal | Integrar registrador con precio y compra |
| Rate limiting por proceso | Varias instancias multiplican el límite | Documentar alcance y consultar bajo demanda | Redis/token bucket distribuido |
| Cambios de APIs de registradores | Fallos externos | Zod, timeouts, errores visibles y proveedores desacoplados | Observabilidad y circuit breaker |
| Disponibilidad de modelos gratuitos | Optimización intermitente | Perfil local intacto, errores explícitos y sin fallback pago | Selección administrable de modelos gratuitos |
| Exposición de claves en Compose | Consumo o abuso de APIs | Secretos server-only y Basic Auth fail-closed en producción | Gestor de secretos y SSO externo |
| Riesgo legal incompleto | Posible colisión de marca | Advertencia explícita; similitud local no afirma disponibilidad | Proveedor oficial y revisión profesional |
| Dataset con sesgos o errores | Connotaciones imprecisas | Metadatos y archivos por idioma revisables | Curación especializada y versionado |
| Explosión combinatoria | Latencia al pedir grandes lotes | Presupuesto de intentos, sets y tope validado | Workers/colas para lotes mayores |
| Hidratación/payload de 100 resultados | UI lenta | Resumen por tarjeta y detalles progresivos | Paginación/virtualización |
| SQLite en despliegue horizontal | Contención y archivos no compartidos | Alcance local/instancia única | PostgreSQL para producción |
| PRNG o scoring cambian | Un seed deja de reproducir históricos | Guardar configuración y versión de motor | Versionar algoritmos y migradores |
| Precio de dominio desactualizado | Decisión económica incorrecta | Timestamp y TTL visibles | Renovación automática y moneda normalizada |
| Nombres generados parecidos a ejemplos | Menor distintividad | No hardcodear resultados, comparar marcas conocidas | Búsqueda semántica y corpus ampliado |
