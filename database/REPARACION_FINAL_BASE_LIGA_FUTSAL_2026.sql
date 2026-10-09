-- ============================================================
-- REPARACION FINAL LIGA FUTSAL - 2026
-- Basado en el export actual de phpMyAdmin recibido el 04-10-2026.
--
-- Corrige sincronización de resultados, completa el Clausura 2026
-- para la demostración (50%: 15 de 30 partidos), y prepara las
-- estadísticas/campeones históricos.
--
-- NOTA: los detalles de goles/tarjetas del Clausura 2026 son datos
-- de demostración coherentes con los marcadores.
-- ============================================================

START TRANSACTION;

-- 1) Eliminar resultados/detalles que apuntan a partidos inexistentes.
DELETE r
FROM resultados r
LEFT JOIN partidos p ON p.id_partido = r.id_partido
WHERE p.id_partido IS NULL;

DELETE g
FROM detalle_goles g
LEFT JOIN partidos p ON p.id_partido = g.id_partido
WHERE p.id_partido IS NULL;

DELETE t
FROM tarjetas t
LEFT JOIN partidos p ON p.id_partido = t.id_partido
WHERE p.id_partido IS NULL;

-- 2) Sincronizar el campeonato de cada resultado/detalle con su partido.
UPDATE resultados r
INNER JOIN partidos p ON p.id_partido = r.id_partido
SET r.id_campeonato = p.id_campeonato
WHERE r.id_campeonato IS NULL OR r.id_campeonato <> p.id_campeonato;

UPDATE detalle_goles g
INNER JOIN partidos p ON p.id_partido = g.id_partido
SET g.id_campeonato = p.id_campeonato
WHERE g.id_campeonato IS NULL OR g.id_campeonato <> p.id_campeonato;

UPDATE tarjetas t
INNER JOIN partidos p ON p.id_partido = t.id_partido
SET t.id_campeonato = p.id_campeonato
WHERE t.id_campeonato IS NULL OR t.id_campeonato <> p.id_campeonato;

-- 3) Completar Clausura 2026 (ID 4).
UPDATE campeonatos
SET id_categoria = 4,
    nombre = 'TORNEO CLAUSURA',
    temporada = '2026',
    formato = 'Liga',
    fecha_inicio = '2026-09-11',
    fecha_fin = NULL,
    estado = 'Activo'
WHERE id_campeonato = 4;

-- El ID 4 se reconstruye de forma limpia para que la carga sea repetible.
DELETE FROM tarjetas WHERE id_campeonato = 4;
DELETE FROM detalle_goles WHERE id_campeonato = 4;
DELETE FROM resultados WHERE id_campeonato = 4;
DELETE FROM tabla_posiciones WHERE id_campeonato = 4;
DELETE FROM partidos WHERE id_campeonato = 4;


