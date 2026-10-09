CORRECCION FINAL DEFENSA 2026 - MOVIL + ELIMINATORIA + DATOS

1) Reemplazar el proyecto completo por esta carpeta/ZIP.
2) En el navegador usar Ctrl+F5 para evitar CSS/JS en cache.
3) Si ya se aplico PARCHE_FINAL_DEFENSA_2026.sql, ejecutar tambien:
   PARCHE_DEFENSA_MOVIL_ELIMINATORIA_2026.sql
4) Ese parche normaliza etiquetas de ganador y rondas de Apertura 2026.

Comprobaciones realizadas sobre el SQL de trabajo:
- 4 campeonatos: Apertura 2025, Clausura 2025, Apertura 2026 y Clausura 2026.
- Apertura 2026: 4 cuartos + 2 semifinales + 1 final; final 3-2 y campeon Torre Fuerte.
- Clausura 2026: 30 partidos; 15 finalizados y 15 programados; 15 resultados.
- Tablas de posiciones verificadas contra resultados de fase regular.
- Detalle de goles 2025/2026: los conteos coinciden con los marcadores y los jugadores pertenecen a los equipos del partido.
- La ruta de eliminatoria del administrador ahora toma solo partidos de la llave, no jornadas de fase regular.
- En empate de una eliminatoria el sistema pide registrar el desempate antes de avanzar.
- El modo celular usa menu compacto y la eliminatoria pasa a rondas verticales, sin cuadro horizontal gigante.

IMPORTANTE: las verificaciones anteriores son sobre los archivos SQL, codigo y paquete. No significan que se haya ejecutado la base en el localhost del usuario.
