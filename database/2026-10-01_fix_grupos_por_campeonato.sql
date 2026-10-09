-- =============================================================
-- FIX DEFINITIVO: grupos aislados por campeonato
-- Liga Futsal Vaca Diez
--
-- PROBLEMA QUE CORRIGE:
-- Antes "equipos.grupo" era global. Si un equipo estaba en Grupo A
-- del Torneo Apertura y luego lo cambiabas a Grupo B del Clausura,
-- el Apertura también quedaba como B.
--
-- SOLUCION:
-- El equipo sigue siendo un catálogo global, pero su grupo se guarda
-- en esta tabla por CAMPEONATO. Un mismo equipo puede estar en A en
-- un torneo y B en otro sin mezclar datos.
-- =============================================================

CREATE TABLE IF NOT EXISTS campeonato_equipos (
    id_campeonato_equipo INT NOT NULL AUTO_INCREMENT,
    id_campeonato INT NOT NULL,
    id_equipo INT NOT NULL,
    grupo VARCHAR(10) NOT NULL,
    PRIMARY KEY (id_campeonato_equipo),
    UNIQUE KEY uq_campeonato_equipo (id_campeonato, id_equipo),
    KEY idx_ce_campeonato (id_campeonato),
    KEY idx_ce_equipo (id_equipo),
    KEY idx_ce_grupo (id_campeonato, grupo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tu torneo actual es el ID 3 según la base que venimos usando.
-- Copiamos UNA SOLA VEZ la distribución actual A/B hacia la nueva
-- tabla. Esto NO modifica ni borra equipos.
INSERT INTO campeonato_equipos (id_campeonato, id_equipo, grupo)
SELECT 3, id_equipo, UPPER(TRIM(grupo))
FROM equipos
WHERE grupo IS NOT NULL
  AND TRIM(grupo) <> ''
  AND UPPER(TRIM(grupo)) IN ('A','B')
ON DUPLICATE KEY UPDATE grupo = VALUES(grupo);

-- Si tu tabla tabla_posiciones todavía no tiene grupo, agrégalo.
-- MariaDB acepta IF NOT EXISTS en ADD COLUMN.
ALTER TABLE tabla_posiciones
    ADD COLUMN IF NOT EXISTS grupo VARCHAR(10) NULL AFTER id_equipo;

-- IMPORTANTE:
-- Desde ahora NO cambies equipos.grupo para cambiar de campeonato.
-- Usa el módulo "Equipos por campeonato" del panel.