INSERT INTO `partidos` (`id_partido`, `id_campeonato`, `id_equipo_local`, `id_equipo_visitante`, `id_arbitro`, `id_cancha`, `jornada`, `grupo`, `fecha`, `hora`, `estado`, `observaciones`) VALUES
(500, 4, 19, 24, 1, 4, 1, 'A', '2026-09-11', '17:30:00', 'Finalizado', 'Jornada 1 - Clausura 2026'),
(501, 4, 20, 23, 1, 5, 1, 'A', '2026-09-11', '19:00:00', 'Finalizado', 'Jornada 1 - Clausura 2026'),
(502, 4, 21, 22, 1, 6, 1, 'A', '2026-09-11', '20:30:00', 'Finalizado', 'Jornada 1 - Clausura 2026'),
(503, 4, 12, 18, 1, 5, 1, 'B', '2026-09-12', '17:30:00', 'Finalizado', 'Jornada 1 - Clausura 2026'),
(504, 4, 13, 17, 1, 6, 1, 'B', '2026-09-12', '19:00:00', 'Finalizado', 'Jornada 1 - Clausura 2026'),
(505, 4, 15, 16, 1, 5, 1, 'B', '2026-09-12', '20:30:00', 'Finalizado', 'Jornada 1 - Clausura 2026'),
(506, 4, 19, 23, 1, 4, 2, 'A', '2026-09-18', '17:30:00', 'Finalizado', 'Jornada 2 - Clausura 2026'),
(507, 4, 24, 22, 1, 5, 2, 'A', '2026-09-18', '19:00:00', 'Finalizado', 'Jornada 2 - Clausura 2026'),
(508, 4, 20, 21, 1, 6, 2, 'A', '2026-09-18', '20:30:00', 'Finalizado', 'Jornada 2 - Clausura 2026'),
(509, 4, 12, 17, 1, 5, 2, 'B', '2026-09-19', '17:30:00', 'Finalizado', 'Jornada 2 - Clausura 2026'),
(510, 4, 18, 16, 1, 6, 2, 'B', '2026-09-19', '19:00:00', 'Finalizado', 'Jornada 2 - Clausura 2026'),
(511, 4, 13, 15, 1, 5, 2, 'B', '2026-09-19', '20:30:00', 'Finalizado', 'Jornada 2 - Clausura 2026'),
(512, 4, 19, 22, 1, 4, 3, 'A', '2026-09-25', '17:30:00', 'Finalizado', 'Jornada 3 - Clausura 2026'),
(513, 4, 23, 21, 1, 5, 3, 'A', '2026-09-25', '19:00:00', 'Finalizado', 'Jornada 3 - Clausura 2026'),
(514, 4, 24, 20, 1, 6, 3, 'A', '2026-10-09', '20:30:00', 'Programado', 'Jornada 3 - Clausura 2026'),
(515, 4, 12, 16, 1, 5, 3, 'B', '2026-09-26', '17:30:00', 'Finalizado', 'Jornada 3 - Clausura 2026'),
(516, 4, 17, 15, 1, 6, 3, 'B', '2026-10-09', '19:00:00', 'Programado', 'Jornada 3 - Clausura 2026'),
(517, 4, 18, 13, 1, 5, 3, 'B', '2026-10-09', '20:30:00', 'Programado', 'Jornada 3 - Clausura 2026'),
(518, 4, 19, 21, 1, 4, 4, 'A', '2026-10-16', '17:30:00', 'Programado', 'Jornada 4 - Clausura 2026'),
(519, 4, 22, 20, 1, 5, 4, 'A', '2026-10-16', '19:00:00', 'Programado', 'Jornada 4 - Clausura 2026'),
(520, 4, 23, 24, 1, 6, 4, 'A', '2026-10-16', '20:30:00', 'Programado', 'Jornada 4 - Clausura 2026'),
(521, 4, 12, 15, 1, 5, 4, 'B', '2026-10-17', '17:30:00', 'Programado', 'Jornada 4 - Clausura 2026'),
(522, 4, 16, 13, 1, 6, 4, 'B', '2026-10-17', '19:00:00', 'Programado', 'Jornada 4 - Clausura 2026'),
(523, 4, 17, 18, 1, 5, 4, 'B', '2026-10-17', '20:30:00', 'Programado', 'Jornada 4 - Clausura 2026'),
(524, 4, 19, 20, 1, 4, 5, 'A', '2026-10-23', '17:30:00', 'Programado', 'Jornada 5 - Clausura 2026'),
(525, 4, 21, 24, 1, 5, 5, 'A', '2026-10-23', '19:00:00', 'Programado', 'Jornada 5 - Clausura 2026'),
(526, 4, 22, 23, 1, 6, 5, 'A', '2026-10-23', '20:30:00', 'Programado', 'Jornada 5 - Clausura 2026'),
(527, 4, 12, 13, 1, 5, 5, 'B', '2026-10-24', '17:30:00', 'Programado', 'Jornada 5 - Clausura 2026'),
(528, 4, 15, 18, 1, 6, 5, 'B', '2026-10-24', '19:00:00', 'Programado', 'Jornada 5 - Clausura 2026'),
(529, 4, 16, 17, 1, 5, 5, 'B', '2026-10-24', '20:30:00', 'Programado', 'Jornada 5 - Clausura 2026');



