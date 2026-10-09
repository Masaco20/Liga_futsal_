-- ============================================================
-- MIGRACION SEGURA DE TEMPORADAS 2026
-- Objetivo:
--   1) Dejar el CLAUSURA 2026 (id=3) activo y al 50% de su fase regular.
--   2) Separar los partidos 230-236 de eliminatoria en un campeonato
--      terminado: TORNEO APERTURA 2026 (id=5).
--   3) Mostrar a Torre Fuerte como campeon SOLO del Apertura 2026.
-- No borra partidos ni resultados.
-- ============================================================

START TRANSACTION;

-- PRIMERO: comprobar que el ID 5 no esté ocupado por otro campeonato.
SELECT id_campeonato, nombre, temporada, estado
FROM campeonatos
WHERE id_campeonato = 5;

-- Si la consulta anterior devuelve una fila que NO sea el Apertura 2026,
-- NO continúes. En ese caso hay que elegir otro ID antes de ejecutar el resto.

-- Crear el campeonato histórico 2026 si todavía no existe.
INSERT INTO campeonatos
    (id_campeonato, id_categoria, nombre, temporada, formato, fecha_inicio, fecha_fin, estado)
SELECT
    5, 4, 'TORNEO APERTURA', '2026', 'Liga', '2026-08-07', '2026-10-20', 'Finalizado'
WHERE NOT EXISTS (
    SELECT 1 FROM campeonatos WHERE id_campeonato = 5
);

-- Asegurar los datos correctos del Apertura 2026.
UPDATE campeonatos
SET nombre='TORNEO APERTURA',
    temporada='2026',
    formato='Liga',
    fecha_inicio='2026-08-07',
    fecha_fin='2026-10-20',
    estado='Finalizado'
WHERE id_campeonato=5
  AND (nombre='TORNEO APERTURA' OR (temporada='2026' AND nombre LIKE 'TORNEO APERTURA%'));

-- El campeonato actual queda como CLAUSURA 2026, en curso.
UPDATE campeonatos
SET nombre='TORNEO CLAUSURA',
    temporada='2026',
    formato='Liga',
    fecha_inicio='2026-08-07',
    fecha_fin='2026-11-29',
    estado='Activo'
WHERE id_campeonato=3;

-- Inscribir en el Apertura 2026 a los mismos equipos del Clausura.
-- No se toca la asignación del Clausura.
INSERT INTO campeonato_equipos (id_campeonato, id_equipo, grupo)
SELECT 5, ce.id_equipo, ce.grupo
FROM campeonato_equipos ce
WHERE ce.id_campeonato=3
  AND EXISTS (SELECT 1 FROM campeonatos c WHERE c.id_campeonato=5 AND c.nombre='TORNEO APERTURA' AND c.temporada='2026')
  AND NOT EXISTS (
      SELECT 1
      FROM campeonato_equipos x
      WHERE x.id_campeonato=5 AND x.id_equipo=ce.id_equipo
  );

-- Mover SOLO las llaves ya terminadas (230-236) al Apertura 2026.
UPDATE partidos
SET id_campeonato=5
WHERE id_partido BETWEEN 230 AND 236
  AND EXISTS (SELECT 1 FROM campeonatos c WHERE c.id_campeonato=5 AND c.nombre='TORNEO APERTURA' AND c.temporada='2026');

UPDATE resultados
SET id_campeonato=5
WHERE id_partido BETWEEN 230 AND 236
  AND EXISTS (SELECT 1 FROM campeonatos c WHERE c.id_campeonato=5 AND c.nombre='TORNEO APERTURA' AND c.temporada='2026');

-- Asegurar que esas llaves queden claramente marcadas como finalizadas.
UPDATE partidos
SET estado='Finalizado'
WHERE id_partido BETWEEN 230 AND 236
  AND EXISTS (SELECT 1 FROM campeonatos c WHERE c.id_campeonato=5 AND c.nombre='TORNEO APERTURA' AND c.temporada='2026');

-- Verificación antes de confirmar.
SELECT id_campeonato, nombre, temporada, estado, fecha_inicio, fecha_fin
FROM campeonatos
WHERE id_campeonato IN (3,5)
ORDER BY id_campeonato;

SELECT id_partido, id_campeonato, jornada, grupo, estado, observaciones
FROM partidos
WHERE id_partido BETWEEN 230 AND 236
ORDER BY id_partido;

SELECT id_partido, id_campeonato, goles_local, goles_visitante, ganador
FROM resultados
WHERE id_partido BETWEEN 230 AND 236
ORDER BY id_partido;

SELECT
    3 AS id_campeonato,
    COUNT(*) AS partidos_fase_regular,
    SUM(CASE WHEN EXISTS (
        SELECT 1 FROM resultados r
        WHERE r.id_partido=p.id_partido
    ) THEN 1 ELSE 0 END) AS finalizados,
    ROUND(100 * SUM(CASE WHEN EXISTS (
        SELECT 1 FROM resultados r
        WHERE r.id_partido=p.id_partido
    ) THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0)) AS porcentaje
FROM partidos p
WHERE p.id_campeonato=3 AND TRIM(COALESCE(p.grupo,''))<>'';

COMMIT;
