# Base de datos - Liga Provincial de Futsal Vaca Diez #1

## Estado: estructura 100% confirmada ✅

Ya no hay nada "a mejor esfuerzo" ni comentarios `// revisar` — me pasaste
el export completo de las 13 tablas de `liga_provincial_futsal` y todo
el código (`js/admin-app.js`, `js/liga-api.js`, páginas del sitio) usa
exactamente esos nombres de tabla, columnas y claves primarias.

## Tablas y sus claves primarias

| Tabla | Clave primaria |
|---|---|
| usuarios | id_usuario |
| categorias | id_categoria |
| equipos | id_equipo |
| jugadores | id_jugador |
| arbitros | id_arbitro |
| canchas | id_cancha |
| campeonatos | id_campeonato |
| partidos | id_partido |
| resultados | id_resultado |
| detalle_goles | id_gol |
| tarjetas | id_tarjeta |
| noticias | id_noticia |
| tabla_posiciones | id_posicion |

## Tabla de posiciones

Es una tabla real (no se calcula sola). Desde el panel admin ahora puedes
agregar/editar filas ahí mismo (equipo, campeonato, PJ/PG/PE/PP, goles,
puntos) — la actualizas manualmente después de cargar cada resultado.
Si más adelante quieres que se calcule sola a partir de `resultados`,
se puede armar aparte.

## Cómo se conecta todo

```
phpMyAdmin (tu base)  →  api/models/connection.php (usuario/contraseña/nombre de BD)
                              ↓
              api/routes/routes.php (recibe .../api/index.php/<tabla>)
                              ↓
        html/js/liga-api.js y html/js/admin-app.js (piden datos con fetch())
```

Nota: las URLs usan `index.php/<tabla>` (no `.htaccess`/mod_rewrite) para
que funcione sin depender de la configuración de Apache.

## Panel de administración (CMS)

`html/admin.html`: Dashboard, Equipos, Categorías, Jugadores, Campeonatos,
Partidos, Resultados, Goles, Tarjetas, Tabla de Posiciones, Noticias,
Árbitros, Canchas, Usuarios, Configuración — Agregar/Editar/Eliminar/Buscar
funcionando en todos los módulos.

Requiere iniciar sesión (`login.html`) contra tu tabla `usuarios` real
(correo + password). Configuración en `html/js/admin-app.js` y
`html/js/auth.js`:
- `API_BASE_URL` / `AUTH_API_BASE_URL` -> misma ruta (`../api/index.php`).
- `API_KEY` -> debe coincidir con `Connection::apikey()` en
  `api/models/connection.php`.

## Seguridad (ya resuelta, no es solo un aviso)

- **Contraseñas hasheadas**: se guardan con `password_hash()` de PHP,
  nunca en texto plano. `api/login.php` es el único que las compara
  (con `password_verify()`), y lo hace *dentro* del servidor — el
  navegador nunca recibe el hash de nadie.
- **Escribir datos exige sesión real de servidor**, no solo la apikey
  del JavaScript: `api/routes/routes.php` rechaza cualquier
  POST/PUT/DELETE si no hay una sesión de PHP válida (iniciada en
  `login.php`). La única excepción es el registro público como
  Aficionado — y está limitado por código a ese rol exacto, nadie
  puede auto-registrarse como Administrador o Secretario por esa vía.
- **Subida de imágenes real** (`api/upload.php`): valida tamaño (máx.
  3 MB), que el archivo sea una imagen de verdad (no solo por su
  extensión) y guarda todo en `api/uploads/`, protegida con un
  `.htaccess` que impide que un archivo subido se ejecute como
  código PHP.
- Sigue pendiente, y es honesto decirlo así en la defensa: la apikey
  en sí sigue siendo un valor fijo visible en el JavaScript del
  navegador (protege que cualquiera lea/escriba tablas al azar, pero
  no es un secreto criptográfico). La combinación apikey + sesión de
  servidor es el nivel de seguridad razonable para un proyecto de
  grado; para producción real, el siguiente paso sería mover también
  la apikey a una variable de entorno del servidor.

## Evidencia de pruebas

`database/Liga_Futsal_API.postman_collection.json` — colección de
Postman con las pruebas funcionales y de integración reales que se
hicieron sobre la API (CRUD de Equipos, filtro de Jugadores por
equipo, orden de la Tabla de Posiciones, protección de integridad
referencial, y el bloqueo de auto-registro como Administrador).
Impórtala en Postman (`Import` → selecciona el archivo) para
correrla tú mismo o mostrarla como evidencia en la defensa.

## ⚠️ Antes de importar o tocar la base

Haz una copia de seguridad primero: en phpMyAdmin, con tu base
`liga_provincial_futsal` seleccionada → **Exportar → Exportación rápida
→ Continuar**, y guarda ese archivo aparte. Así, si algo sale mal
al probar algo nuevo, lo restauras en segundos.
