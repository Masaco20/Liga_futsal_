CAMBIOS PARA LA DEFENSA - OCTUBRE 2026

1. Partido: la ficha ya no se cae completa si detalle_goles o tarjetas no responde. La informacion principal del partido se intenta cargar siempre.
2. Calendario: filtro por campeonato y jornada. Cada partido tiene acceso directo a su ficha.
3. Eliminatoria: solo muestra partidos de eliminacion directa (grupo NULL / observaciones de cuartos, semifinal o final). La fase regular no se mezcla con las llaves.
4. Modo hincha: la forma G/E/P ahora es clickeable y se agrega un historial de los ultimos partidos con marcador y enlace al detalle.
5. Panel admin: el porcentaje se calcula sobre la fase regular, para que un Clausura activo pueda mostrar 50% sin parecer finalizado.
6. Temporadas: MIGRACION_TEMPORADAS_2026.sql separa los partidos 230-236 del campeonato 3 y los coloca en un Apertura 2026 finalizado (id 5), dejando el Clausura 2026 (id 3) activo.

IMPORTANTE: antes de ejecutar la migracion SQL, revisar el SELECT inicial del ID 5. Si el ID 5 ya pertenece a otro campeonato distinto del Apertura 2026, no ejecutar la migracion sin cambiar ese ID.