INSERT INTO `resultados` (`id_resultado`, `id_partido`, `id_campeonato`, `goles_local`, `goles_visitante`, `ganador`, `observaciones`) VALUES
(1300, 500, 4, 3, 1, 'Local', 'Jornada finalizada - Clausura 2026'),
(1301, 501, 4, 2, 2, 'Empate', 'Jornada finalizada - Clausura 2026'),
(1302, 502, 4, 1, 3, 'Visitante', 'Jornada finalizada - Clausura 2026'),
(1303, 503, 4, 4, 2, 'Local', 'Jornada finalizada - Clausura 2026'),
(1304, 504, 4, 2, 1, 'Local', 'Jornada finalizada - Clausura 2026'),
(1305, 505, 4, 3, 0, 'Local', 'Jornada finalizada - Clausura 2026'),
(1306, 506, 4, 1, 2, 'Visitante', 'Jornada finalizada - Clausura 2026'),
(1307, 507, 4, 4, 3, 'Local', 'Jornada finalizada - Clausura 2026'),
(1308, 508, 4, 2, 0, 'Local', 'Jornada finalizada - Clausura 2026'),
(1309, 509, 4, 1, 1, 'Empate', 'Jornada finalizada - Clausura 2026'),
(1310, 510, 4, 5, 2, 'Local', 'Jornada finalizada - Clausura 2026'),
(1311, 511, 4, 2, 3, 'Visitante', 'Jornada finalizada - Clausura 2026'),
(1312, 512, 4, 3, 2, 'Local', 'Jornada finalizada - Clausura 2026'),
(1313, 513, 4, 0, 2, 'Visitante', 'Jornada finalizada - Clausura 2026'),
(1314, 515, 4, 4, 1, 'Local', 'Jornada finalizada - Clausura 2026');



INSERT INTO `detalle_goles` (`id_gol`, `id_partido`, `id_campeonato`, `id_jugador`, `minuto`, `tipo`) VALUES
(1800, 500, 4, 40, 4, ''),
(1801, 500, 4, 41, 10, ''),
(1802, 500, 4, 42, 16, ''),
(1803, 500, 4, 65, 4, ''),
(1804, 501, 4, 45, 5, ''),
(1805, 501, 4, 46, 11, ''),
(1806, 501, 4, 60, 5, ''),
(1807, 501, 4, 61, 11, ''),
(1808, 502, 4, 50, 6, ''),
(1809, 502, 4, 55, 6, ''),
(1810, 502, 4, 56, 12, ''),
(1811, 502, 4, 57, 18, ''),
(1812, 503, 4, 10, 7, ''),
(1813, 503, 4, 11, 13, ''),
(1814, 503, 4, 12, 19, ''),
(1815, 503, 4, 13, 25, ''),
(1816, 503, 4, 35, 7, ''),
(1817, 503, 4, 36, 13, ''),
(1818, 504, 4, 15, 8, ''),
(1819, 504, 4, 16, 14, ''),
(1820, 504, 4, 30, 8, ''),
(1821, 505, 4, 20, 4, ''),
(1822, 505, 4, 21, 10, ''),
(1823, 505, 4, 22, 16, ''),
(1824, 506, 4, 40, 5, ''),
(1825, 506, 4, 60, 5, ''),
(1826, 506, 4, 61, 11, ''),
(1827, 507, 4, 65, 6, ''),
(1828, 507, 4, 66, 12, ''),
(1829, 507, 4, 67, 18, ''),
(1830, 507, 4, 68, 24, ''),
(1831, 507, 4, 55, 6, ''),
(1832, 507, 4, 56, 12, ''),
(1833, 507, 4, 57, 18, ''),
(1834, 508, 4, 45, 7, ''),
(1835, 508, 4, 46, 13, ''),
(1836, 509, 4, 10, 8, ''),
(1837, 509, 4, 30, 8, ''),
(1838, 510, 4, 35, 4, ''),
(1839, 510, 4, 36, 10, ''),
(1840, 510, 4, 37, 16, ''),
(1841, 510, 4, 38, 22, ''),
(1842, 510, 4, 39, 28, ''),
(1843, 510, 4, 25, 4, ''),
(1844, 510, 4, 26, 10, ''),
(1845, 511, 4, 15, 5, ''),
(1846, 511, 4, 16, 11, ''),
(1847, 511, 4, 20, 5, ''),
(1848, 511, 4, 21, 11, ''),
(1849, 511, 4, 22, 17, ''),
(1850, 512, 4, 40, 6, ''),
(1851, 512, 4, 41, 12, ''),
(1852, 512, 4, 42, 18, ''),
(1853, 512, 4, 55, 6, ''),
(1854, 512, 4, 56, 12, ''),
(1855, 513, 4, 50, 7, ''),
(1856, 513, 4, 51, 13, ''),
(1857, 515, 4, 10, 4, ''),
(1858, 515, 4, 11, 10, ''),
(1859, 515, 4, 12, 16, ''),
(1860, 515, 4, 13, 22, ''),
(1861, 515, 4, 25, 4, '');



