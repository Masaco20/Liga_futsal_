-- PARCHE DE DEFENSA 2026 - DATOS + ELIMINATORIA
-- Aplicar DESPUES de PARCHE_FINAL_DEFENSA_2026.sql.
-- Hacer copia de seguridad antes de ejecutar.
SET FOREIGN_KEY_CHECKS=0;
START TRANSACTION;

-- Normaliza las etiquetas de las rondas del Apertura 2026.
UPDATE partidos SET observaciones='Cuartos de Final - partido finalizado'
WHERE id_campeonato=3 AND id_partido IN (230,231,232,233);
UPDATE partidos SET observaciones='Semifinal - partido finalizado'
WHERE id_campeonato=3 AND id_partido IN (234,235);
UPDATE partidos SET observaciones='Final - partido finalizado'
WHERE id_campeonato=3 AND id_partido=236;

-- Mantiene el Apertura 2026 finalizado y al Clausura 2026 activo.
UPDATE campeonatos SET nombre='TORNEO APERTURA',temporada='2026',formato='Liga',fecha_inicio='2026-03-09',fecha_fin='2026-05-22',estado='Finalizado'
WHERE id_campeonato=3;
UPDATE campeonatos SET nombre='TORNEO CLAUSURA',temporada='2026',formato='Liga',fecha_inicio='2026-09-11',fecha_fin=NULL,estado='Activo'
WHERE id_campeonato=4;

-- Los resultados usan las mismas etiquetas que utiliza el sistema:
-- Local / Visitante / Empate. Si algún dato antiguo tuviera 1/2/3,
-- se normaliza a partir del marcador.
UPDATE resultados
SET ganador = CASE
  WHEN goles_local > goles_visitante THEN 'Local'
  WHEN goles_local < goles_visitante THEN 'Visitante'
  ELSE 'Empate'
END;

COMMIT;
SET FOREIGN_KEY_CHECKS=1;

-- Verificación rápida
SELECT id_campeonato,nombre,temporada,formato,estado,fecha_inicio,fecha_fin FROM campeonatos ORDER BY id_campeonato;
SELECT id_partido,id_campeonato,jornada,estado,observaciones FROM partidos WHERE id_campeonato=3 AND id_partido BETWEEN 230 AND 236 ORDER BY id_partido;
SELECT id_partido,goles_local,goles_visitante,ganador FROM resultados WHERE id_partido BETWEEN 230 AND 236 ORDER BY id_partido;
SELECT COUNT(*) AS resultados_huerfanos FROM resultados r LEFT JOIN partidos p ON p.id_partido=r.id_partido WHERE p.id_partido IS NULL;
