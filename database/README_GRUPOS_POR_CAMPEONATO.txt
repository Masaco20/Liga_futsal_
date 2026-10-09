SOLUCION AL PROBLEMA DE GRUPOS MEZCLADOS

Antes:
- equipos.grupo era global.
- Si un equipo pasaba de A a B para otro torneo, se cambiaba también el torneo anterior.

Ahora:
- equipos es solo el catálogo de equipos.
- campeonato_equipos guarda id_campeonato + id_equipo + grupo.
- El mismo equipo puede estar en Grupo A del Apertura y Grupo B del Clausura.
- El generador de calendario usa solamente los equipos inscritos en el campeonato seleccionado.
- El sorteo automático guarda la asignación por campeonato y NO modifica equipos.grupo.
- La tabla de posiciones usa la inscripción del equipo dentro del campeonato.

INSTALACION EN TU BASE ACTUAL
1) Haz una copia/exportación de la base liga_futsal antes de tocarla.
2) Abre phpMyAdmin -> liga_futsal -> SQL.
3) Ejecuta: 2026-10-01_fix_grupos_por_campeonato.sql
4) Ese archivo copia la distribución actual del campeonato ID 3 a campeonato_equipos.
5) En el panel aparecerá "Equipos por campeonato".
6) Para un nuevo torneo: crea el campeonato -> entra a Equipos por campeonato -> asigna cada equipo a A o B.
7) Recién después genera el calendario.

IMPORTANTE:
No uses el campo grupo del módulo Equipos para asignar equipos a un torneo. El código nuevo ya no lo muestra como campo editable.
