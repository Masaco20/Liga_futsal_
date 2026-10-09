DATOS DE DEMOSTRACION PARA LA DEFENSA
======================================

Archivo: BD_DEMO_DEFENSA_2025_2026.sql

IMPORTANTE
----------
Este archivo REEMPLAZA los datos de las tablas del sistema. Antes de importarlo,
haz una copia de seguridad de tu base actual desde phpMyAdmin.

El archivo incluye:

1) TORNEO APERTURA 2025
   - Formato: todos contra todos
   - 12 equipos
   - 11 jornadas
   - 66 partidos
   - 66 resultados
   - Goles y tarjetas registrados
   - Temporada finalizada: 100%

2) TORNEO CLAUSURA 2025
   - Formato: grupos + eliminatoria
   - Grupo A: 6 equipos
   - Grupo B: 6 equipos
   - 5 jornadas de grupos
   - 30 partidos de grupos
   - 4 cuartos + 2 semifinales + 1 final
   - 37 partidos en total
   - Temporada finalizada: 100%

3) TORNEO CLAUSURA 2026
   - Formato: grupos
   - 10 jornadas previstas
   - 60 partidos programados en total
   - Primeras 5 jornadas finalizadas
   - 30 partidos jugados y 30 pendientes
   - Avance mostrado: 50%
   - Estado: Activo

HORARIOS
--------
Se variaron los horarios para que el calendario no muestre todo a las 19:00.
Se utilizan diferentes horarios, por ejemplo 17:00, 18:30, 20:00, 17:30,
19:00 y 20:30, según la jornada.

DATOS DEPORTIVOS
----------------
Los resultados, goles y tarjetas son DATOS DE DEMOSTRACION generados para
probar y presentar el funcionamiento del sistema. No deben presentarse como
resultados historicos oficiales de la Liga.

CAMPEONATO 2025 APERTURA
-------------------------
El sistema calcula la tabla completa a partir de los resultados.

CAMPEONATO 2025 CLAUSURA
-------------------------
El sistema incluye la ruta completa de eliminatoria y un campeon de ejemplo.

CAMPEONATO 2026 CLAUSURA
------------------------
Es el campeonato activo para la demostracion. Al estar a mitad del calendario,
la barra del dashboard debe mostrar aproximadamente 50%.

COMO IMPORTAR
-------------
1. Abre XAMPP y enciende Apache y MySQL.
2. Entra a phpMyAdmin.
3. Exporta primero tu base actual como respaldo.
4. Selecciona la base que usa el sistema (por defecto: liga_futsal).
5. Ve a Importar.
6. Selecciona BD_DEMO_DEFENSA_2025_2026.sql.
7. Ejecuta la importacion.
8. Abre http://localhost/liga_futsal/html/index.html
9. Entra al Panel Admin y revisa el Centro de control.

NOTA
----
El SQL incluye la tabla campeonato_equipos con la clave id_campeonato_equipo,
que es la que utiliza la version actual del panel administrativo.
