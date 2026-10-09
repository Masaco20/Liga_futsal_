-- PARCHE DE DEFENSA - ELIMINATORIA + MENÚ
-- Aplicar sobre la base liga_futsal actual después de una copia de seguridad.
-- No crea partidos nuevos: solo normaliza la fase de los playoffs de Apertura 2026
-- para que el sistema pueda identificar Cuartos -> Semifinal -> Final sin mezclar
-- los partidos de la fase regular.

SET FOREIGN_KEY_CHECKS=0;
START TRANSACTION;

-- Apertura 2026: 4 cuartos, 2 semifinales y 1 final.
UPDATE partidos SET observaciones='Cuartos de Final - partido finalizado'
WHERE id_partido IN (230,231,232,233) AND id_campeonato=3;

UPDATE partidos SET observaciones='Semifinal - partido finalizado'
WHERE id_partido IN (234,235) AND id_campeonato=3;

UPDATE partidos SET observaciones='Final - partido finalizado'
WHERE id_partido=236 AND id_campeonato=3;

-- El Apertura 2026 queda finalizado para que el campeón solo aparezca
-- cuando existe una final con resultado.
UPDATE campeonatos
SET nombre='TORNEO APERTURA', temporada='2026', formato='Liga',
    fecha_inicio='2026-03-09', fecha_fin='2026-05-22', estado='Finalizado'
WHERE id_campeonato=3;

COMMIT;
SET FOREIGN_KEY_CHECKS=1;

-- Verificación rápida
SELECT id_partido,id_campeonato,id_equipo_local,id_equipo_visitante,jornada,fecha,estado,observaciones
FROM partidos
WHERE id_campeonato=3 AND id_partido BETWEEN 230 AND 236
ORDER BY id_partido;
