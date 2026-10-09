# Liga Futsal — revisión final para defensa 2026

## Qué se corrigió

### Base de datos
- Se eliminan resultados que no tienen un partido asociado.
- Se sincroniza `id_campeonato` en resultados, goles y tarjetas.
- Se completa el campeonato **TORNEO CLAUSURA 2026 (ID 4)**.
- Clausura 2026 queda con **30 partidos: 15 finalizados + 15 programados (50%)**.
- Se completa su tabla de posiciones.
- Se agregan detalles de goles y algunas tarjetas de demostración para Clausura 2026.
- Se completa la tabla de posiciones de Apertura 2025.
- Se deja `campeonatos.id_campeonato` con AUTO_INCREMENT para futuras altas.

### Aficionado
- Menú con separación correcta entre iconos y texto.
- Modo Hincha trabaja sobre el campeonato activo.
- Historial G/E/P y partidos clickeables.
- Próxima fecha solo muestra la siguiente jornada del campeonato activo.
- Partido muestra el marcador aunque no existan goleadores/tarjetas individuales.

### Campeones
- Apertura 2025: se obtiene desde el primer lugar de la tabla.
- Clausura 2025: se obtiene desde la final.
- Apertura 2026: se obtiene desde la final.
- Clausura 2026: aparece como activo y sin campeón.

## Instalación de la base

1. Hacer una copia de seguridad de la base actual.
2. Abrir phpMyAdmin.
3. Seleccionar `liga_futsal`.
4. Importar:
   `database/REPARACION_FINAL_BASE_LIGA_FUTSAL_2026.sql`
5. Revisar las consultas de verificación del final del archivo.

No ejecutar el archivo sobre otra base sin revisar primero.

## Resultado esperado

- Campeonatos: 1, 2, 3 y 4.
- Clausura 2026: 12 equipos.
- Clausura 2026: 15 partidos finalizados y 15 programados.
- Resultados huérfanos: 0.