INSERT INTO `tarjetas` (`id_tarjeta`, `id_partido`, `id_campeonato`, `id_jugador`, `tipo`, `minuto`, `observacion`) VALUES
(1, 500, 4, 65, 'Amarilla', 12, 'Advertencia'),
(2, 502, 4, 51, 'Amarilla', 14, 'Advertencia'),
(3, 504, 4, 32, 'Amarilla', 16, 'Advertencia'),
(4, 506, 4, 43, 'Amarilla', 18, 'Advertencia'),
(5, 508, 4, 54, 'Amarilla', 20, 'Advertencia'),
(6, 510, 4, 115, 'Amarilla', 22, 'Advertencia'),
(7, 512, 4, 152, 'Amarilla', 24, 'Advertencia'),
(8, 515, 4, 72, 'Amarilla', 26, 'Advertencia');



INSERT INTO `tabla_posiciones` (`id_posicion`, `id_campeonato`, `grupo`, `id_equipo`, `partidos_jugados`, `partidos_ganados`, `partidos_empatados`, `partidos_perdidos`, `goles_favor`, `goles_contra`, `diferencia_goles`, `puntos`) VALUES
(100, 1, '', 12, 11, 6, 5, 0, 33, 21, 12, 23),
(101, 1, '', 15, 11, 6, 4, 1, 28, 21, 7, 22),
(102, 1, '', 22, 11, 7, 0, 4, 28, 25, 3, 21),
(103, 1, '', 24, 11, 6, 2, 3, 25, 23, 2, 20),
(104, 1, '', 17, 11, 4, 5, 2, 23, 20, 3, 17),
(105, 1, '', 18, 11, 5, 0, 6, 27, 29, -2, 15),
(106, 1, '', 20, 11, 5, 0, 6, 27, 29, -2, 15),
(107, 1, '', 19, 11, 3, 5, 3, 21, 21, 0, 14),
(108, 1, '', 21, 11, 2, 5, 4, 20, 23, -3, 11),
(109, 1, '', 16, 11, 3, 0, 8, 23, 30, -7, 9),
(110, 1, '', 13, 11, 2, 2, 7, 21, 27, -6, 8),
(111, 1, '', 23, 11, 1, 4, 6, 21, 28, -7, 7),
(200, 4, 'A', 19, 3, 2, 0, 1, 7, 5, 2, 6),
(201, 4, 'A', 20, 2, 1, 1, 0, 4, 2, 2, 4),
(202, 4, 'A', 23, 3, 1, 1, 1, 4, 5, -1, 4),
(203, 4, 'A', 22, 3, 1, 0, 2, 8, 8, 0, 3),
(204, 4, 'A', 24, 2, 1, 0, 1, 5, 6, -1, 3),
(205, 4, 'A', 21, 3, 1, 0, 2, 3, 5, -2, 3),
(206, 4, 'B', 12, 3, 2, 1, 0, 9, 4, 5, 7),
(207, 4, 'B', 15, 2, 2, 0, 0, 6, 2, 4, 6),
(208, 4, 'B', 18, 2, 1, 0, 1, 7, 6, 1, 3),
(209, 4, 'B', 13, 2, 1, 0, 1, 4, 4, 0, 3),
(210, 4, 'B', 17, 2, 0, 1, 1, 2, 3, -1, 1),
(211, 4, 'B', 16, 3, 0, 0, 3, 3, 12, -9, 0);


-- 4) Dejar AUTO_INCREMENT listo para futuros campeonatos.
ALTER TABLE campeonatos
  MODIFY id_campeonato int(11) NOT NULL AUTO_INCREMENT,
  AUTO_INCREMENT = 5;

COMMIT;

-- 5) Verificación.
SELECT id_campeonato, nombre, temporada, id_categoria, estado,
       fecha_inicio, fecha_fin
FROM campeonatos
ORDER BY id_campeonato;

SELECT id_campeonato, estado, COUNT(*) AS partidos
FROM partidos
GROUP BY id_campeonato, estado
ORDER BY id_campeonato, estado;

SELECT id_campeonato, COUNT(*) AS resultados
FROM resultados
GROUP BY id_campeonato
ORDER BY id_campeonato;

SELECT id_campeonato, COUNT(*) AS equipos
FROM campeonato_equipos
GROUP BY id_campeonato
ORDER BY id_campeonato;

SELECT COUNT(*) AS resultados_huerfanos
FROM resultados r
LEFT JOIN partidos p ON p.id_partido = r.id_partido
WHERE p.id_partido IS NULL;
