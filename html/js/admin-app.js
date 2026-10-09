console.log("%c admin-app.js VERSION 2026-10-08e (eliminatoria segura + móvil) ", "background:#0f5172;color:#fff;font-weight:bold;padding:4px;");

/* =====================================================
   Panel de Administración - Liga Provincial de Futsal
   Vaca Diez #1

   Motor CRUD genérico: agregar/editar/eliminar/buscar
   para cualquier tabla, conectado a la API REST (api/).

   Estructura de las 13 tablas CONFIRMADA con tu export
   completo de phpMyAdmin (liga_provincial_futsal.sql).
   Todos los nombres de columna y claves primarias de abajo
   son los reales de tu base.

   - Cambia API_BASE_URL por la ruta real de tu carpeta "api".
   - La API usa una "apikey" fija (Authorization header),
     definida en api/models/connection.php. Apta para tu
     proyecto de grado, no para producción real sin mejorarla.
   ===================================================== */

const API_BASE_URL = "../api/index.php";
const API_KEY = "sfgfgdfhdfhdgfhrtwertwedsfasdfasde";

/* ---------------------------------------------------
   Utilidades de conexión a la API
   (ya soportan cualquier nombre de clave primaria)
   --------------------------------------------------- */

async function parseJsonSeguro(res) {
    const texto = await res.text();
    try {
        return JSON.parse(texto);
    } catch (err) {
        console.error("Respuesta cruda del servidor (no es JSON válido):", texto);
        const error = new Error("El servidor respondió algo que no es JSON. Mira la consola (F12) para ver el texto completo. Primeros 300 caracteres: " + texto.slice(0, 300));
        error.name = "RespuestaInvalida";
        throw error;
    }
}

async function apiGet(table, params = "") {
    const query = params ? "&" + params.slice(1) : "";
    const res = await fetch(`${API_BASE_URL}?table=${table}${query}`, {
        headers: { "Authorization": API_KEY }
    });
    const data = await parseJsonSeguro(res);

    // La API a veces devuelve {"results":"Not Found"} cuando una
    // tabla/consulta no tiene filas, en vez de una lista vacía.
    // Se normaliza acá, en un solo lugar, para que .find/.filter/.map
    // nunca truenen en ningún módulo del admin por esta razón.
    if (!data || !Array.isArray(data.results)) {
        return { ...(data || {}), results: [] };
    }
    return data;
}

function toFormBody(obj) {
    return Object.entries(obj)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? "")}`)
        .join("&");
}

async function apiCreate(table, data, pk) {
    const res = await fetch(`${API_BASE_URL}?table=${table}&token=no&except=${pk}`, {
        method: "POST",
        headers: {
            "Authorization": API_KEY,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: toFormBody(data)
    });
    return parseJsonSeguro(res);
}

async function apiUpdate(table, id, data, pk) {
    const res = await fetch(`${API_BASE_URL}?table=${table}&token=no&except=${pk}&id=${id}&nameId=${pk}`, {
        method: "PUT",
        headers: {
            "Authorization": API_KEY,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: toFormBody(data)
    });
    return parseJsonSeguro(res);
}

async function apiDelete(table, id, pk) {
    const res = await fetch(`${API_BASE_URL}?table=${table}&token=no&except=${pk}&id=${id}&nameId=${pk}`, {
        method: "DELETE",
        headers: { "Authorization": API_KEY }
    });
    return parseJsonSeguro(res);
}

/* ---------------------------------------------------
   Configuración de cada módulo del CRUD
   "pk" = nombre real de la clave primaria de la tabla.
   Cada field.key = nombre real de columna (¡revísalos!).
   --------------------------------------------------- */

const ESTADO_FIELD = { key: "estado", label: "Estado", type: "select",
    options: [{ value: 1, label: "Activo" }, { value: 0, label: "Inactivo" }], default: 1 };

const MODULES = {

    usuarios: {
        table: "usuarios", title: "Usuarios", icon: "fa-users-cog", pk: "id_usuario",
        columns: ["nombre", "apellido", "usuario", "correo", "rol"],
        fields: [
            { key: "nombre", label: "Nombre", type: "text", required: true },
            { key: "apellido", label: "Apellido", type: "text", required: true },
            { key: "usuario", label: "Usuario", type: "text", required: true },
            { key: "correo", label: "Correo electrónico", type: "text", required: true },
            { key: "password", label: "Contraseña", type: "text", required: true,
              hint: "Se guarda de forma segura (hasheada) en el servidor, nunca en texto plano." },
            { key: "rol", label: "Rol", type: "select",
              options: [{value:"Administrador",label:"Administrador"},{value:"Secretario",label:"Secretario"}], default: "Secretario" }
        ]
    },

    categorias: {
        table: "categorias", title: "División", icon: "fa-layer-group", pk: "id_categoria",
        columns: ["nombre", "descripcion"],
        fields: [
            { key: "nombre", label: "Nombre de la categoría (ej. Primera A)", type: "text", required: true },
            { key: "descripcion", label: "Descripción", type: "text" }
        ]
    },

    // "Grupos" define la ESTRUCTURA (qué grupos existen: A, B, etc.).
    // La Tabla de Posiciones es un módulo aparte y de solo lectura:
    // ahí se ven los RESULTADOS calculados, acá se arma la estructura.
    grupos: {
        table: "grupos", title: "Grupos", icon: "fa-layer-group", pk: "id_grupo",
        columns: ["nombre", "descripcion"],
        fields: [
            { key: "nombre", label: "Nombre del grupo (ej. A, B, C)", type: "text", required: true },
            { key: "descripcion", label: "Descripción (ej. Grupo A - Primera A)", type: "text" }
        ]
    },

    // Inscripción por campeonato: el grupo NO pertenece al equipo de forma global.
    // Un mismo equipo puede jugar varios campeonatos y estar en A en uno y B en otro.
    campeonato_equipos: {
        table: "campeonato_equipos", title: "Equipos por campeonato", icon: "fa-project-diagram", pk: "id_campeonato_equipo",
        columns: ["id_campeonato", "id_equipo", "grupo"],
        fields: [
            { key: "id_campeonato", label: "Campeonato", type: "fk", fkModule: "campeonatos", required: true },
            { key: "id_equipo", label: "Equipo", type: "fk", fkModule: "equipos", required: true },
            { key: "grupo", label: "Grupo", type: "dynamic-select", groupModule: "grupos", required: true }
        ]
    },

    // Solo lectura a propósito: un traspaso siempre se crea con el botón
    // "Traspasar jugador" (en Jugadores), porque ese botón además actualiza
    // el equipo actual del jugador. Crearlo acá directo dejaría los datos
    // desincronizados.
    traspasos: {
        table: "traspasos", title: "Traspasos", icon: "fa-exchange-alt", pk: "id_traspaso",
        readOnly: true,
        columns: ["fecha", "id_jugador", "id_equipo_origen", "id_equipo_destino", "observacion"],
        fields: []
    },

    equipos: {
        table: "equipos", title: "Equipos", icon: "fa-shield-alt", pk: "id_equipo",
        columns: ["nombre", "entrenador", "delegado"],
        fields: [
            { key: "nombre", label: "Nombre del equipo", type: "text", required: true },
            { key: "escudo", label: "Escudo del equipo", type: "image" },
            { key: "entrenador", label: "Entrenador", type: "text" },
            { key: "delegado", label: "Delegado", type: "text" },
            { key: "color_uniforme", label: "Color de uniforme", type: "text" }
        ]
    },

    jugadores: {
        table: "jugadores", title: "Jugadores", icon: "fa-running", pk: "id_jugador",
        columns: ["nombre", "apellido", "numero_camiseta", "posicion", "id_equipo"],
        fields: [
            { key: "id_equipo", label: "Equipo", type: "fk", fkModule: "equipos", required: true },
            { key: "nombre", label: "Nombre", type: "text", required: true },
            { key: "apellido", label: "Apellido", type: "text", required: true },
            { key: "ci", label: "Carnet de identidad", type: "text" },
            { key: "numero_camiseta", label: "Número de camiseta", type: "number" },
            { key: "posicion", label: "Posición", type: "select", required: true,
              options: [{value:"Arquero",label:"Arquero (arco)"},{value:"Jugador de campo",label:"Jugador de campo"}] },
            { key: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" },
            { key: "telefono", label: "Teléfono", type: "text" },
            { key: "direccion", label: "Dirección", type: "text" },
            { key: "foto", label: "Foto del jugador", type: "image" }
        ]
    },

    arbitros: {
        table: "arbitros", title: "Árbitros", icon: "fa-whistle", pk: "id_arbitro",
        columns: ["nombre", "apellido", "telefono", "categoria", "experiencia"],
        fields: [
            { key: "nombre", label: "Nombre", type: "text", required: true },
            { key: "apellido", label: "Apellido", type: "text", required: true },
            { key: "ci", label: "Carnet de identidad", type: "text" },
            { key: "telefono", label: "Teléfono", type: "text" },
            { key: "categoria", label: "Categoría de árbitro", type: "text" },
            { key: "experiencia", label: "Años de experiencia", type: "number" }
        ]
    },

    canchas: {
        table: "canchas", title: "Canchas", icon: "fa-map-marker-alt", pk: "id_cancha",
        columns: ["nombre", "direccion", "tipo_piso", "capacidad"],
        fields: [
            { key: "nombre", label: "Nombre de la cancha", type: "text", required: true },
            { key: "direccion", label: "Dirección", type: "text" },
            { key: "capacidad", label: "Capacidad", type: "number" },
            { key: "tipo_piso", label: "Tipo de piso", type: "select",
              options: [{value:"Cemento",label:"Cemento"},{value:"Madera",label:"Madera"},{value:"Sintetico",label:"Sintético"}], default: "Cemento" },
            { key: "descripcion", label: "Descripción", type: "textarea" }
        ]
    },

    campeonatos: {
        table: "campeonatos", title: "Campeonatos", icon: "fa-trophy", pk: "id_campeonato",
        columns: ["nombre", "temporada", "formato", "fecha_inicio", "fecha_fin", "estado"],
        fields: [
            { key: "nombre", label: "Nombre del campeonato", type: "text", required: true },
            { key: "temporada", label: "Temporada", type: "text" },
            { key: "formato", label: "Formato", type: "select", required: true,
              options: [{value:"Liga",label:"Liga (todos contra todos, con tabla de posiciones)"},
                        {value:"Eliminatoria",label:"Torneo relámpago (eliminatoria directa)"}], default: "Liga" },
            { key: "fecha_inicio", label: "Fecha de inicio", type: "date" },
            { key: "fecha_fin", label: "Fecha de fin", type: "date" },
            { key: "estado", label: "Estado", type: "select",
              options: [{value:"Activo",label:"Activo"},{value:"Finalizado",label:"Finalizado"},{value:"Suspendido",label:"Suspendido"}], default: "Activo" }
        ]
    },

    partidos: {
        table: "partidos", title: "Partidos", icon: "fa-calendar-alt", pk: "id_partido",
        columns: ["id_campeonato", "grupo", "jornada", "id_equipo_local", "id_equipo_visitante", "fecha", "hora"],
        fields: [
            { key: "id_campeonato", label: "Campeonato / Temporada", type: "fk", fkModule: "campeonatos", required: true },
            { key: "grupo", label: "Grupo", type: "dynamic-select", groupModule: "grupos", required: true },
            { key: "jornada", label: "Jornada", type: "number", required: true },
            { key: "id_equipo_local", label: "Equipo local", type: "fk", fkModule: "equipos", required: true },
            { key: "id_equipo_visitante", label: "Equipo visitante", type: "fk", fkModule: "equipos", required: true },
            { key: "id_cancha", label: "Cancha", type: "fk", fkModule: "canchas", required: true },
            { key: "id_arbitro", label: "Árbitro", type: "fk", fkModule: "arbitros", required: true },
            { key: "fecha", label: "Fecha", type: "date", required: true },
            { key: "hora", label: "Hora", type: "time", required: true },
            { key: "observaciones", label: "Observaciones", type: "text" }
        ]
    },

    resultados: {
        table: "resultados", title: "Resultados", icon: "fa-clipboard-list", pk: "id_resultado",
        columns: ["id_campeonato", "id_partido", "goles_local", "goles_visitante", "ganador"],
        fields: [
            { key: "id_partido", label: "Partido", type: "fk", fkModule: "partidos", required: true },
            { key: "goles_local", label: "Goles local", type: "number", required: true },
            { key: "goles_visitante", label: "Goles visitante", type: "number", required: true },
            { key: "observaciones", label: "Observaciones", type: "text" }
        ]
    },

    detalle_goles: {
        table: "detalle_goles", title: "Goles", icon: "fa-futbol", pk: "id_gol",
        columns: ["id_campeonato", "id_partido", "id_jugador", "minuto", "tipo"],
        fields: [
            { key: "id_partido", label: "Partido", type: "fk", fkModule: "partidos", required: true },
            { key: "id_jugador", label: "Jugador", type: "fk", fkModule: "jugadores", required: true },
            { key: "minuto", label: "Minuto", type: "number" },
            { key: "tipo", label: "Tipo de gol", type: "select",
              options: [{value:"Normal",label:"Normal"},{value:"Penal",label:"Penal"},{value:"Autogol",label:"Autogol"}], default: "Normal" }
        ]
    },

    tarjetas: {
        table: "tarjetas", title: "Tarjetas", icon: "fa-square", pk: "id_tarjeta",
        columns: ["id_campeonato", "id_partido", "id_jugador", "tipo", "minuto"],
        fields: [
            { key: "id_partido", label: "Partido", type: "fk", fkModule: "partidos", required: true },
            { key: "id_jugador", label: "Jugador", type: "fk", fkModule: "jugadores", required: true },
            { key: "tipo", label: "Tipo", type: "select", required: true,
              options: [{value:"Amarilla",label:"Amarilla"},{value:"Roja",label:"Roja"}] },
            { key: "minuto", label: "Minuto", type: "number" },
            { key: "observacion", label: "Observación", type: "text" }
        ]
    },

    noticias: {
        table: "noticias", title: "Noticias", icon: "fa-newspaper", pk: "id_noticia",
        columns: ["titulo", "fecha_publicacion"],
        fields: [
            { key: "titulo", label: "Título", type: "text", required: true },
            { key: "contenido", label: "Contenido", type: "textarea" },
            { key: "imagen", label: "Imagen de la noticia", type: "image" },
            { key: "fecha_publicacion", label: "Fecha de publicación", type: "date" }
        ]
    },

    tabla_posiciones: {
        table: "tabla_posiciones", title: "Tabla de Posiciones", icon: "fa-list-ol", pk: "id_posicion",
        readOnly: true,
        columns: ["id_campeonato", "grupo", "id_equipo", "partidos_jugados", "partidos_ganados",
                  "partidos_empatados", "partidos_perdidos", "goles_favor", "goles_contra",
                  "diferencia_goles", "puntos"],
        fields: []
    }
};



/* ---------------------------------------------------
   Diccionarios para mostrar NOMBRES en vez de IDs
   (el jurado no quiere ver "id_categoria: 2")
   --------------------------------------------------- */

const LOOKUPS = { campeonatos: {}, equipos: {}, jugadores: {}, partidos: {} };
let lookupsCargados = false;

async function cargarLookups(forzar = false) {
    if (lookupsCargados && !forzar) return;
    const [camp, eq, jug, par] = await Promise.all([
        apiGet("campeonatos").catch(() => ({ results: [] })),
        apiGet("equipos").catch(() => ({ results: [] })),
        apiGet("jugadores").catch(() => ({ results: [] })),
        apiGet("partidos").catch(() => ({ results: [] }))
    ]);
    LOOKUPS.campeonatos = {};
    (camp.results || []).forEach(c => {
        LOOKUPS.campeonatos[c.id_campeonato] = c.temporada ? `${c.nombre} (${c.temporada})` : c.nombre;
    });
    LOOKUPS.equipos = {};
    (eq.results || []).forEach(e => { LOOKUPS.equipos[e.id_equipo] = e.nombre; });
    LOOKUPS.jugadores = {};
    (jug.results || []).forEach(j => { LOOKUPS.jugadores[j.id_jugador] = `${j.nombre} ${j.apellido}`; });
    LOOKUPS.partidos = {};
    (par.results || []).forEach(p => {
        const l = LOOKUPS.equipos[p.id_equipo_local] || ("#" + p.id_equipo_local);
        const v = LOOKUPS.equipos[p.id_equipo_visitante] || ("#" + p.id_equipo_visitante);
        LOOKUPS.partidos[p.id_partido] = `J${p.jornada}: ${l} vs ${v}`;
    });
    lookupsCargados = true;
}

function etiquetaColumna(col, valor) {
    if (valor === null || valor === undefined || valor === "") return "";
    if (col === "id_campeonato") return LOOKUPS.campeonatos[valor] || ("Campeonato #" + valor);
    if (col === "id_equipo" || col === "id_equipo_local" || col === "id_equipo_visitante" ||
        col === "id_equipo_origen" || col === "id_equipo_destino")
        return LOOKUPS.equipos[valor] || ("Equipo #" + valor);
    if (col === "id_jugador") return LOOKUPS.jugadores[valor] || ("Jugador #" + valor);
    if (col === "id_partido") return LOOKUPS.partidos[valor] || ("Partido #" + valor);
    if (col === "grupo") return "Grupo " + valor;
    return valor;
}

/* Devuelve el partido completo desde el cache de lookups */
let PARTIDOS_CACHE = [];
async function cargarPartidosCache() {
    const d = await apiGet("partidos").catch(() => ({ results: [] }));
    PARTIDOS_CACHE = d.results || [];
    return PARTIDOS_CACHE;
}

/* ---------------------------------------------------
   Estado en memoria del módulo activo
   --------------------------------------------------- */

let currentModuleKey = "dashboard";
let currentRows = [];
let editingId = null;
const fkCache = {};

/* ---------------------------------------------------
   Router del sidebar
   --------------------------------------------------- */

document.getElementById("adm-nav").addEventListener("click", (e) => {
    const link = e.target.closest("a[data-module]");
    if (!link) return;
    document.querySelectorAll("#adm-nav a").forEach(a => a.classList.remove("active"));
    link.classList.add("active");
    loadModule(link.dataset.module);
    document.getElementById("adm-sidebar").classList.remove("adm-sidebar-open");
});

const admMenuToggle = document.getElementById("adm-menu-toggle");
if (admMenuToggle) {
    admMenuToggle.addEventListener("click", () => {
        document.getElementById("adm-sidebar").classList.toggle("adm-sidebar-open");
    });
}

async function loadModule(key) {
    currentModuleKey = key;

    if (MODULOS_SOLO_ADMIN.includes(key) && !esAdministrador()) {
        document.getElementById("adm-titulo").textContent = "Acceso restringido";
        document.getElementById("adm-content").innerHTML = `
            <div class="adm-panel">
                <div class="adm-panel-body p-4 text-center text-muted">
                    <i class="fas fa-lock fa-2x mb-3"></i>
                    <p class="mb-0">Este módulo es solo para usuarios con rol Administrador.</p>
                </div>
            </div>`;
        return;
    }

    if (key === "dashboard") {
        document.getElementById("adm-titulo").textContent = "Dashboard";
        renderDashboard();
        return;
    }
    if (key === "configuracion") {
        document.getElementById("adm-titulo").textContent = "Configuración";
        renderConfiguracion();
        return;
    }
    if (key === "reportes") {
        document.getElementById("adm-titulo").textContent = "Reportes";
        renderReportes();
        return;
    }
    const config = MODULES[key];
    document.getElementById("adm-titulo").textContent = config.title;
    await renderCrudModule(config);
}

/* ---------------------------------------------------
   Dashboard
   --------------------------------------------------- */

async function renderDashboard() {
    const cont = document.getElementById("adm-content");
    cont.innerHTML = `<div class="adm-panel"><div class="adm-panel-body text-center text-muted py-5"><i class="fas fa-spinner fa-spin"></i> Cargando centro de control...</div></div>`;

    const [equiposD, jugadoresD, partidosD, noticiasD, campsD, resultadosD, golesD, tarjetasD, tablaD] = await Promise.all([
        apiGet("equipos").catch(() => ({ results: [] })),
        apiGet("jugadores").catch(() => ({ results: [] })),
        apiGet("partidos").catch(() => ({ results: [] })),
        apiGet("noticias").catch(() => ({ results: [] })),
        apiGet("campeonatos").catch(() => ({ results: [] })),
        apiGet("resultados").catch(() => ({ results: [] })),
        apiGet("detalle_goles").catch(() => ({ results: [] })),
        apiGet("tarjetas").catch(() => ({ results: [] })),
        apiGet("tabla_posiciones").catch(() => ({ results: [] }))
    ]);

    const equipos = equiposD.results || [];
    const jugadores = jugadoresD.results || [];
    const partidos = partidosD.results || [];
    const noticias = noticiasD.results || [];
    const campeonatos = campsD.results || [];
    const resultados = resultadosD.results || [];
    const goles = golesD.results || [];
    const tarjetas = tarjetasD.results || [];
    const tabla = tablaD.results || [];

    const activos = campeonatos.filter(c => String(c.estado).toLowerCase() === "activo");
    const actual = activos[0] || campeonatos.slice().sort((a,b) => Number(b.id_campeonato)-Number(a.id_campeonato))[0];
    const idCamp = actual ? String(actual.id_campeonato) : "";
    const partidosCamp = idCamp ? partidos.filter(p => String(p.id_campeonato) === idCamp) : partidos;
    const idsPartidosCamp = new Set(partidosCamp.map(p => String(p.id_partido)));
    // resultados, goles y tarjetas se relacionan con el campeonato a través del partido.
    const resultadosCamp = idCamp ? resultados.filter(r => idsPartidosCamp.has(String(r.id_partido))) : resultados;
    const golesCamp = idCamp ? goles.filter(g => idsPartidosCamp.has(String(g.id_partido))) : goles;
    const tarjetasCamp = idCamp ? tarjetas.filter(t => idsPartidosCamp.has(String(t.id_partido))) : tarjetas;
    const tablaCamp = idCamp ? tabla.filter(t => String(t.id_campeonato) === idCamp) : tabla;
    // El avance del campeonato se calcula sobre la fase regular (todos contra todos).
    // Los cruces de eliminación directa llevan grupo NULL y no deben hacer parecer
    // que un Clausura todavía activo ya llegó a la final.
    const partidosRegulares = partidosCamp.filter(p => String(p.grupo || '').trim() !== '');
    const jugadosRegulares = new Set(resultadosCamp.filter(r => partidosRegulares.some(p => String(p.id_partido) === String(r.id_partido))).map(r => String(r.id_partido)));
    const pendientes = partidosRegulares.filter(p => !jugadosRegulares.has(String(p.id_partido)));
    const totalGoles = golesCamp.length || resultadosCamp.reduce((a,r) => a + Number(r.goles_local || 0) + Number(r.goles_visitante || 0), 0);

    const mapaEquipos = {};
    equipos.forEach(e => mapaEquipos[e.id_equipo] = e.nombre);
    const conteoGoles = {};
    golesCamp.forEach(g => { conteoGoles[g.id_jugador] = (conteoGoles[g.id_jugador] || 0) + 1; });
    const mapaJugadores = {};
    jugadores.forEach(j => mapaJugadores[j.id_jugador] = `${j.nombre || ""} ${j.apellido || ""}`.trim());
    const topGoleador = Object.entries(conteoGoles).sort((a,b) => b[1]-a[1])[0];
    const lider = tablaCamp.slice().sort((a,b) =>
        Number(b.puntos||0)-Number(a.puntos||0) || Number(b.diferencia_goles||0)-Number(a.diferencia_goles||0) || Number(b.goles_favor||0)-Number(a.goles_favor||0)
    )[0];

    const etiquetaCamp = actual ? `${actual.nombre || "Campeonato"}${actual.temporada ? " · " + actual.temporada : ""}` : "Sin campeonato registrado";
    const porcentaje = partidosRegulares.length ? Math.round((jugadosRegulares.size / partidosRegulares.length) * 100) : 0;

    const tarjeta = (icon, valor, texto, extra="") => `
        <div class="col-xl-2 col-lg-4 col-6 mb-3">
            <div class="adm-stat-card h-100">
                <div class="adm-stat-icon"><i class="fas ${icon}"></i></div>
                <div><h2>${valor}</h2><p>${texto}</p>${extra ? `<small class="text-muted">${extra}</small>` : ""}</div>
            </div>
        </div>`;

    cont.innerHTML = `
        <div class="d-flex justify-content-between align-items-center flex-wrap mb-3">
            <div>
                <h2 class="mb-1">Centro de control</h2>
                <p class="text-muted mb-0">Resumen administrativo y deportivo del campeonato seleccionado.</p>
            </div>
            <span class="badge badge-success p-2"><i class="fas fa-circle mr-1"></i> ${actual ? (actual.estado || "Activo") : "Sin temporada"}</span>
        </div>

        <div class="adm-panel mb-4">
            <div class="adm-panel-header d-flex justify-content-between align-items-center flex-wrap">
                <h3 class="mb-0"><i class="fas fa-trophy mr-2"></i>${etiquetaCamp}</h3>
                <span class="text-muted">Formato: ${actual?.formato || "-"}</span>
            </div>
            <div class="adm-panel-body">
                <div class="small text-muted mb-1">Avance de la fase regular (todos contra todos)</div><div class="progress mb-2" style="height:12px;"><div class="progress-bar" style="width:${porcentaje}%"></div></div>
                <div class="d-flex justify-content-between"><small>Partidos de fase regular: ${partidosRegulares.length}</small><small>${jugadosRegulares.size} finalizados · ${pendientes.length} pendientes · ${porcentaje}%</small></div>
            </div>
        </div>

        <div class="row">
            ${tarjeta("fa-shield-alt", idCamp ? (new Set(partidosCamp.flatMap(p => [p.id_equipo_local, p.id_equipo_visitante])).size) : equipos.length, "Equipos en partidos")}
            ${tarjeta("fa-running", idCamp ? new Set(jugadores.filter(j => equipos.some(e => String(e.id_equipo) === String(j.id_equipo))).map(j => j.id_jugador)).size : jugadores.length, "Jugadores")}
            ${tarjeta("fa-calendar-check", jugadosRegulares.size, "Partidos de fase regular jugados")}
            ${tarjeta("fa-calendar-alt", pendientes.length, "Partidos pendientes")}
            ${tarjeta("fa-futbol", totalGoles, "Goles registrados")}
            ${tarjeta("fa-id-card", tarjetasCamp.length, "Tarjetas")}
        </div>

        <div class="row mt-2">
            <div class="col-lg-4 mb-3">
                <div class="adm-panel h-100"><div class="adm-panel-header"><h3><i class="fas fa-star mr-2"></i>Destacados</h3></div><div class="adm-panel-body">
                    <p class="mb-3"><strong>Líder de tabla:</strong><br>${lider ? `${mapaEquipos[lider.id_equipo] || "Equipo"} · ${lider.puntos || 0} pts` : "Sin datos todavía"}</p>
                    <p class="mb-0"><strong>Máximo goleador:</strong><br>${topGoleador ? `${mapaJugadores[topGoleador[0]] || "Jugador"} · ${topGoleador[1]} goles` : "Sin goles detallados"}</p>
                </div></div>
            </div>
            <div class="col-lg-4 mb-3">
                <div class="adm-panel h-100"><div class="adm-panel-header"><h3><i class="fas fa-bolt mr-2"></i>Próximos partidos</h3></div><div class="adm-panel-body">
                    ${pendientes.slice().sort((a,b) => String(a.fecha||"").localeCompare(String(b.fecha||""))).slice(0,4).map(p => `<div class="border-bottom py-2"><strong>${mapaEquipos[p.id_equipo_local] || "Local"} vs ${mapaEquipos[p.id_equipo_visitante] || "Visitante"}</strong><br><small>${p.fecha || "Sin fecha"} · ${p.hora || "Sin hora"} · Jornada ${p.jornada || "-"}</small></div>`).join("") || `<p class="text-muted mb-0">No hay partidos pendientes.</p>`}
                </div></div>
            </div>
            <div class="col-lg-4 mb-3">
                <div class="adm-panel h-100"><div class="adm-panel-header"><h3><i class="fas fa-bullseye mr-2"></i>Indicadores</h3></div><div class="adm-panel-body">
                    <p class="mb-2">Campeonatos registrados: <strong>${campeonatos.length}</strong></p>
                    <p class="mb-2">Noticias publicadas: <strong>${noticias.length}</strong></p>
                    <p class="mb-2">Equipos registrados: <strong>${equipos.length}</strong></p>
                    <p class="mb-0">Registros disciplinarios: <strong>${tarjetasCamp.length}</strong></p>
                </div></div>
            </div>
        </div>

        <div class="adm-panel">
            <div class="adm-panel-header"><h3><i class="fas fa-rocket mr-2"></i>Accesos rápidos</h3></div>
            <div class="adm-panel-body">
                <button class="btn btn-outline-success mr-2 mb-2" data-quick-module="partidos"><i class="fas fa-calendar-alt mr-1"></i> Gestionar partidos</button>
                <button class="btn btn-outline-success mr-2 mb-2" data-quick-module="resultados"><i class="fas fa-clipboard-list mr-1"></i> Registrar resultados</button>
                <button class="btn btn-outline-success mr-2 mb-2" data-quick-module="tabla_posiciones"><i class="fas fa-list-ol mr-1"></i> Ver posiciones</button>
                <button class="btn btn-outline-success mr-2 mb-2" data-quick-module="reportes"><i class="fas fa-print mr-1"></i> Generar reportes</button>
                <button class="btn btn-outline-success mb-2" data-quick-module="campeonatos"><i class="fas fa-trophy mr-1"></i> Administrar campeonatos</button>
            </div>
        </div>`;

    cont.querySelectorAll("[data-quick-module]").forEach(btn => btn.addEventListener("click", () => loadModule(btn.dataset.quickModule)));
}

function renderConfiguracion() {
    document.getElementById("adm-content").innerHTML = `
        <div class="adm-panel">
            <div class="adm-panel-header"><h3>Configuración general</h3></div>
            <div class="adm-panel-body p-4">
                <p class="text-muted">
                    Este módulo es un espacio reservado para datos generales de la liga
                    (nombre, temporada activa, datos de contacto, redes sociales, logo).
                    Puedes ampliarlo agregando una tabla <code>configuracion</code> de una
                    sola fila y conectándola con el mismo motor CRUD de este panel.
                </p>
            </div>
        </div>`;
}

/* ---------------------------------------------------
   Reportes: tabla general, carnets de jugador (con QR)
   y planilla oficial de partido, todo listo para imprimir
   o guardar como PDF desde el diálogo de impresión.
   --------------------------------------------------- */

function renderReportes() {
    document.getElementById("adm-content").innerHTML = `
        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="adm-panel h-100">
                    <div class="adm-panel-body p-4 text-center">
                        <i class="fas fa-list-ol fa-2x mb-3" style="color:#0c6b3d;"></i>
                        <h5>Tabla General</h5>
                        <p class="text-muted small">Posiciones actuales, lista para imprimir.</p>
                        <button class="btn adm-btn-add text-white" id="btn-reporte-tabla">
                            <i class="fas fa-print"></i> Generar
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="adm-panel h-100">
                    <div class="adm-panel-body p-4 text-center">
                        <i class="fas fa-id-card fa-2x mb-3" style="color:#0c6b3d;"></i>
                        <h5>Carnets de Jugador</h5>
                        <p class="text-muted small">Con código QR por jugador, listos para recortar.</p>
                        <select class="form-control mb-3" id="select-reporte-equipo">
                            <option value="">Todos los equipos</option>
                        </select>
                        <button class="btn adm-btn-add text-white" id="btn-reporte-carnets">
                            <i class="fas fa-print"></i> Generar
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="adm-panel h-100">
                    <div class="adm-panel-body p-4 text-center">
                        <i class="fas fa-clipboard-list fa-2x mb-3" style="color:#0c6b3d;"></i>
                        <h5>Planilla de Partido</h5>
                        <p class="text-muted small">Formato oficial para el árbitro, con alineación.</p>
                        <select class="form-control mb-3" id="select-reporte-partido">
                            <option value="">-- Selecciona un partido --</option>
                        </select>
                        <button class="btn adm-btn-add text-white" id="btn-reporte-planilla">
                            <i class="fas fa-print"></i> Generar
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="adm-panel h-100">
                    <div class="adm-panel-body p-4 text-center">
                        <i class="fas fa-futbol fa-2x mb-3" style="color:#0c6b3d;"></i>
                        <h5>Goleadores</h5>
                        <p class="text-muted small">Ranking de goles, filtrable por equipo.</p>
                        <select class="form-control mb-3" id="select-reporte-goleadores-equipo">
                            <option value="">Todos los equipos</option>
                        </select>
                        <button class="btn adm-btn-add text-white" id="btn-reporte-goleadores">
                            <i class="fas fa-print"></i> Generar
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

    document.getElementById("btn-reporte-goleadores").addEventListener("click", imprimirGoleadores);
    document.getElementById("btn-reporte-tabla").addEventListener("click", imprimirTablaGeneral);
    document.getElementById("btn-reporte-carnets").addEventListener("click", imprimirCarnets);
    document.getElementById("btn-reporte-planilla").addEventListener("click", imprimirPlanilla);

    cargarSelectReportes();
}

async function cargarSelectReportes() {
    const equipos = await apiGet("equipos").catch(() => ({ results: [] }));
    const selEquipo = document.getElementById("select-reporte-equipo");
    const selEquipoGoleadores = document.getElementById("select-reporte-goleadores-equipo");
    (equipos.results || []).forEach(eq => {
        selEquipo.innerHTML += `<option value="${eq.id_equipo}">${eq.nombre}</option>`;
        selEquipoGoleadores.innerHTML += `<option value="${eq.id_equipo}">${eq.nombre}</option>`;
    });

    const [partidos, mapaEquipos] = await Promise.all([
        apiGet("partidos").catch(() => ({ results: [] })),
        obtenerMapaEquiposReportes()
    ]);
    const selPartido = document.getElementById("select-reporte-partido");
    (partidos.results || []).forEach(p => {
        const local = mapaEquipos[p.id_equipo_local] || `Equipo #${p.id_equipo_local}`;
        const visitante = mapaEquipos[p.id_equipo_visitante] || `Equipo #${p.id_equipo_visitante}`;
        selPartido.innerHTML += `<option value="${p.id_partido}">Jornada ${p.jornada}: ${local} vs ${visitante} (${p.fecha})</option>`;
    });
}

async function obtenerMapaEquiposReportes() {
    const data = await apiGet("equipos").catch(() => ({ results: [] }));
    const mapa = {};
    (data.results || []).forEach(eq => { mapa[eq.id_equipo] = eq.nombre; });
    return mapa;
}

function abrirVentanaImprimir(titulo, cuerpoHtml) {
    const ventana = window.open("", "_blank");
    ventana.document.write(`
        <html>
        <head>
            <meta charset="utf-8">
            <title>${titulo}</title>
            <style>
                body{ font-family: Arial, sans-serif; padding: 24px; color:#222; }
                h1{ font-size: 20px; border-bottom: 3px solid #0c6b3d; padding-bottom: 10px; }
                table{ width:100%; border-collapse: collapse; margin-top: 16px; }
                th, td{ border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 13px; }
                th{ background:#0c6b3d; color:#fff; }
                .carnet{ display:inline-block; width:300px; border:2px solid #0c6b3d; border-radius:10px; padding:14px; margin:8px; text-align:center; page-break-inside: avoid; }
                .carnet h3{ margin:8px 0 2px; font-size:16px; }
                .carnet p{ margin:2px 0; font-size:13px; color:#555; }
                .carnet img.qr{ width:110px; height:110px; margin-top:8px; }
                @media print { button{ display:none; } }
            </style>
        </head>
        <body>
            <h1>${titulo}</h1>
            ${cuerpoHtml}
            <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;">Imprimir / Guardar como PDF</button>
        </body>
        </html>
    `);
    ventana.document.close();
}

async function imprimirTablaGeneral() {
    const [datos, mapaEquipos] = await Promise.all([
        apiGet("tabla_posiciones", "?orderBy=puntos&orderMode=DESC").catch(() => ({ results: [] })),
        obtenerMapaEquiposReportes()
    ]);
    const filas = datos.results || [];
    const filasHtml = filas.map((f, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${mapaEquipos[f.id_equipo] || "Equipo #" + f.id_equipo}</td>
            <td>${f.partidos_jugados ?? 0}</td><td>${f.partidos_ganados ?? 0}</td>
            <td>${f.partidos_empatados ?? 0}</td><td>${f.partidos_perdidos ?? 0}</td>
            <td>${f.goles_favor ?? 0}</td><td>${f.goles_contra ?? 0}</td>
            <td><strong>${f.puntos ?? 0}</strong></td>
        </tr>`).join("");

    abrirVentanaImprimir("Tabla General - Liga Provincial de Futsal Vaca Diez #1", `
        <table>
            <thead><tr><th>Pos</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr></thead>
            <tbody>${filasHtml || '<tr><td colspan="9">Sin datos todavía</td></tr>'}</tbody>
        </table>
    `);
}

async function imprimirGoleadores() {
    const idEquipo = document.getElementById("select-reporte-goleadores-equipo").value;
    const [golesData, jugadoresData, equiposMapa] = await Promise.all([
        apiGet("detalle_goles").catch(() => ({ results: [] })),
        apiGet("jugadores").catch(() => ({ results: [] })),
        obtenerMapaEquiposReportes()
    ]);
    let jugadores = jugadoresData.results || [];
    if (idEquipo) jugadores = jugadores.filter(j => String(j.id_equipo) === String(idEquipo));
    const idsPermitidos = new Set(jugadores.map(j => String(j.id_jugador)));

    const mapaJugadores = {};
    jugadores.forEach(j => { mapaJugadores[j.id_jugador] = j; });

    const conteo = {};
    (golesData.results || []).forEach(g => {
        if (!idsPermitidos.has(String(g.id_jugador))) return;
        conteo[g.id_jugador] = (conteo[g.id_jugador] || 0) + 1;
    });

    const ranking = Object.entries(conteo).sort((a, b) => b[1] - a[1]);

    const filasHtml = ranking.map(([idJugador, goles], i) => {
        const j = mapaJugadores[idJugador];
        return `<tr>
            <td>${i + 1}</td>
            <td>${j ? j.nombre + " " + j.apellido : "Jugador #" + idJugador}</td>
            <td>${j ? (equiposMapa[j.id_equipo] || "") : ""}</td>
            <td><strong>${goles}</strong></td>
        </tr>`;
    }).join("");

    abrirVentanaImprimir("Tabla de Goleadores", `
        <table>
            <thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>Goles</th></tr></thead>
            <tbody>${filasHtml || '<tr><td colspan="4">Sin goles registrados todavía</td></tr>'}</tbody>
        </table>
    `);
}

async function imprimirCarnets() {
    const idEquipo = document.getElementById("select-reporte-equipo").value;
    const [jugadoresData, equiposMapa] = await Promise.all([
        apiGet("jugadores").catch(() => ({ results: [] })),
        obtenerMapaEquiposReportes()
    ]);
    let jugadores = jugadoresData.results || [];
    if (idEquipo) jugadores = jugadores.filter(j => String(j.id_equipo) === String(idEquipo));

    const carnetsHtml = jugadores.map(j => {
        const qrData = encodeURIComponent(`Jugador:${j.nombre} ${j.apellido}|CI:${j.ci || ""}|Equipo:${equiposMapa[j.id_equipo] || ""}|Dorsal:${j.numero_camiseta || ""}`);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;
        return `
            <div class="carnet">
                <strong>${equiposMapa[j.id_equipo] || ""}</strong>
                <h3>${j.nombre} ${j.apellido}</h3>
                <p>Dorsal: ${j.numero_camiseta ?? "-"} &middot; ${j.posicion ?? ""}</p>
                <p>CI: ${j.ci ?? "-"}</p>
                <img class="qr" src="${qrUrl}" alt="QR">
            </div>`;
    }).join("");

    abrirVentanaImprimir("Carnets de Jugador", `<div>${carnetsHtml || "<p>No hay jugadores para este equipo.</p>"}</div>`);
}

async function imprimirPlanilla() {
    const idPartido = document.getElementById("select-reporte-partido").value;
    if (!idPartido) { alert("Selecciona un partido primero."); return; }

    const [partidosData, equiposMapa] = await Promise.all([
        apiGet("partidos").catch(() => ({ results: [] })),
        obtenerMapaEquiposReportes()
    ]);
    const partido = (partidosData.results || []).find(p => String(p.id_partido) === String(idPartido));
    if (!partido) { alert("No se encontró el partido."); return; }

    const jugadoresData = await apiGet("jugadores").catch(() => ({ results: [] }));
    const jugadores = jugadoresData.results || [];
    const jugadoresLocal = jugadores.filter(j => String(j.id_equipo) === String(partido.id_equipo_local));
    const jugadoresVisitante = jugadores.filter(j => String(j.id_equipo) === String(partido.id_equipo_visitante));

    const filasAlineacion = (lista) => lista.map(j => `<tr><td>${j.numero_camiseta ?? ""}</td><td>${j.nombre} ${j.apellido}</td><td>${j.posicion ?? ""}</td><td></td></tr>`).join("")
        || '<tr><td colspan="4">Sin jugadores registrados</td></tr>';

    abrirVentanaImprimir(`Planilla Oficial - Jornada ${partido.jornada}`, `
        <p><strong>Fecha:</strong> ${partido.fecha} &nbsp; <strong>Hora:</strong> ${partido.hora}</p>
        <div style="display:flex; gap:20px;">
            <div style="flex:1;">
                <h3>${equiposMapa[partido.id_equipo_local] || "Local"}</h3>
                <table><thead><tr><th>#</th><th>Jugador</th><th>Pos.</th><th>Goles/Tarj.</th></tr></thead>
                <tbody>${filasAlineacion(jugadoresLocal)}</tbody></table>
            </div>
            <div style="flex:1;">
                <h3>${equiposMapa[partido.id_equipo_visitante] || "Visitante"}</h3>
                <table><thead><tr><th>#</th><th>Jugador</th><th>Pos.</th><th>Goles/Tarj.</th></tr></thead>
                <tbody>${filasAlineacion(jugadoresVisitante)}</tbody></table>
            </div>
        </div>
        <p style="margin-top:30px;">Observaciones: ______________________________________________</p>
        <p style="margin-top:30px;">Firma árbitro: ____________________</p>
    `);
}

/* ---------------------------------------------------
   Módulo CRUD genérico
   --------------------------------------------------- */

async function resolveFk(field) {
    const fkConfig = MODULES[field.fkModule];
    if (fkCache[field.fkModule]) return { rows: fkCache[field.fkModule], config: fkConfig };
    const data = await apiGet(fkConfig.table).catch(() => ({ results: [] }));
    let rows = Array.isArray(data.results) ? data.results : [];

    if (field.fkModule === "partidos" && rows.length > 0) {
        const equiposData = await apiGet("equipos").catch(() => ({ results: [] }));
        const equipos = Array.isArray(equiposData.results) ? equiposData.results : [];
        const mapaEquipos = {};
        equipos.forEach(eq => { mapaEquipos[eq.id_equipo] = eq.nombre; });
        rows = rows.map(p => ({
            ...p,
            _label: `Jornada ${p.jornada}: ${mapaEquipos[p.id_equipo_local] || "Equipo #" + p.id_equipo_local} vs ${mapaEquipos[p.id_equipo_visitante] || "Equipo #" + p.id_equipo_visitante} (${p.fecha})`
        }));
    }

    fkCache[field.fkModule] = rows;
    return { rows, config: fkConfig };
}

function fkRowLabel(fkConfig, row) {
    if (row._label) return row._label;
    // usa el primer campo de texto configurado como nombre visible (normalmente "nombre")
    const nombreField = fkConfig.fields.find(f => f.key === "nombre");
    if (nombreField) return row[nombreField.key];
    return row[fkConfig.pk];
}

async function renderCrudModule(config) {
    const cont = document.getElementById("adm-content");

    const extraBotones = extraBotonesPorModulo(currentModuleKey);
    const MODULOS_CON_TEMPORADA = ["partidos", "resultados", "detalle_goles", "tarjetas", "tabla_posiciones"];
    const filtroTemporada = MODULOS_CON_TEMPORADA.includes(currentModuleKey)
        ? `<select class="form-control mr-2" id="adm-filtro-temporada" style="max-width:220px;"><option value="">Todas las temporadas</option></select>
           <select class="form-control mr-2" id="adm-filtro-grupo" style="max-width:150px;">
             <option value="">Ambos grupos</option>
           </select>`
        : "";
    const filtroEquipo = (currentModuleKey === "jugadores")
        ? `<select class="form-control" id="adm-filtro-equipo" style="max-width:200px;"><option value="">Todos los equipos</option></select>`
        : "";
    const filtroEstadoCampeonato = (currentModuleKey === "campeonatos")
        ? `<select class="form-control" id="adm-filtro-estado-campeonato" style="max-width:180px;">
             <option value="">Todos los estados</option>
             <option value="Activo">Activo</option>
             <option value="Finalizado">Finalizado</option>
             <option value="Suspendido">Suspendido</option>
           </select>`
        : "";

    cont.innerHTML = `
        <div class="adm-panel">
            <div class="adm-panel-header">
                <h3><i class="fas ${config.icon}"></i> ${config.title}</h3>
                <div class="d-flex align-items-center flex-wrap" style="gap:10px;">
                    ${filtroTemporada}
                    ${filtroEquipo}
                    ${filtroEstadoCampeonato}
                    <input type="text" class="form-control adm-search-box" id="adm-search" placeholder="Buscar...">
                    ${extraBotones}
                    ${config.readOnly ? "" : `<button class="btn adm-btn-add text-white" id="adm-add-btn"><i class="fas fa-plus"></i> Agregar</button>`}
                </div>
            </div>
            <div id="adm-extra-panel"></div>
            <div class="adm-panel-body">
                <div class="table-responsive">
                    <table class="table adm-table" id="adm-table">
                        <thead><tr>${config.columns.map(c => `<th>${tituloColumna(c)}</th>`).join("")}${config.readOnly ? "" : "<th>Acciones</th>"}</tr></thead>
                        <tbody id="adm-table-body"></tbody>
                    </table>
                </div>
                <div id="adm-empty" class="adm-empty" style="display:none;">Todavía no hay registros cargados acá (o ninguno coincide con el filtro elegido).</div>
            </div>
        </div>`;

    if (!config.readOnly) {
        document.getElementById("adm-add-btn").addEventListener("click", () => openForm(config, null));
    }
    document.getElementById("adm-search").addEventListener("input", (e) => {
        renderRows(config, aplicarFiltros());
    });

    if (currentModuleKey === "jugadores") {
        await cargarFiltroEquipo();
        document.getElementById("adm-filtro-equipo").addEventListener("change", () => {
            renderRows(config, aplicarFiltros());
        });
    }

    if (currentModuleKey === "campeonatos") {
        document.getElementById("adm-filtro-estado-campeonato").addEventListener("change", () => {
            renderRows(config, aplicarFiltros());
        });
    }

    conectarBotonesEspeciales(config);

    await cargarLookups(true);
    await cargarFiltroTemporada();

    // Al abrir la Tabla de Posiciones se recalcula sola, para que el
    // usuario nunca vea datos viejos ni tenga que apretar "Recalcular".
    if (config.table === "tabla_posiciones") {
        const panelAviso = document.getElementById("adm-extra-panel");
        panelAviso.innerHTML = `<div class="p-2 px-3" style="background:#e7f3ee;color:#0f5132;font-size:.9rem;">
            <i class="fas fa-sync-alt fa-spin"></i> Recalculando tabla de posiciones...
        </div>`;
        try {
            await recalcularTablaPosicionesSilencioso();
            panelAviso.innerHTML = `<div class="p-2 px-3" style="background:#e7f3ee;color:#0f5132;font-size:.9rem;">
                <i class="fas fa-check-circle"></i> Tabla recalculada automáticamente &middot;
                última actualización: <strong>${window.__ultimoRecalculo}</strong>
            </div>`;
        } catch (e) {
            console.warn(e);
            panelAviso.innerHTML = `<div class="p-2 px-3" style="background:#fdeaea;color:#7a1f1f;font-size:.9rem;">
                <i class="fas fa-exclamation-triangle"></i> No se pudo recalcular automáticamente
                (revisa la consola con F12). Probá el botón "Recalcular".
            </div>`;
        }
    }

    const data = await apiGet(config.table).catch(() => null);
    let filas = (data && Array.isArray(data.results)) ? data.results : [];
    if (config.table === "tabla_posiciones") filas = ordenarPosiciones(filas);
    if (config.table === "campeonatos") {
        // El/los campeonato(s) Activo(s) primero, para encontrarlo sin buscar
        filas = filas.slice().sort((a, b) => (a.estado === "Activo" ? 0 : 1) - (b.estado === "Activo" ? 0 : 1));
    }
    currentRows = filas;
    renderRows(config, aplicarFiltros());
}

function aplicarFiltros() {
    let rows = currentRows;

    const filtroTemp = document.getElementById("adm-filtro-temporada");
    if (filtroTemp && filtroTemp.value) {
        rows = rows.filter(r => String(r.id_campeonato) === String(filtroTemp.value));
    }
    const filtroGrupo = document.getElementById("adm-filtro-grupo");
    if (filtroGrupo && filtroGrupo.value) {
        rows = rows.filter(r => {
            if (r.grupo) return String(r.grupo) === String(filtroGrupo.value);
            // goles/tarjetas/resultados no llevan grupo propio: se deduce del partido
            const p = PARTIDOS_CACHE.find(pp => String(pp.id_partido) === String(r.id_partido));
            return p ? String(p.grupo) === String(filtroGrupo.value) : false;
        });
    }
    const filtroEq = document.getElementById("adm-filtro-equipo");
    if (filtroEq && filtroEq.value) {
        rows = rows.filter(r => String(r.id_equipo) === String(filtroEq.value));
    }
    const filtroEstadoCamp = document.getElementById("adm-filtro-estado-campeonato");
    if (filtroEstadoCamp && filtroEstadoCamp.value) {
        rows = rows.filter(r => r.estado === filtroEstadoCamp.value);
    }
    const search = document.getElementById("adm-search");
    if (search && search.value) {
        rows = filterRows(rows, search.value);
    }
    return rows;
}

async function cargarFiltroTemporada() {
    const sel = document.getElementById("adm-filtro-temporada");
    if (!sel) return;
    await cargarPartidosCache();
    const data = await apiGet("campeonatos").catch(() => ({ results: [] }));
    const camps = data.results || [];

    // El/los campeonato(s) Activo(s) van primero, para encontrarlos rápido
    const activos = camps.filter(c => c.estado === "Activo");
    const otros = camps.filter(c => c.estado !== "Activo");

    function opcion(c) {
        const etiqueta = c.temporada ? `${c.nombre} (${c.temporada})` : c.nombre;
        const tagFormato = (c.formato === "Eliminatoria") ? " ⚡ relámpago" : "";
        return `<option value="${c.id_campeonato}">${etiqueta}${tagFormato}${c.estado && c.estado !== "Activo" ? " — " + c.estado : ""}</option>`;
    }

    sel.innerHTML = `<option value="">Todas las temporadas</option>`;
    if (activos.length) sel.innerHTML += `<optgroup label="Activo">${activos.map(opcion).join("")}</optgroup>`;
    if (otros.length) sel.innerHTML += `<optgroup label="Finalizado / Suspendido">${otros.map(opcion).join("")}</optgroup>`;

    sel.addEventListener("change", () => renderRows(MODULES[currentModuleKey], aplicarFiltros()));

    const g = document.getElementById("adm-filtro-grupo");
    if (g) {
        const gruposData = await apiGet("grupos").catch(() => ({ results: [] }));
        const grupos = gruposData.results || [];
        g.innerHTML = `<option value="">Ambos grupos</option>` +
            grupos.map(gr => `<option value="${gr.nombre}">Grupo ${gr.nombre}</option>`).join("");
        g.addEventListener("change", () => renderRows(MODULES[currentModuleKey], aplicarFiltros()));
    }
}

async function cargarFiltroEquipo() {
    const data = await apiGet("equipos", "?orderBy=nombre&orderMode=ASC").catch(() => ({ results: [] }));
    const sel = document.getElementById("adm-filtro-equipo");
    (data.results || []).forEach(eq => {
        sel.innerHTML += `<option value="${eq.id_equipo}">${eq.nombre}</option>`;
    });
}

function extraBotonesPorModulo(key) {
    if (key === "partidos") {
        return `<button class="btn btn-secondary" id="adm-btn-calendario"><i class="fas fa-calendar-plus"></i> Generar Calendario</button>
                <button class="btn btn-secondary" id="adm-btn-playoffs"><i class="fas fa-trophy"></i> Generar Eliminatoria</button>`;
    }
    if (key === "tabla_posiciones") {
        return `<button class="btn btn-secondary" id="adm-btn-recalcular"><i class="fas fa-sync"></i> Recalcular</button>`;
    }
    if (key === "jugadores") {
        return `<button class="btn btn-secondary" id="adm-btn-carga-masiva"><i class="fas fa-file-excel"></i> Carga masiva</button>
                <button class="btn btn-secondary" id="adm-btn-traspaso"><i class="fas fa-exchange-alt"></i> Traspasar jugador</button>`;
    }
    if (key === "equipos") {
        return `<button class="btn btn-secondary" id="adm-btn-sorteo"><i class="fas fa-random"></i> Sorteo de Grupos</button>`;
    }
    return "";
}

function conectarBotonesEspeciales(config) {
    const btnCal = document.getElementById("adm-btn-calendario");
    if (btnCal) btnCal.addEventListener("click", abrirGeneradorCalendario);

    const btnPlayoffs = document.getElementById("adm-btn-playoffs");
    if (btnPlayoffs) btnPlayoffs.addEventListener("click", abrirGeneradorPlayoffs);

    const btnRecalc = document.getElementById("adm-btn-recalcular");
    if (btnRecalc) btnRecalc.addEventListener("click", () => recalcularTablaPosiciones(config));

    const btnCargaMasiva = document.getElementById("adm-btn-carga-masiva");
    if (btnCargaMasiva) btnCargaMasiva.addEventListener("click", () => abrirCargaMasivaJugadores(config));

    const btnSorteo = document.getElementById("adm-btn-sorteo");
    if (btnSorteo) btnSorteo.addEventListener("click", () => abrirSorteoGrupos(config));

    const btnTraspaso = document.getElementById("adm-btn-traspaso");
    if (btnTraspaso) btnTraspaso.addEventListener("click", () => abrirTraspasoJugador(config));
}

/* =====================================================
   CARGA MASIVA DE JUGADORES DE FUTSAL
   (además del "+ Agregar" de a uno, que sigue igual)
   ===================================================== */

const CM_POSICIONES_VALIDAS = ["Arquero", "Jugador de campo"];
let CM_FILAS = [];      // filas actualmente en la vista previa
let CM_EQUIPOS = [];    // cache de equipos para resolver nombre -> id

function cmParsearFecha(valor) {
    if (valor === null || valor === undefined || valor === "") return { ok: true, valor: "" };
    // Excel a veces entrega un objeto Date real (subiendo .xlsx)
    if (valor instanceof Date && !isNaN(valor)) {
        return { ok: true, valor: valor.toISOString().slice(0, 10) };
    }
    // ...o un número de serie de fecha de Excel
    if (typeof valor === "number") {
        const ms = Math.round((valor - 25569) * 86400 * 1000);
        const d = new Date(ms);
        if (!isNaN(d)) return { ok: true, valor: d.toISOString().slice(0, 10) };
    }
    const txt = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return { ok: true, valor: txt };
    const m = txt.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        const [, d, mo, y] = m;
        return { ok: true, valor: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}` };
    }
    return { ok: false, valor: txt };
}

function cmNormalizarPosicion(valor) {
    const norm = normalizarTexto(valor).trim();
    if (norm === "arquero" || norm === "portero" || norm === "arco") return "Arquero";
    if (["jugador de campo", "jugador", "campo", "rotativo", "cierre", "ala", "pivot"].includes(norm)) return "Jugador de campo";
    return null;
}

function cmBuscarEquipo(nombre) {
    const norm = normalizarTexto(nombre).trim();
    if (!norm) return null;
    let eq = CM_EQUIPOS.find(e => normalizarTexto(e.nombre) === norm);
    if (!eq) eq = CM_EQUIPOS.find(e => normalizarTexto(e.nombre).includes(norm) || norm.includes(normalizarTexto(e.nombre)));
    return eq || null;
}

/* Valida UNA fila y devuelve { data, errores:[], avisos:[] } */
function cmValidarFila(fila) {
    const [nombre, apellido, ci, fechaRaw, dorsalRaw, posicionRaw, equipoRaw] = fila;
    const errores = [];
    const avisos = [];

    if (!nombre || !String(nombre).trim()) errores.push("Falta el nombre");
    if (!apellido || !String(apellido).trim()) errores.push("Falta el apellido");

    const equipo = cmBuscarEquipo(equipoRaw);
    if (!equipoRaw || !String(equipoRaw).trim()) errores.push("Falta el equipo");
    else if (!equipo) errores.push(`Equipo "${equipoRaw}" no existe (revisa el nombre exacto)`);

    const posicion = cmNormalizarPosicion(posicionRaw);
    if (!posicionRaw || !String(posicionRaw).trim()) errores.push("Falta la posición");
    else if (!posicion) errores.push(`Posición "${posicionRaw}" inválida (usar: ${CM_POSICIONES_VALIDAS.join(", ")})`);

    const fecha = cmParsearFecha(fechaRaw);
    if (fechaRaw && !fecha.ok) avisos.push(`Fecha de nacimiento "${fechaRaw}" no se entiende, se deja vacía`);

    let dorsal = "";
    if (dorsalRaw !== undefined && dorsalRaw !== null && String(dorsalRaw).trim() !== "") {
        const n = parseInt(dorsalRaw, 10);
        if (isNaN(n) || n <= 0) avisos.push(`Dorsal "${dorsalRaw}" no es un número válido, se deja vacío`);
        else dorsal = n;
    }

    return {
        errores, avisos,
        data: {
            nombre: (nombre || "").toString().trim(),
            apellido: (apellido || "").toString().trim(),
            ci: (ci || "").toString().trim(),
            fecha_nacimiento: fecha.ok ? fecha.valor : "",
            numero_camiseta: dorsal,
            posicion: posicion || "",
            id_equipo: equipo ? equipo.id_equipo : "",
            _equipo_nombre: equipo ? equipo.nombre : (equipoRaw || "")
        }
    };
}

function cmRevisarDorsalesDuplicados(filas) {
    // Marca aviso si dos filas del mismo lote repiten dorsal en el mismo equipo
    const vistos = {};
    filas.forEach(f => {
        if (!f.data.numero_camiseta || !f.data.id_equipo) return;
        const k = f.data.id_equipo + "|" + f.data.numero_camiseta;
        if (vistos[k]) {
            f.avisos.push(`Dorsal ${f.data.numero_camiseta} repetido con otra fila de este mismo equipo en la lista`);
            vistos[k].avisos.push(`Dorsal ${f.data.numero_camiseta} repetido con otra fila de este mismo equipo en la lista`);
        } else {
            vistos[k] = f;
        }
    });
}

async function abrirCargaMasivaJugadores(config) {
    const panel = document.getElementById("adm-extra-panel");
    CM_FILAS = [];
    CM_EQUIPOS = (await apiGet("equipos").catch(() => ({ results: [] }))).results || [];
    const listaEquipos = CM_EQUIPOS.map(e => e.nombre).join(", ");

    panel.innerHTML = `
        <div class="p-3" style="background:#f4f6f5;border:1px solid #e4e9e7;border-radius:6px;">
            <h5><i class="fas fa-file-excel"></i> Carga masiva de Jugadores de Futsal</h5>
            <p class="text-muted mb-2" style="font-size:.9rem;">
                Esto es un ATAJO además del botón "+ Agregar" (que sigue funcionando igual para cargar de a uno o dos jugadores).
                Usá esto cuando tengas que cargar una planilla completa.
            </p>
            <p class="mb-3" style="font-size:.85rem;">
                <strong>Equipos disponibles:</strong> ${listaEquipos || "(no hay equipos cargados todavía)"}<br>
                <strong>Posiciones válidas:</strong> ${CM_POSICIONES_VALIDAS.join(", ")}
            </p>

            <div class="form-row align-items-end mb-3">
                <div class="col-md-4 mb-2">
                    <button class="btn btn-outline-success btn-block" id="cm-btn-plantilla">
                        <i class="fas fa-download"></i> Descargar plantilla Excel
                    </button>
                </div>
                <div class="col-md-4 mb-2">
                    <label class="mb-1" style="font-size:.85rem;">Subir plantilla ya llena (.xlsx)</label>
                    <input type="file" class="form-control" id="cm-archivo" accept=".xlsx,.xls">
                </div>
                <div class="col-md-4 mb-2">
                    <button class="btn btn-secondary btn-block" id="cm-btn-cerrar">Cerrar carga masiva</button>
                </div>
            </div>

            <label class="mb-1" style="font-size:.85rem;">
                O pegá directamente filas copiadas desde Excel (columnas en este orden:
                Nombre, Apellido, CI, Fecha Nacimiento, Dorsal, Posición, Equipo):
            </label>
            <textarea id="cm-textarea" class="form-control mb-2" rows="4"
                placeholder="Pegá acá (Ctrl+V) las filas copiadas de Excel..."></textarea>
            <button class="btn btn-success mb-3" id="cm-btn-procesar-pegado">
                <i class="fas fa-clipboard-check"></i> Procesar filas pegadas
            </button>

            <div id="cm-resumen"></div>
            <div class="table-responsive" id="cm-preview-wrap" style="display:none;">
                <table class="table table-sm table-bordered" id="cm-preview-tabla">
                    <thead class="thead-light">
                        <tr>
                            <th>#</th><th>Nombre</th><th>Apellido</th><th>CI</th>
                            <th>Fecha Nac.</th><th>Dorsal</th><th>Posición</th><th>Equipo</th><th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="cm-preview-body"></tbody>
                </table>
            </div>
            <button class="btn adm-btn-add text-white" id="cm-btn-confirmar" style="display:none;">
                <i class="fas fa-upload"></i> Confirmar carga
            </button>
            <div id="cm-progreso" class="mt-2"></div>
        </div>`;

    document.getElementById("cm-btn-cerrar").addEventListener("click", () => { panel.innerHTML = ""; });
    document.getElementById("cm-btn-plantilla").addEventListener("click", cmDescargarPlantilla);
    document.getElementById("cm-btn-procesar-pegado").addEventListener("click", () => {
        const texto = document.getElementById("cm-textarea").value;
        if (!texto.trim()) { alert("Pegá algunas filas primero."); return; }
        const filasCrudas = texto.split("\n")
            .map(l => l.replace(/\r$/, ""))
            .filter(l => l.trim() !== "")
            .map(l => l.split("\t"));
        cmCargarFilas(filasCrudas);
    });
    document.getElementById("cm-archivo").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
            const hoja = wb.Sheets[wb.SheetNames[0]];
            const filasCrudas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
            cmCargarFilas(filasCrudas);
        };
        reader.readAsArrayBuffer(file);
    });
    document.getElementById("cm-btn-confirmar").addEventListener("click", () => cmConfirmarCarga(config));
}

function cmDescargarPlantilla() {
    const encabezado = ["Nombre", "Apellido", "CI", "Fecha Nacimiento (AAAA-MM-DD)", "Dorsal", "Posición (Arquero o Jugador de campo)", "Equipo (nombre exacto)"];
    const ejemplo = ["Juan", "Pérez", "12345678", "2005-03-15", "10", "Jugador de campo", CM_EQUIPOS[0] ? CM_EQUIPOS[0].nombre : "Amigos"];
    const ws = XLSX.utils.aoa_to_sheet([encabezado, ejemplo]);
    ws["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 24 }, { wch: 8 }, { wch: 30 }, { wch: 22 }];

    const wsEquipos = XLSX.utils.aoa_to_sheet([["Equipos disponibles (copiar el nombre EXACTO)"], ...CM_EQUIPOS.map(e => [e.nombre])]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jugadores");
    XLSX.utils.book_append_sheet(wb, wsEquipos, "Equipos");
    XLSX.writeFile(wb, "Plantilla_Jugadores_Futsal.xlsx");
}

function cmCargarFilas(filasCrudas) {
    // Si la primera fila parece encabezado (dice "nombre"), se descarta
    if (filasCrudas.length && normalizarTexto(filasCrudas[0][0] || "") === "nombre") {
        filasCrudas = filasCrudas.slice(1);
    }
    CM_FILAS = filasCrudas
        .filter(f => f.some(c => String(c ?? "").trim() !== ""))
        .map(f => cmValidarFila(f));
    cmRevisarDorsalesDuplicados(CM_FILAS);
    cmRenderPreview();
}

function cmRenderPreview() {
    const body = document.getElementById("cm-preview-body");
    const wrap = document.getElementById("cm-preview-wrap");
    const resumen = document.getElementById("cm-resumen");
    const btnConfirmar = document.getElementById("cm-btn-confirmar");

    if (CM_FILAS.length === 0) {
        wrap.style.display = "none";
        btnConfirmar.style.display = "none";
        resumen.innerHTML = `<div class="text-muted">No se detectaron filas para cargar.</div>`;
        return;
    }

    const conError = CM_FILAS.filter(f => f.errores.length > 0).length;
    const listas = CM_FILAS.length - conError;

    resumen.innerHTML = `<div class="p-2 mb-2" style="background:#e7f3ee;border-radius:4px;">
        <strong>${listas} de ${CM_FILAS.length}</strong> jugadores de futsal listos para cargar.
        ${conError > 0 ? `<span class="text-danger ml-2">${conError} fila(s) con error (no se van a cargar hasta corregirlas).</span>` : ""}
    </div>`;

    body.innerHTML = CM_FILAS.map((f, i) => {
        const d = f.data;
        const estadoHtml = f.errores.length
            ? `<span class="text-danger" title="${f.errores.join(" · ")}"><i class="fas fa-times-circle"></i> ${f.errores[0]}</span>`
            : (f.avisos.length
                ? `<span class="text-warning" title="${f.avisos.join(" · ")}"><i class="fas fa-exclamation-triangle"></i> Con aviso</span>`
                : `<span class="text-success"><i class="fas fa-check-circle"></i> OK</span>`);
        return `<tr data-idx="${i}" style="${f.errores.length ? "background:#fdeaea;" : ""}">
            <td>${i + 1}</td>
            <td><input class="form-control form-control-sm cm-cell" data-campo="nombre" value="${d.nombre}"></td>
            <td><input class="form-control form-control-sm cm-cell" data-campo="apellido" value="${d.apellido}"></td>
            <td><input class="form-control form-control-sm cm-cell" data-campo="ci" value="${d.ci}"></td>
            <td><input class="form-control form-control-sm cm-cell" data-campo="fecha_nacimiento" value="${d.fecha_nacimiento}" placeholder="AAAA-MM-DD"></td>
            <td><input class="form-control form-control-sm cm-cell" data-campo="numero_camiseta" value="${d.numero_camiseta}"></td>
            <td><input class="form-control form-control-sm cm-cell" data-campo="posicion" value="${d.posicion}"></td>
            <td><input class="form-control form-control-sm cm-cell" data-campo="_equipo_nombre" value="${d._equipo_nombre}"></td>
            <td>${estadoHtml}</td>
        </tr>`;
    }).join("");

    document.getElementById("cm-preview-wrap").style.display = "";
    document.getElementById("cm-btn-confirmar").style.display = listas > 0 ? "" : "none";
    document.getElementById("cm-btn-confirmar").textContent = `Confirmar carga de ${listas} jugador(es)`;

    // Reeditar una celda revalida esa fila sola, sin perder el resto
    body.querySelectorAll(".cm-cell").forEach(input => {
        input.addEventListener("change", (e) => {
            const tr = e.target.closest("tr");
            const idx = Number(tr.dataset.idx);
            const filaOriginal = CM_FILAS[idx].data;
            const nuevaFila = [
                tr.querySelector('[data-campo="nombre"]').value,
                tr.querySelector('[data-campo="apellido"]').value,
                tr.querySelector('[data-campo="ci"]').value,
                tr.querySelector('[data-campo="fecha_nacimiento"]').value,
                tr.querySelector('[data-campo="numero_camiseta"]').value,
                tr.querySelector('[data-campo="posicion"]').value,
                tr.querySelector('[data-campo="_equipo_nombre"]').value
            ];
            CM_FILAS[idx] = cmValidarFila(nuevaFila);
            cmRevisarDorsalesDuplicados(CM_FILAS);
            cmRenderPreview();
        });
    });
}

async function cmConfirmarCarga(config) {
    const progreso = document.getElementById("cm-progreso");
    const validas = CM_FILAS.filter(f => f.errores.length === 0);
    if (validas.length === 0) { alert("No hay filas listas para cargar."); return; }

    let creados = 0, fallidos = 0;
    for (const f of validas) {
        const data = { ...f.data };
        delete data._equipo_nombre;
        try {
            const res = await apiCreate("jugadores", data, "id_jugador");
            if (res && (res.status === 200 || res.status === 201 || res.status === undefined)) creados++;
            else fallidos++;
        } catch (e) { fallidos++; }
        progreso.innerHTML = `Cargando... ${creados} cargados, ${fallidos} con error`;
    }

    progreso.innerHTML = `<strong>Listo:</strong> ${creados} jugador(es) de futsal cargados correctamente.
        ${fallidos > 0 ? `<span class="text-danger">${fallidos} fallaron al guardar (revisa la consola con F12).</span>` : ""}`;

    CM_FILAS = [];
    document.getElementById("cm-preview-wrap").style.display = "none";
    document.getElementById("cm-btn-confirmar").style.display = "none";
    document.getElementById("cm-textarea").value = "";

    await cargarLookups(true);
    if (currentModuleKey === "jugadores") await cargarFiltroEquipo();
    const data = await apiGet("jugadores").catch(() => null);
    currentRows = (data && Array.isArray(data.results)) ? data.results : [];
    renderRows(config, aplicarFiltros());
}

/* =====================================================
   PUNTO 4: SORTEO AUTOMÁTICO DE GRUPOS
   ===================================================== */

let SG_EQUIPOS = [];
let SG_GRUPOS_EXISTENTES = [];
let SG_PREVIEW = {}; // { "A": [equipo, equipo...], "B": [...] }

function sgBarajar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* Genera N nombres de grupo: primero reutiliza los que ya existen,
   y si hacen falta más, sigue con la siguiente letra libre del abecedario. */
function sgGenerarNombresGrupos(n, existentes) {
    const nombresExistentes = existentes.map(g => g.nombre).sort();
    const nombres = nombresExistentes.slice(0, n);
    let letra = 65; // 'A'
    while (nombres.length < n) {
        const candidato = String.fromCharCode(letra);
        if (!nombres.includes(candidato)) nombres.push(candidato);
        letra++;
        if (letra > 90) break; // freno de seguridad (Z)
    }
    return nombres.slice(0, n);
}

function sgRepartir(equipos, nombresGrupos) {
    const barajados = sgBarajar(equipos);
    const resultado = {};
    nombresGrupos.forEach(n => resultado[n] = []);
    barajados.forEach((eq, i) => {
        const grupo = nombresGrupos[i % nombresGrupos.length];
        resultado[grupo].push(eq);
    });
    return resultado;
}

let SG_SELECCION = new Set();

async function abrirSorteoGrupos(config) {
    const panel = document.getElementById("adm-extra-panel");
    SG_EQUIPOS = (await apiGet("equipos").catch(() => ({ results: [] }))).results || [];
    SG_GRUPOS_EXISTENTES = (await apiGet("grupos").catch(() => ({ results: [] }))).results || [];
    const campeonatosSorteo = (await apiGet("campeonatos").catch(() => ({ results: [] }))).results || [];

    if (SG_EQUIPOS.length < 2) {
        panel.innerHTML = `<div class="p-3 alert alert-warning">Necesitás al menos 2 equipos cargados para poder sortear grupos.</div>`;
        return;
    }

    SG_SELECCION = new Set(SG_EQUIPOS.map(e => String(e.id_equipo)));

    // El filtro se arma con los grupos que los equipos REALMENTE tienen
    // guardados (no con el catálogo del módulo Grupos), para que nunca
    // se desincronicen y el filtro siempre encuentre algo.
    const gruposReales = [...new Set(SG_EQUIPOS.map(e => e.grupo).filter(Boolean))].sort();
    const opcionesFiltro = gruposReales.map(g => `<option value="${g}">Solo equipos del Grupo ${g}</option>`).join("");

    panel.innerHTML = `
        <div class="p-3" style="background:#f4f6f5;border:1px solid #e4e9e7;border-radius:6px;">
            <h5><i class="fas fa-random"></i> Sorteo Automático de Grupos</h5>
            <p class="text-muted mb-2" style="font-size:.9rem;">
                1) Elegí en "Ver equipos" a quiénes va a afectar el sorteo (esto también marca/desmarca solo).
                2) Indicá cuántos grupos. 3) Sorteá y revisá la vista previa antes de guardar.
                <strong>Podés destildar equipos sueltos a mano en la lista de abajo.</strong>
            </p>

            <div class="form-row align-items-end mb-2">
                <div class="col-md-5">
                    <label class="mb-1">Campeonato *</label>
                    <select class="form-control" id="sg-campeonato">
                        <option value="">-- Selecciona campeonato --</option>
                        ${campeonatosSorteo.map(c => `<option value="${c.id_campeonato}">${c.nombre}${c.temporada ? " ("+c.temporada+")" : ""}</option>`).join("")}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="mb-1">Ver equipos (esto define quién participa)</label>
                    <select class="form-control" id="sg-filtro">
                        <option value="">Todos los equipos (${SG_EQUIPOS.length})</option>
                        <option value="__SIN__">Solo los que no tienen grupo</option>
                        ${opcionesFiltro}
                    </select>
                </div>
                <div class="col-md-3 mb-1">
                    <button class="btn btn-sm btn-outline-secondary" id="sg-btn-todos">Marcar todos</button>
                    <button class="btn btn-sm btn-outline-secondary" id="sg-btn-ninguno">Desmarcar todos</button>
                    <strong class="ml-2" id="sg-contador"></strong>
                </div>
            </div>
            <div id="sg-lista" class="mb-3" style="max-height:200px;overflow-y:auto;border:1px solid #e4e9e7;border-radius:6px;padding:10px;background:#fff;"></div>

            <div class="form-row align-items-end">
                <div class="col-md-3">
                    <label>Cantidad de grupos</label>
                    <input type="number" min="2" max="26" class="form-control" id="sg-cantidad" value="2">
                </div>
                <div class="col-md-4">
                    <label>Nombres de los grupos <small class="text-muted">(opcional)</small></label>
                    <input type="text" class="form-control" id="sg-nombres" placeholder="Ej: A, B  (vacío = automático)">
                </div>
                <div class="col-md-3">
                    <button class="btn btn-success btn-block" id="sg-btn-sortear"><i class="fas fa-dice"></i> Sortear</button>
                </div>
                <div class="col-md-2">
                    <button class="btn btn-secondary btn-block" id="sg-btn-cerrar">Cerrar</button>
                </div>
            </div>
            <div id="sg-preview" class="mt-3"></div>
        </div>`;

    document.getElementById("sg-btn-cerrar").addEventListener("click", () => { panel.innerHTML = ""; });
    document.getElementById("sg-btn-sortear").addEventListener("click", sgEjecutarSorteo);

    // Cambiar el filtro AHORA SÍ sincroniza la selección: filtrar es elegir.
    document.getElementById("sg-filtro").addEventListener("change", () => {
        SG_SELECCION = new Set(sgEquiposVisibles().map(e => String(e.id_equipo)));
        sgRenderLista();
    });
    document.getElementById("sg-btn-todos").addEventListener("click", () => {
        document.getElementById("sg-filtro").value = "";
        SG_SELECCION = new Set(SG_EQUIPOS.map(e => String(e.id_equipo)));
        sgRenderLista();
    });
    document.getElementById("sg-btn-ninguno").addEventListener("click", () => { SG_SELECCION = new Set(); sgRenderLista(); });
    sgRenderLista();
}

function sgEquiposVisibles() {
    const filtro = document.getElementById("sg-filtro").value;
    return SG_EQUIPOS.filter(e => {
        if (!filtro) return true;
        if (filtro === "__SIN__") return !e.grupo;
        return normalizarTexto(e.grupo) === normalizarTexto(filtro);
    });
}

function sgActualizarContador() {
    document.getElementById("sg-contador").textContent = `${SG_SELECCION.size} equipo(s) van a entrar al sorteo`;
}

function sgRenderLista() {
    const lista = document.getElementById("sg-lista");
    const visibles = sgEquiposVisibles();
    lista.innerHTML = visibles.map(e => `
        <div class="form-check form-check-inline" style="min-width:230px;">
            <input class="form-check-input sg-chk" type="checkbox" value="${e.id_equipo}" id="sg-eq-${e.id_equipo}" ${SG_SELECCION.has(String(e.id_equipo)) ? "checked" : ""}>
            <label class="form-check-label" for="sg-eq-${e.id_equipo}">${e.nombre}
                <span class="badge badge-secondary">${e.grupo ? "Grupo actual (referencia) " + e.grupo : "sin grupo global"}</span></label>
        </div>`).join("") || `<span class="text-muted">No hay equipos con ese filtro.</span>`;
    lista.querySelectorAll(".sg-chk").forEach(chk => chk.addEventListener("change", () => {
        if (chk.checked) SG_SELECCION.add(chk.value); else SG_SELECCION.delete(chk.value);
        sgActualizarContador();
    }));
    sgActualizarContador();
}

function sgEjecutarSorteo() {
    const idCampeonatoSorteo = document.getElementById("sg-campeonato")?.value;
    if (!idCampeonatoSorteo) { alert("Primero seleccioná el campeonato. El grupo se guarda por campeonato para no mezclar torneos."); return; }
    const seleccionados = SG_EQUIPOS.filter(e => SG_SELECCION.has(String(e.id_equipo)));
    if (seleccionados.length < 2) { alert("Marcá al menos 2 equipos para sortear."); return; }

    const n = Math.max(2, Math.min(26, parseInt(document.getElementById("sg-cantidad").value, 10) || 2));
    if (n > seleccionados.length) {
        alert(`No se pueden armar ${n} grupos con solo ${seleccionados.length} equipos marcados.`);
        return;
    }

    const texto = document.getElementById("sg-nombres").value.trim();
    let nombresGrupos;
    if (texto) {
        nombresGrupos = texto.split(",").map(t => t.trim()).filter(Boolean).map(t => {
            // si coincide con un grupo que ya existe (sin importar mayúsculas), se usa esa misma grafía
            const existente = SG_GRUPOS_EXISTENTES.find(g => normalizarTexto(g.nombre) === normalizarTexto(t));
            return existente ? existente.nombre : t;
        });
        if (nombresGrupos.length !== n) {
            alert(`Pediste ${n} grupos pero escribiste ${nombresGrupos.length} nombre(s). Tienen que coincidir (o dejá el campo vacío).`);
            return;
        }
        if (new Set(nombresGrupos.map(x => x.toLowerCase())).size !== nombresGrupos.length) {
            alert("Hay nombres de grupo repetidos.");
            return;
        }
    } else {
        // automático: solo se reutilizan grupos de una letra (A, B, C...), así un grupo
        // con nombre propio (ej. "Insti") no se cuela en un sorteo que no es el suyo
        const soloLetras = SG_GRUPOS_EXISTENTES.filter(g => /^[A-Za-z]$/.test(g.nombre));
        nombresGrupos = sgGenerarNombresGrupos(n, soloLetras);
    }

    SG_PREVIEW = sgRepartir(seleccionados, nombresGrupos);
    sgRenderPreview(nombresGrupos, seleccionados.length);
}

function sgRenderPreview(nombresGrupos, totalSeleccionados) {
    const cont = document.getElementById("sg-preview");
    const nuevosGrupos = nombresGrupos.filter(n => !SG_GRUPOS_EXISTENTES.some(g => g.nombre === n));
    const noTocados = SG_EQUIPOS.length - totalSeleccionados;

    cont.innerHTML = `
        <div class="row">
            ${nombresGrupos.map(g => `
                <div class="col-md-3 mb-3">
                    <div style="border:1px solid #e4e9e7;border-radius:6px;overflow:hidden;">
                        <div style="background:#0f5132;color:#fff;padding:6px 10px;font-weight:700;">
                            Grupo ${g} <span style="font-weight:400;font-size:.85rem;">(${SG_PREVIEW[g].length} equipos)</span>
                        </div>
                        <ul class="list-group list-group-flush">
                            ${SG_PREVIEW[g].map(eq => `<li class="list-group-item py-1">${eq.nombre}</li>`).join("")}
                        </ul>
                    </div>
                </div>`).join("")}
        </div>
        ${noTocados > 0 ? `<div class="alert alert-secondary py-2" style="font-size:.85rem;">
            ${noTocados} equipo(s) no marcado(s) quedan como están, sin cambios.</div>` : ""}
        ${nuevosGrupos.length ? `<div class="alert alert-info py-2" style="font-size:.85rem;">
            Se van a crear estos grupos nuevos en el módulo "Grupos": <strong>${nuevosGrupos.join(", ")}</strong>
        </div>` : ""}
        <button class="btn btn-secondary mr-2" id="sg-btn-resortear"><i class="fas fa-redo"></i> Volver a sortear</button>
        <button class="btn adm-btn-add text-white" id="sg-btn-confirmar"><i class="fas fa-check"></i> Confirmar sorteo y guardar</button>
        <div id="sg-progreso" class="mt-2"></div>`;

    document.getElementById("sg-btn-resortear").addEventListener("click", sgEjecutarSorteo);
    document.getElementById("sg-btn-confirmar").addEventListener("click", () => sgConfirmarSorteo(nombresGrupos));
}

async function sgConfirmarSorteo(nombresGrupos) {
    const progreso = document.getElementById("sg-progreso");
    progreso.innerHTML = "Guardando sorteo...";

    // 1) Crear en el módulo Grupos los nombres que todavía no existan
    for (const nombre of nombresGrupos) {
        if (!SG_GRUPOS_EXISTENTES.some(g => g.nombre === nombre)) {
            try { await apiCreate("grupos", { nombre, descripcion: `Grupo ${nombre} (sorteo automático)` }, "id_grupo"); }
            catch (e) { console.warn("No se pudo crear el grupo", nombre, e); }
        }
    }

    // 2) Guardar la asignación SOLO para este campeonato.
    // Nunca modificamos equipos.grupo porque ese dato global fue la causa
    // de que un segundo torneo pisara los grupos del primero.
    const idCampeonatoSorteo = document.getElementById("sg-campeonato").value;
    const existentesCE = (await apiGet("campeonato_equipos", `?linkTo=id_campeonato&equalTo=${idCampeonatoSorteo}`).catch(() => ({ results: [] }))).results || [];
    let ok = 0, fallidos = 0;
    for (const nombre of nombresGrupos) {
        for (const eq of SG_PREVIEW[nombre]) {
            try {
                const viejo = existentesCE.find(x => String(x.id_equipo) === String(eq.id_equipo));
                const payload = { id_campeonato: idCampeonatoSorteo, id_equipo: eq.id_equipo, grupo: nombre };
                if (viejo) await apiUpdate("campeonato_equipos", viejo.id_campeonato_equipo, payload, "id_campeonato_equipo");
                else await apiCreate("campeonato_equipos", payload, "id_campeonato_equipo");
                ok++;
            } catch (e) { fallidos++; console.warn("No se pudo guardar inscripción", eq.nombre, e); }
        }
        progreso.innerHTML = `Guardando... ${ok} equipos inscritos${fallidos ? `, ${fallidos} con error` : ""}`;
    }

    progreso.innerHTML = `<strong>Listo:</strong> ${ok} equipos inscritos en el campeonato y repartidos en ${nombresGrupos.length} grupos.
        <br><small>Los grupos del otro campeonato no fueron modificados.</small>
        ${fallidos ? `<span class="text-danger">${fallidos} fallaron.</span>` : ""}`;

    await cargarLookups(true);
    const data = await apiGet("equipos").catch(() => null);
    currentRows = (data && Array.isArray(data.results)) ? data.results : [];
    renderRows(MODULES.equipos, aplicarFiltros());
}

/* =====================================================
   PUNTO 5: TRASPASOS / MOVIMIENTOS DE JUGADORES
   ===================================================== */

async function abrirTraspasoJugador(config) {
    const panel = document.getElementById("adm-extra-panel");
    const [jugadoresData, equiposData] = await Promise.all([
        apiGet("jugadores").catch(() => ({ results: [] })),
        apiGet("equipos").catch(() => ({ results: [] }))
    ]);
    const jugadores = jugadoresData.results || [];
    const equipos = equiposData.results || [];
    const mapaEquipos = {};
    equipos.forEach(e => mapaEquipos[e.id_equipo] = e.nombre);

    panel.innerHTML = `
        <div class="p-3" style="background:#f4f6f5;border:1px solid #e4e9e7;border-radius:6px;">
            <h5><i class="fas fa-exchange-alt"></i> Traspasar Jugador</h5>
            <p class="text-muted mb-2" style="font-size:.9rem;">
                Cambia al jugador de equipo. Sus goles y tarjetas de partidos ya jugados quedan
                tal cual, con el equipo con el que los hizo en su momento — no se tocan.
            </p>
            <div class="form-row">
                <div class="col-md-4">
                    <label>Jugador *</label>
                    <select class="form-control" id="tr-jugador">
                        <option value="">-- Elegir --</option>
                        ${jugadores.map(j => `<option value="${j.id_jugador}">${j.nombre} ${j.apellido} (${mapaEquipos[j.id_equipo] || "sin equipo"})</option>`).join("")}
                    </select>
                </div>
                <div class="col-md-4">
                    <label>Equipo destino *</label>
                    <select class="form-control" id="tr-equipo-destino">
                        <option value="">-- Elegir --</option>
                        ${equipos.map(e => `<option value="${e.id_equipo}">${e.nombre}</option>`).join("")}
                    </select>
                </div>
                <div class="col-md-4">
                    <label>Fecha del traspaso *</label>
                    <input type="date" class="form-control" id="tr-fecha" value="${new Date().toISOString().slice(0,10)}">
                </div>
            </div>
            <div class="form-group mt-2">
                <label>Observación</label>
                <input type="text" class="form-control" id="tr-observacion" placeholder="Ej: préstamo, pase definitivo, etc.">
            </div>
            <button class="btn adm-btn-add text-white" id="tr-btn-confirmar"><i class="fas fa-check"></i> Confirmar traspaso</button>
            <button class="btn btn-secondary ml-2" id="tr-btn-cerrar">Cerrar</button>
            <div id="tr-progreso" class="mt-2"></div>
            <hr>
            <div id="tr-historial"></div>
        </div>`;

    document.getElementById("tr-btn-cerrar").addEventListener("click", () => { panel.innerHTML = ""; });
    document.getElementById("tr-btn-confirmar").addEventListener("click", () => trConfirmarTraspaso(config, jugadores, mapaEquipos));
    document.getElementById("tr-jugador").addEventListener("change", (e) => trMostrarHistorial(e.target.value, mapaEquipos));
}

async function trConfirmarTraspaso(config, jugadores, mapaEquipos) {
    const idJugador = document.getElementById("tr-jugador").value;
    const idDestino = document.getElementById("tr-equipo-destino").value;
    const fecha = document.getElementById("tr-fecha").value;
    const observacion = document.getElementById("tr-observacion").value;
    const progreso = document.getElementById("tr-progreso");

    if (!idJugador) { alert("Elegí un jugador."); return; }
    if (!idDestino) { alert("Elegí el equipo destino."); return; }
    if (!fecha) { alert("Elegí la fecha del traspaso."); return; }

    const jugador = jugadores.find(j => String(j.id_jugador) === String(idJugador));
    if (String(jugador.id_equipo) === String(idDestino)) {
        alert(`${jugador.nombre} ${jugador.apellido} ya está en ese equipo.`);
        return;
    }

    progreso.innerHTML = "Guardando traspaso...";
    try {
        // 1) queda registrado el movimiento (origen = equipo actual, ANTES de cambiarlo)
        await apiCreate("traspasos", {
            id_jugador: idJugador,
            id_equipo_origen: jugador.id_equipo,
            id_equipo_destino: idDestino,
            fecha: fecha,
            observacion: observacion || ""
        }, "id_traspaso");

        // 2) recién ahora se actualiza el equipo actual del jugador
        await apiUpdate("jugadores", idJugador, { id_equipo: idDestino }, "id_jugador");

        progreso.innerHTML = `<span class="text-success"><i class="fas fa-check-circle"></i>
            ${jugador.nombre} ${jugador.apellido} pasó de ${mapaEquipos[jugador.id_equipo] || "-"} a ${mapaEquipos[idDestino]}.</span>`;

        jugador.id_equipo = idDestino; // refrescar en memoria para el desplegable
        await trMostrarHistorial(idJugador, mapaEquipos);

        if (currentModuleKey === "jugadores") {
            await cargarLookups(true);
            await cargarFiltroEquipo();
            const data = await apiGet("jugadores").catch(() => null);
            currentRows = (data && Array.isArray(data.results)) ? data.results : [];
            renderRows(config, aplicarFiltros());
        }
    } catch (e) {
        progreso.innerHTML = `<span class="text-danger">No se pudo guardar el traspaso: ${e.message}</span>`;
    }
}

async function trMostrarHistorial(idJugador, mapaEquipos) {
    const cont = document.getElementById("tr-historial");
    if (!idJugador) { cont.innerHTML = ""; return; }
    const data = await apiGet("traspasos").catch(() => ({ results: [] }));
    const propios = (data.results || [])
        .filter(t => String(t.id_jugador) === String(idJugador))
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

    if (propios.length === 0) {
        cont.innerHTML = `<p class="text-muted" style="font-size:.85rem;">Este jugador todavía no tiene traspasos registrados.</p>`;
        return;
    }
    cont.innerHTML = `<h6>Historial de traspasos</h6>
        <table class="table table-sm">
            <thead><tr><th>Fecha</th><th>De</th><th>A</th><th>Observación</th></tr></thead>
            <tbody>
                ${propios.map(t => `<tr>
                    <td>${t.fecha}</td>
                    <td>${mapaEquipos[t.id_equipo_origen] || "-"}</td>
                    <td>${mapaEquipos[t.id_equipo_destino] || "-"}</td>
                    <td>${t.observacion || ""}</td>
                </tr>`).join("")}
            </tbody>
        </table>`;
}



const TITULOS_COLUMNA = {
    id_campeonato: "Temporada / Campeonato",
    id_equipo: "Equipo",
    id_equipo_local: "Local",
    id_equipo_visitante: "Visitante",
    id_jugador: "Jugador",
    id_partido: "Partido",
    grupo: "Grupo",
    jornada: "Jornada",
    partidos_jugados: "PJ",
    partidos_ganados: "PG",
    partidos_empatados: "PE",
    partidos_perdidos: "PP",
    goles_favor: "GF",
    goles_contra: "GC",
    diferencia_goles: "DG",
    puntos: "Pts",
    goles_local: "Goles local",
    goles_visitante: "Goles visitante",
    numero_camiseta: "N° camiseta",
    fecha_publicacion: "Fecha",
    tipo_piso: "Tipo de piso",
    color_uniforme: "Uniforme"
};

function tituloColumna(c) {
    if (TITULOS_COLUMNA[c]) return TITULOS_COLUMNA[c];
    return String(c).replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase());
}

function normalizarTexto(txt) {
    return String(txt ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // quita tildes/acentos
}

function filterRows(rows, term) {
    const termNorm = normalizarTexto(term).trim();
    if (!termNorm) return rows;
    return rows.filter(row => Object.values(row).some(v => normalizarTexto(v).includes(termNorm)));
}

function renderRows(config, rows) {
    const tbody = document.getElementById("adm-table-body");
    const empty = document.getElementById("adm-empty");
    if (!rows || rows.length === 0) {
        tbody.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";
    tbody.innerHTML = rows.map(row => {
        const cells = config.columns.map(c => {
            if (c === "grupo") {
                const g = row.grupo || "-";
                return `<td><span class="badge" style="background:#0f5132;color:#fff;">Grupo ${g}</span></td>`;
            }
            return `<td>${etiquetaColumna(c, row[c])}</td>`;
        }).join("");
        const pkVal = row[config.pk];
        const puedeEliminar = esAdministrador();
        const linkHistorial = (config.table === "jugadores")
            ? `<a class="adm-historial" data-id="${pkVal}" title="Ver traspasos"><i class="fas fa-exchange-alt"></i> Historial</a>`
            : "";
        const acciones = config.readOnly ? "" : `
            <td class="adm-actions">
                <a class="adm-edit" data-id="${pkVal}"><i class="fas fa-edit"></i> Editar</a>
                ${linkHistorial}
                ${puedeEliminar ? `<a class="adm-del" data-id="${pkVal}"><i class="fas fa-trash"></i> Eliminar</a>` : ""}
            </td>`;
        return `<tr>${cells}${acciones}</tr>`;
    }).join("");

    if (!config.readOnly) {
        tbody.querySelectorAll(".adm-edit").forEach(a => {
            a.addEventListener("click", () => {
                const row = currentRows.find(r => String(r[config.pk]) === a.dataset.id);
                openForm(config, row);
            });
        });
        tbody.querySelectorAll(".adm-del").forEach(a => {
            a.addEventListener("click", () => handleDelete(config, a.dataset.id));
        });
        tbody.querySelectorAll(".adm-historial").forEach(a => {
            a.addEventListener("click", () => verHistorialJugador(a.dataset.id));
        });
    }
}

async function verHistorialJugador(idJugador) {
    await abrirTraspasoJugador(MODULES.jugadores);
    const sel = document.getElementById("tr-jugador");
    if (sel) {
        sel.value = idJugador;
        sel.dispatchEvent(new Event("change"));
    }
    document.getElementById("adm-extra-panel").scrollIntoView({ behavior: "smooth" });
}


/* ---------------------------------------------------
   Formulario (modal) de Agregar / Editar
   --------------------------------------------------- */

async function openForm(config, row) {
    editingId = row ? row[config.pk] : null;
    document.getElementById("admModalTitle").textContent = row ? `Editar ${config.title}` : `Agregar ${config.title}`;

    const body = document.getElementById("admModalBody");
    body.innerHTML = `<div class="text-center text-muted py-3">Cargando formulario...</div>`;
    $("#admModal").modal("show");

    const fieldsHtml = await Promise.all(config.fields.map(f => renderField(f, row)));
    body.innerHTML = fieldsHtml.join("");

    const form = document.getElementById("admForm");
    form.onsubmit = (e) => {
        e.preventDefault();
        saveForm(config);
    };

    // En Goles y Tarjetas: el select de Jugador solo debe mostrar a
    // los jugadores de los dos equipos que juegan ese partido, no a
    // todos los jugadores de la liga.
    const tienePartidoYJugador = config.fields.some(f => f.key === "id_partido") && config.fields.some(f => f.key === "id_jugador");
    if (tienePartidoYJugador) {
        const selPartido = document.getElementById("fld-id_partido");
        const selJugador = document.getElementById("fld-id_jugador");
        if (selPartido && selJugador) {
            const actualizar = () => filtrarJugadoresPorPartido(selPartido.value, selJugador, row ? row.id_jugador : null);
            selPartido.addEventListener("change", () => filtrarJugadoresPorPartido(selPartido.value, selJugador, null));
            if (selPartido.value) actualizar();
        }
    }

    // Los campos de tipo "image" tienen su propio <input type="file">
    // que sube el archivo de verdad al servidor (api/upload.php) en
    // cuanto se elige, y guarda la URL resultante en un campo oculto.
    config.fields.filter(f => f.type === "image").forEach(f => {
        const inputFile = document.getElementById(`file-${f.key}`);
        if (!inputFile) return;
        inputFile.addEventListener("change", () => subirImagenDeCampo(f.key, inputFile));
    });
}

async function subirImagenDeCampo(key, inputFile) {
    const archivo = inputFile.files[0];
    if (!archivo) return;

    const estado = document.getElementById(`estado-${key}`);
    const campoOculto = document.getElementById(`fld-${key}`);
    const preview = document.getElementById(`preview-${key}`);

    estado.textContent = "Subiendo imagen...";

    const formData = new FormData();
    formData.append("imagen", archivo);

    try {
        const res = await fetch(API_BASE_URL.replace("index.php", "upload.php"), {
            method: "POST",
            headers: { "Authorization": API_KEY },
            body: formData
        });
        const data = await res.json();

        if (data && data.status === 200 && data.results && data.results.url) {
            campoOculto.value = data.results.url;
            preview.src = resolverUrlImagen(data.results.url);
            preview.style.display = "inline-block";
            estado.textContent = "Imagen subida correctamente.";
        } else {
            estado.textContent = "No se pudo subir: " + (data?.results ?? "error desconocido");
        }
    } catch (err) {
        estado.textContent = "No se pudo conectar con la API para subir la imagen.";
    }
}

function resolverUrlImagen(valor) {
    if (!valor) return "";
    if (valor.startsWith("http://") || valor.startsWith("https://")) return valor;
    // rutas guardadas como "uploads/xxxx.jpg" son relativas a la carpeta api/
    return `../api/${valor}`;
}

async function filtrarJugadoresPorPartido(idPartido, selJugador, valorAConservar) {
    if (!idPartido) {
        selJugador.innerHTML = `<option value="">-- Primero elige un partido --</option>`;
        return;
    }
    const [partidosData, jugadoresData] = await Promise.all([
        apiGet("partidos").catch(() => ({ results: [] })),
        apiGet("jugadores").catch(() => ({ results: [] }))
    ]);
    const partido = (partidosData.results || []).find(p => String(p.id_partido) === String(idPartido));
    if (!partido) {
        selJugador.innerHTML = `<option value="">-- Partido no encontrado --</option>`;
        return;
    }
    const jugadores = (jugadoresData.results || []).filter(j =>
        String(j.id_equipo) === String(partido.id_equipo_local) || String(j.id_equipo) === String(partido.id_equipo_visitante)
    );
    const valorActual = valorAConservar ?? selJugador.value;
    selJugador.innerHTML = `<option value="">-- Selecciona --</option>` + jugadores.map(j =>
        `<option value="${j.id_jugador}" ${String(j.id_jugador) === String(valorActual) ? "selected" : ""}>${j.nombre} ${j.apellido} (${j.numero_camiseta ?? "s/n"})</option>`
    ).join("");
    if (jugadores.length === 0) {
        selJugador.innerHTML = `<option value="">-- Ninguno de los 2 equipos tiene jugadores cargados --</option>`;
    }
}

async function renderField(field, row) {
    const value = row ? (row[field.key] ?? "") : (field.default ?? "");
    const hint = field.hint ? `<small class="form-text text-muted">${field.hint}</small>` : "";

    if (field.type === "image") {
        const previewSrc = value ? resolverUrlImagen(value) : "";
        return `<div class="form-group">
                    <label>${field.label}</label>
                    <div class="d-flex align-items-center" style="gap:12px;">
                        <img id="preview-${field.key}" src="${previewSrc}" alt=""
                             style="width:56px;height:56px;object-fit:cover;border-radius:6px;background:#eef1f0;${value ? '' : 'display:none;'}">
                        <input type="file" class="form-control-file" id="file-${field.key}" accept="image/*">
                    </div>
                    <input type="hidden" name="${field.key}" id="fld-${field.key}" value="${value}">
                    <small class="form-text text-muted" id="estado-${field.key}">
                        ${field.hint || "Sube una imagen (JPG, PNG, GIF o WEBP, máx. 3 MB)."}
                    </small>
                </div>`;
    }

    if (field.type === "dynamic-select") {
        const data = await apiGet(field.groupModule).catch(() => ({ results: [] }));
        const filas = data.results || [];
        const valorFinal = value || (filas[0] ? filas[0].nombre : "");
        const opts = filas.map(f =>
            `<option value="${f.nombre}" ${String(f.nombre) === String(valorFinal) ? "selected" : ""}>${f.nombre}</option>`
        ).join("");
        return `<div class="form-group">
                    <label>${field.label}</label>
                    <select class="form-control" name="${field.key}" ${field.required ? "required" : ""}>
                        ${opts || `<option value="">-- Cargá al menos un grupo en el módulo "Grupos" --</option>`}
                    </select>
                    ${hint}
                </div>`;
    }

    if (field.type === "select") {
        const opts = field.options.map(o =>
            `<option value="${o.value}" ${String(o.value) === String(value) ? "selected" : ""}>${o.label}</option>`
        ).join("");
        return `<div class="form-group">
                    <label>${field.label}</label>
                    <select class="form-control" name="${field.key}" ${field.required ? "required" : ""}>${opts}</select>
                    ${hint}
                </div>`;
    }

    if (field.type === "fk") {
        const { rows, config: fkConfig } = await resolveFk(field);
        const opts = rows.map(r =>
            `<option value="${r[fkConfig.pk]}" ${String(r[fkConfig.pk]) === String(value) ? "selected" : ""}>${fkRowLabel(fkConfig, r)}</option>`
        ).join("");
        return `<div class="form-group">
                    <label>${field.label}</label>
                    <select class="form-control" id="fld-${field.key}" name="${field.key}" ${field.required ? "required" : ""}>
                        <option value="">-- Selecciona --</option>${opts}
                    </select>
                    ${hint}
                </div>`;
    }

    if (field.type === "textarea") {
        return `<div class="form-group">
                    <label>${field.label}</label>
                    <textarea class="form-control" name="${field.key}" rows="4" ${field.required ? "required" : ""}>${value}</textarea>
                    ${hint}
                </div>`;
    }

    return `<div class="form-group">
                <label>${field.label}</label>
                <input type="${field.type}" class="form-control" name="${field.key}" value="${value}" ${field.required ? "required" : ""}>
                ${hint}
            </div>`;
}

async function saveForm(config) {
    const form = document.getElementById("admForm");
    const formData = new FormData(form);
    const data = {};
    config.fields.forEach(f => { data[f.key] = formData.get(f.key) ?? ""; });

    // Resultados: el "ganador" no se elige a mano, se calcula solo
    // a partir de los goles que sí escribió el usuario.
    if (config.table === "resultados") {
        const gl = Number(data.goles_local);
        const gv = Number(data.goles_visitante);
        data.ganador = gl > gv ? "Local" : (gl < gv ? "Visitante" : "Empate");
    }

    // Todo lo que se registra de un partido hereda su TEMPORADA,
    // así los datos quedan ordenados por año y no se mezclan
    // los campeonatos de temporadas distintas.
    if (["resultados", "detalle_goles", "tarjetas"].includes(config.table) && data.id_partido) {
        if (!PARTIDOS_CACHE.length) await cargarPartidosCache();
        const partido = PARTIDOS_CACHE.find(p => String(p.id_partido) === String(data.id_partido));
        if (partido) data.id_campeonato = partido.id_campeonato;
    }

    // La "División" (Primera A) no se pregunta: hay una sola en este
    // sistema, así que se completa sola para no confundirla con Grupos.
    if (config.table === "campeonatos" && !data.id_categoria) {
        let categorias = (await apiGet("categorias").catch(() => ({ results: [] }))).results || [];
        if (categorias.length === 0) {
            await apiCreate("categorias", { nombre: "Primera A", descripcion: "División única de este sistema" }, "id_categoria");
            categorias = (await apiGet("categorias").catch(() => ({ results: [] }))).results || [];
        }
        data.id_categoria = categorias[0].id_categoria;
    }

    try {
        const res = editingId
            ? await apiUpdate(config.table, editingId, data, config.pk)
            : await apiCreate(config.table, data, config.pk);

        if (res && (res.status === 200 || res.status === 201 || res.status === undefined)) {
            $("#admModal").modal("hide");

            // Si se guardó un Resultado, la Tabla de Posiciones se
            // recalcula sola de inmediato. Ya NO depende de marcar el
            // partido como "Jugado" a mano: basta con que el partido
            // tenga un resultado cargado para que cuente.
            if (config.table === "resultados") {
                try {
                    await recalcularTablaPosicionesSilencioso();
                } catch (e) {
                    alert("El resultado se guardó, pero falló el recálculo automático de la Tabla de Posiciones.\nDetalle: " + e.message);
                }
            }

            const fresh = await apiGet(config.table).catch(() => null);
            currentRows = (fresh && Array.isArray(fresh.results)) ? fresh.results : [];
            renderRows(config, aplicarFiltros());
        } else {
            alert("No se pudo guardar: " + (res?.results ?? "revisa el nombre de tabla/columnas en js/admin-app.js."));
        }
    } catch (err) {
        console.error("Error al guardar:", err);
        alert("No se pudo conectar con la API.\n\nDetalle técnico: " + err.name + " - " + err.message);
    }
}

async function handleDelete(config, id) {
    if (!confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return;
    try {
        const res = await apiDelete(config.table, id, config.pk);
        if (res && (res.status === 200 || res.status === undefined)) {
            currentRows = currentRows.filter(r => String(r[config.pk]) !== String(id));
            renderRows(config, aplicarFiltros());
        } else {
            alert("No se pudo eliminar: " + (res?.results ?? "revisa la conexión con la API."));
        }
    } catch (err) {
        console.error("Error al eliminar:", err);
        alert("No se pudo conectar con la API.\n\nDetalle técnico: " + err.name + " - " + err.message);
    }
}

/* ---------------------------------------------------
   Inicio
   --------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    const cajaUsuario = document.getElementById("adm-usuario-actual");
    if (cajaUsuario && typeof sesion !== "undefined" && sesion) {
        cajaUsuario.innerHTML = `<i class="fas fa-user-circle"></i> ${sesion.nombre} <span class="badge badge-light">${sesion.rol}</span>`;
    }
    aplicarRestriccionesDeRol();
    renderDashboard();
});

/* ---------------------------------------------------
   Permisos por rol
   - Administrador: acceso total.
   - Secretario: puede ver/agregar/editar, pero no puede
     entrar a Usuarios ni a Configuración, ni eliminar
     registros.
   --------------------------------------------------- */

const MODULOS_SOLO_ADMIN = ["usuarios", "configuracion"];

function esAdministrador() {
    const s = sesionActual();
    return s && s.rol === "Administrador";
}

function aplicarRestriccionesDeRol() {
    if (esAdministrador()) return;

    MODULOS_SOLO_ADMIN.forEach(key => {
        const link = document.querySelector(`#adm-nav a[data-module="${key}"]`);
        if (link) link.closest("li").style.display = "none";
    });
}

/* =====================================================
   Generador automático de calendario (round-robin,
   ida y vuelta) y de eliminatorias (cuartos/semis/final).
   Corrección pedida por el tutor: los partidos de la
   fase de liga no se cargan uno por uno a mano.
   ===================================================== */

let GEN_EQUIPOS_ASIGNADOS = [];

async function cargarEquiposInscritosEnGenerador() {
    const idCampeonato = document.getElementById("gen-campeonato")?.value;
    const cont = document.getElementById("gen-equipos-lista");
    if (!cont) return;
    if (!idCampeonato) { cont.innerHTML = `<span class="text-muted">Seleccioná primero un campeonato.</span>`; return; }

    const [insData, eqData] = await Promise.all([
        apiGet("campeonato_equipos", `?linkTo=id_campeonato&equalTo=${idCampeonato}`).catch(() => ({ results: [] })),
        apiGet("equipos").catch(() => ({ results: [] }))
    ]);
    const asignaciones = insData.results || [];
    const equipos = eqData.results || [];
    const mapa = {};
    equipos.forEach(e => mapa[e.id_equipo] = e);
    GEN_EQUIPOS_ASIGNADOS = asignaciones.map(a => ({ ...mapa[a.id_equipo], grupo: a.grupo, id_campeonato_equipo: a.id_campeonato_equipo })).filter(e => e.id_equipo);

    const grupos = [...new Set(GEN_EQUIPOS_ASIGNADOS.map(e => e.grupo).filter(Boolean))].sort();
    const filtro = document.getElementById("gen-grupo-filtro");
    if (filtro) {
        const actual = filtro.value;
        filtro.innerHTML = `<option value="AMBOS">Todos los grupos (${grupos.join(", ") || "sin asignaciones"})</option>` + grupos.map(g => `<option value="${g}">Solo Grupo ${g}</option>`).join("");
        if (grupos.includes(actual)) filtro.value = actual;
    }

    if (!GEN_EQUIPOS_ASIGNADOS.length) {
        cont.innerHTML = `<div class="alert alert-warning mb-0">Este campeonato todavía no tiene equipos inscritos. Andá a <strong>Equipos por campeonato</strong> y asigná cada equipo a su Grupo A o B.</div>`;
        return;
    }
    const filtroVal = filtro?.value || "AMBOS";
    const visibles = filtroVal === "AMBOS" ? GEN_EQUIPOS_ASIGNADOS : GEN_EQUIPOS_ASIGNADOS.filter(e => String(e.grupo) === String(filtroVal));
    cont.innerHTML = grupos.map(g => {
        const delGrupo = visibles.filter(eq => eq.grupo === g);
        if (!delGrupo.length) return "";
        return `<div class="mb-2"><div style="font-weight:700;color:#0f5132;border-bottom:1px solid #e4e9e7;margin-bottom:6px;">Grupo ${g}</div>${delGrupo.map(eq => `<div class="form-check form-check-inline"><input class="form-check-input gen-equipo-chk" type="checkbox" value="${eq.id_equipo}" data-grupo="${g}" id="genchk${eq.id_equipo}" checked><label class="form-check-label" for="genchk${eq.id_equipo}">${eq.nombre}</label></div>`).join("")}</div>`;
    }).join("") || `<span class="text-muted">No hay equipos en ese grupo.</span>`;
}

async function abrirGeneradorCalendario() {
    const panel = document.getElementById("adm-extra-panel");
    const [campeonatosData, canchasData, arbitrosData, gruposData] = await Promise.all([
        apiGet("campeonatos").catch(() => ({ results: [] })),
        apiGet("canchas").catch(() => ({ results: [] })),
        apiGet("arbitros").catch(() => ({ results: [] })),
        apiGet("grupos").catch(() => ({ results: [] }))
    ]);
    const campeonatos = campeonatosData.results || [];
    const canchas = canchasData.results || [];
    const arbitros = arbitrosData.results || [];
    const grupos = (gruposData.results || []).map(g => g.nombre);
    if (grupos.length === 0) grupos.push("A", "B"); // respaldo si el módulo Grupos está vacío

    if (campeonatos.length === 0) {
        panel.innerHTML = `<div class="p-3 alert alert-warning">Primero crea al menos un <strong>Campeonato</strong> (tu tabla partidos lo exige).</div>`;
        return;
    }
    if (canchas.length === 0) {
        panel.innerHTML = `<div class="p-3 alert alert-warning">Primero crea al menos una <strong>Cancha</strong> (tu tabla partidos lo exige).</div>`;
        return;
    }
    if (arbitros.length === 0) {
        panel.innerHTML = `<div class="p-3 alert alert-warning">Primero crea al menos un <strong>Árbitro</strong> (tu tabla partidos lo exige, no puede quedar vacío).</div>`;
        return;
    }

    panel.innerHTML = `
        <div class="p-3" style="background:#f4f6f5; border-bottom:1px solid #e4e9e7;">
            <h5><i class="fas fa-calendar-plus"></i> Generar calendario automático</h5>
            <div class="form-row">
                <div class="form-group col-md-6">
                    <label>Modalidad del fixture *</label>
                    <select class="form-control" id="gen-modalidad">
                        <option value="grupos">Por grupos (cada grupo juega por separado)</option>
                        <option value="todos">Todos contra todos (una sola tabla)</option>
                    </select>
                    <small class="text-muted">Por grupos genera el fixture de cada grupo de forma independiente.</small>
                </div>
                <div class="form-group col-md-6">
                    <label>¿Qué grupos genero?</label>
                    <select class="form-control" id="gen-grupo-filtro">
                        <option value="AMBOS">Todos los grupos (${grupos.join(", ")})</option>
                        ${grupos.map(g => `<option value="${g}">Solo Grupo ${g}</option>`).join("")}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group col-md-3">
                    <label>Campeonato *</label>
                    <select class="form-control" id="gen-campeonato">
                        <option value="">-- Selecciona --</option>
                        ${campeonatos.map(c => `<option value="${c.id_campeonato}">${c.nombre}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group col-md-3">
                    <label>Cancha por defecto *</label>
                    <select class="form-control" id="gen-cancha">
                        <option value="">-- Selecciona --</option>
                        ${canchas.map(c => `<option value="${c.id_cancha}">${c.nombre}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group col-md-3">
                    <label>Árbitro por defecto *</label>
                    <select class="form-control" id="gen-arbitro">
                        <option value="">-- Selecciona --</option>
                        ${arbitros.map(a => `<option value="${a.id_arbitro}">${a.nombre} ${a.apellido}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group col-md-3">
                    <label>Hora por defecto</label>
                    <input type="time" class="form-control" id="gen-hora" value="19:00">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group col-md-4">
                    <label>Fecha de la jornada 1</label>
                    <input type="date" class="form-control" id="gen-fecha-inicio">
                </div>
                <div class="form-group col-md-4">
                    <label>Días entre jornadas</label>
                    <input type="number" class="form-control" id="gen-intervalo" value="7" min="1">
                </div>
                <div class="form-group col-md-4">
                    <label>&nbsp;</label>
                    <div class="form-check mt-2">
                        <input type="checkbox" class="form-check-input" id="gen-ida-vuelta" checked>
                        <label class="form-check-label" for="gen-ida-vuelta">Ida y vuelta (doble rueda)</label>
                    </div>
                </div>
            </div>
            <label>Equipos participantes <small class="text-muted">(solo los inscritos en el campeonato seleccionado)</small></label>
            <div id="gen-equipos-lista" class="mb-3" style="max-height:200px; overflow-y:auto; border:1px solid #e4e9e7; border-radius:6px; padding:10px;">
                <span class="text-muted">Seleccioná primero un campeonato.</span>
            </div>
            <div>
                <button class="btn btn-success" id="gen-btn-generar"><i class="fas fa-bolt"></i> Generar calendario</button>
                <button class="btn btn-secondary ml-2" id="gen-btn-cerrar">Cancelar</button>
            </div>
            <div id="gen-progreso" class="mt-3"></div>
        </div>`;

    document.getElementById("gen-btn-cerrar").addEventListener("click", () => { panel.innerHTML = ""; });
    document.getElementById("gen-campeonato").addEventListener("change", cargarEquiposInscritosEnGenerador);
    document.getElementById("gen-grupo-filtro").addEventListener("change", cargarEquiposInscritosEnGenerador);
    document.getElementById("gen-btn-generar").addEventListener("click", () => ejecutarGeneracionCalendario());
    if (campeonatos.length === 1) {
        document.getElementById("gen-campeonato").value = String(campeonatos[0].id_campeonato);
        await cargarEquiposInscritosEnGenerador();
    }
}

function roundRobin(equiposIds) {
    let arr = equiposIds.slice();
    if (arr.length % 2 !== 0) arr.push(null); // equipo libre (bye)
    const n = arr.length;
    const half = n / 2;
    const rondas = [];

    for (let r = 0; r < n - 1; r++) {
        const partidosRonda = [];
        for (let i = 0; i < half; i++) {
            const a = arr[i];
            const b = arr[n - 1 - i];
            if (a !== null && b !== null) {
                // se alterna local/visitante entre rondas para repartir la localía
                partidosRonda.push(r % 2 === 0 ? [a, b] : [b, a]);
            }
        }
        rondas.push(partidosRonda);
        const fijo = arr[0];
        const resto = arr.slice(1);
        resto.unshift(resto.pop());
        arr = [fijo, ...resto];
    }
    return rondas;
}

async function ejecutarGeneracionCalendario() {
    const idCampeonato = document.getElementById("gen-campeonato").value;
    const idCancha     = document.getElementById("gen-cancha").value;
    const idArbitro    = document.getElementById("gen-arbitro").value;
    const hora         = document.getElementById("gen-hora").value || "19:00";
    const fechaInicioStr = document.getElementById("gen-fecha-inicio").value;
    const intervalo    = parseInt(document.getElementById("gen-intervalo").value || "7", 10);
    const idaVuelta    = document.getElementById("gen-ida-vuelta").checked;
    const modalidad    = document.getElementById("gen-modalidad").value;      // "grupos" | "todos"
    const grupoFiltro  = document.getElementById("gen-grupo-filtro").value;   // "AMBOS" | "A" | "B"

    if (!idCampeonato)   { alert("Selecciona un campeonato (temporada)."); return; }
    if (!idCancha)       { alert("Selecciona una cancha por defecto (tu base la exige)."); return; }
    if (!idArbitro)      { alert("Selecciona un árbitro por defecto (tu base la exige)."); return; }
    if (!fechaInicioStr) { alert("Selecciona la fecha de la jornada 1."); return; }

    // Equipos marcados, con su grupo
    let seleccionados = Array.from(document.querySelectorAll(".gen-equipo-chk:checked"))
        .map(c => ({ id: c.value, grupo: c.dataset.grupo || "A" }));

    if (grupoFiltro !== "AMBOS") {
        seleccionados = seleccionados.filter(e => e.grupo === grupoFiltro);
    }
    if (seleccionados.length < 2) { alert("Selecciona al menos 2 equipos."); return; }

    /* ---------------------------------------------------------
       Se arma una "tanda" por cada fixture que hay que generar.
       - modalidad "grupos": una tanda por cada grupo (A y B)
       - modalidad "todos":  una sola tanda con todos los equipos
       --------------------------------------------------------- */
    let tandas = [];
    if (modalidad === "grupos") {
        const porGrupo = {};
        seleccionados.forEach(e => {
            if (!porGrupo[e.grupo]) porGrupo[e.grupo] = [];
            porGrupo[e.grupo].push(e.id);
        });
        Object.keys(porGrupo).sort().forEach(g => {
            if (porGrupo[g].length >= 2) tandas.push({ grupo: g, equipos: porGrupo[g] });
        });
        if (tandas.length === 0) {
            alert("Ningún grupo tiene al menos 2 equipos seleccionados.");
            return;
        }
    } else {
        tandas = [{ grupo: null, equipos: seleccionados.map(e => e.id) }];
    }

    const progreso = document.getElementById("gen-progreso");
    const fechaInicio = new Date(fechaInicioStr + "T00:00:00");

    let creados = 0, fallidos = 0, primerError = "";
    let resumen = [];

    for (const tanda of tandas) {
        let rondas = roundRobin(tanda.equipos);
        if (idaVuelta) {
            const vuelta = rondas.map(r => r.map(([l, v]) => [v, l]));
            rondas = rondas.concat(vuelta);
        }

        for (let jornada = 0; jornada < rondas.length; jornada++) {
            const fecha = new Date(fechaInicio);
            fecha.setDate(fecha.getDate() + jornada * intervalo);
            const fechaStr = fecha.toISOString().slice(0, 10);

            for (const [local, visitante] of rondas[jornada]) {
                const data = {
                    id_campeonato: idCampeonato,
                    grupo: tanda.grupo || null,
                    jornada: jornada + 1,
                    id_equipo_local: local,
                    id_equipo_visitante: visitante,
                    id_cancha: idCancha,
                    id_arbitro: idArbitro,
                    fecha: fechaStr,
                    hora: hora,
                    estado: "Programado",
                    observaciones: ""
                };
                try {
                    const res = await apiCreate("partidos", data, "id_partido");
                    if (res && (res.status === 200 || res.status === 201 || res.status === undefined)) {
                        creados++;
                    } else {
                        fallidos++;
                        if (!primerError) primerError = (res && res.results) ? res.results : "Error desconocido";
                    }
                } catch (e) { fallidos++; }
                progreso.innerHTML = `Generando... ${creados} creados, ${fallidos} con error`;
            }
        }
        const totalTanda = rondas.reduce((a, r) => a + r.length, 0);
        resumen.push(tanda.grupo ? `Grupo ${tanda.grupo}: ${totalTanda} partidos` : `Todos contra todos: ${totalTanda} partidos`);
    }

    progreso.innerHTML = `<strong>Listo.</strong> ${creados} partidos creados.<br>
        ${resumen.join(" &middot; ")}
        ${fallidos > 0 ? `<br><span class="text-danger">${fallidos} fallaron. Primer error: ${primerError}</span>` : ""}`;

    await cargarLookups(true);
    await cargarPartidosCache();
    const data = await apiGet("partidos").catch(() => null);
    currentRows = (data && Array.isArray(data.results)) ? data.results : [];
    renderRows(MODULES.partidos, aplicarFiltros());
}

/* =====================================================
   Eliminatoria (cuartos → semis → final), generada a
   partir de la tabla de posiciones o de la ronda anterior.
   ===================================================== */

async function abrirGeneradorPlayoffs() {
    const panel = document.getElementById("adm-extra-panel");
    const [campeonatosData, canchasData, arbitrosData, equiposData] = await Promise.all([
        apiGet("campeonatos").catch(() => ({ results: [] })),
        apiGet("canchas").catch(() => ({ results: [] })),
        apiGet("arbitros").catch(() => ({ results: [] })),
        apiGet("equipos").catch(() => ({ results: [] }))
    ]);
    const campeonatos = campeonatosData.results || [];
    const canchas = canchasData.results || [];
    const arbitros = arbitrosData.results || [];
    const equipos = equiposData.results || [];
    window.__PO_CAMPEONATOS = campeonatos;
    window.__PO_EQUIPOS = equipos;

    if (canchas.length === 0 || arbitros.length === 0) {
        panel.innerHTML = `<div class="p-3 alert alert-warning">Primero crea al menos una <strong>Cancha</strong> y un <strong>Árbitro</strong> (tu tabla partidos los exige, no pueden quedar vacíos).</div>`;
        return;
    }

    panel.innerHTML = `
        <div class="p-3" style="background:#f4f6f5; border-bottom:1px solid #e4e9e7;">
            <h5><i class="fas fa-trophy"></i> Generar eliminatoria</h5>
            <p class="text-muted small">
                Sirve para <strong>Liga</strong> (playoffs después de la fase de todos contra todos, saliendo
                de la Tabla de Posiciones) y para <strong>torneo relámpago</strong> (eliminatoria directa desde
                el arranque, sin fase de grupos, con cualquier cantidad de equipos).
            </p>
            <div class="form-row">
                <div class="form-group col-md-3">
                    <label>Campeonato *</label>
                    <select class="form-control" id="po-campeonato">
                        <option value="">-- Selecciona --</option>
                        ${campeonatos.map(c => `<option value="${c.id_campeonato}" data-formato="${c.formato || "Liga"}">${c.nombre} (${c.formato || "Liga"})</option>`).join("")}
                    </select>
                </div>
                <div class="form-group col-md-3">
                    <label>Cancha *</label>
                    <select class="form-control" id="po-cancha">
                        <option value="">-- Selecciona --</option>
                        ${canchas.map(c => `<option value="${c.id_cancha}">${c.nombre}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group col-md-3">
                    <label>Árbitro *</label>
                    <select class="form-control" id="po-arbitro">
                        <option value="">-- Selecciona --</option>
                        ${arbitros.map(a => `<option value="${a.id_arbitro}">${a.nombre} ${a.apellido}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group col-md-3">
                    <label>Fecha del partido *</label>
                    <input type="date" class="form-control" id="po-fecha">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group col-md-4">
                    <label>Nº de jornada para esta ronda *</label>
                    <input type="number" class="form-control" id="po-jornada" placeholder="ej. 1">
                </div>
            </div>

            <div id="po-zona-formato"></div>

            <hr>
            <div class="alert alert-light border mb-2" style="font-size:.85rem;">
                <strong><i class="fas fa-route"></i> Ruta del cuadro:</strong>
                seleccionás los equipos → generás la primera ronda → cargás sus resultados →
                <strong>Avanzar ruta</strong> crea automáticamente la siguiente ronda → repetís hasta la final.
            </div>
            <button class="btn btn-success mr-2" id="po-btn-siguiente"><i class="fas fa-forward"></i> Avanzar ruta automáticamente</button>
            <input type="number" class="form-control d-inline-block" id="po-jornada-anterior" placeholder="Jornada anterior (opcional)" style="width:220px;">
            <button class="btn btn-secondary" id="po-btn-cerrar">Cerrar</button>
            <div id="po-progreso" class="mt-3"></div>
        </div>`;

    document.getElementById("po-btn-cerrar").addEventListener("click", () => { panel.innerHTML = ""; });
    document.getElementById("po-btn-siguiente").addEventListener("click", avanzarRutaAutomaticamente);
    document.getElementById("po-campeonato").addEventListener("change", poRenderZonaFormato);
}

function poRenderZonaFormato() {
    const sel = document.getElementById("po-campeonato");
    const zona = document.getElementById("po-zona-formato");
    const opt = sel.selectedOptions[0];
    const formato = opt ? opt.dataset.formato : "";

    if (!formato) { zona.innerHTML = ""; return; }

    if (formato === "Liga") {
        zona.innerHTML = `
            <div class="form-row align-items-end">
                <div class="form-group col-md-4">
                    <label>Cantidad de equipos que clasifican (según la Tabla de Posiciones)</label>
                    <input type="number" class="form-control" id="po-cantidad-liga" value="8" min="2" step="2">
                    <small class="text-muted">Tiene que ser un número par. Ej: 4 (semifinales directas), 8 (cuartos), etc.</small>
                </div>
                <div class="form-group col-md-4">
                    <button class="btn adm-btn-add text-white" id="po-btn-ronda1"><i class="fas fa-magic"></i> Generar Ronda 1 desde la tabla</button>
                </div>
            </div>`;
        document.getElementById("po-btn-ronda1").addEventListener("click", () => generarRonda1Liga());
        return;
    }

    // formato === "Eliminatoria": torneo relámpago, sin fase de grupos.
    // El administrador elige libremente los equipos existentes en la base.
    // Para que el cuadro llegue limpio hasta una única final, la cantidad
    // elegida debe ser potencia de 2: 2, 4, 8, 16, 32...
    const equipos = window.__PO_EQUIPOS || [];
    const gruposReales = [...new Set(equipos.map(e => e.grupo).filter(Boolean))].sort();
    const opcionesFiltro = gruposReales.map(g => `<option value="${g}">Solo Grupo ${g}</option>`).join("");

    zona.innerHTML = `
        <div class="form-row align-items-end mb-2">
            <div class="col-md-3">
                <label class="mb-1">Filtrar por grupo</label>
                <select class="form-control" id="po-filtro-grupo">
                    <option value="">Todos los equipos (${equipos.length})</option>
                    ${opcionesFiltro}
                </select>
            </div>
            <div class="col-md-3">
                <label class="mb-1">Cantidad elegida</label>
                <div class="form-control bg-white" id="po-contador-equipos">0 equipos seleccionados</div>
            </div>
            <div class="col-md-6">
                <div id="po-ruta-preview" class="alert alert-success py-2 mb-0">
                    <strong><i class="fas fa-route"></i> Ruta:</strong> elegí equipos para ver el cuadro.
                </div>
            </div>
        </div>
        <p class="mb-1"><strong>Elegí los equipos que arrancan el cuadro</strong>:</p>
        <div class="mb-2" id="po-eq-lista" style="max-height:210px; overflow-y:auto; border:1px solid #e4e9e7; border-radius:6px; padding:8px;"></div>
        <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" id="po-sortear" checked>
            <label class="form-check-label" for="po-sortear">Sortear el orden de los cruces al azar</label>
        </div>
        <button class="btn adm-btn-add text-white" id="po-btn-ronda1"><i class="fas fa-magic"></i> Generar primera ronda</button>
        <small class="d-block text-muted mt-2">Cuadro automático: 4 equipos = 2 semifinales → 1 final. 8 equipos = 4 cuartos → 2 semifinales → 1 final.</small>`;

    function actualizarRutaPreview() {
        const seleccionados = document.querySelectorAll(".po-eq-chk:checked").length;
        const contador = document.getElementById("po-contador-equipos");
        const ruta = document.getElementById("po-ruta-preview");
        if (contador) contador.textContent = `${seleccionados} equipo${seleccionados === 1 ? "" : "s"} seleccionado${seleccionados === 1 ? "" : "s"}`;
        if (!ruta) return;
        const potencia = seleccionados >= 2 && (seleccionados & (seleccionados - 1)) === 0;
        if (!seleccionados) {
            ruta.innerHTML = `<strong><i class="fas fa-route"></i> Ruta:</strong> elegí equipos para ver el cuadro.`;
            return;
        }
        if (!potencia) {
            ruta.className = "alert alert-warning py-2 mb-0";
            ruta.innerHTML = `<strong><i class="fas fa-exclamation-triangle"></i> Ruta:</strong> elegí 2, 4, 8, 16... equipos para que termine en una sola final.`;
            return;
        }
        const rondas = Math.log2(seleccionados);
        const nombres = [];
        for (let n = seleccionados; n >= 2; n = n / 2) {
            if (n === 8) nombres.push("Cuartos");
            else if (n === 4) nombres.push("Semifinal");
            else if (n === 2) nombres.push("Final");
            else nombres.push(`${n / 2} partidos`);
        }
        ruta.className = "alert alert-success py-2 mb-0";
        ruta.innerHTML = `<strong><i class="fas fa-route"></i> Ruta marcada:</strong> ${nombres.join(" → ")}.`;
    }

    function pintarListaEquipos() {
        const filtro = document.getElementById("po-filtro-grupo").value;
        const visibles = filtro ? equipos.filter(e => normalizarTexto(e.grupo) === normalizarTexto(filtro)) : equipos;
        document.getElementById("po-eq-lista").innerHTML = visibles.map(eq => `
            <div class="form-check form-check-inline">
                <input class="form-check-input po-eq-chk" type="checkbox" value="${eq.id_equipo}" id="po-eq-${eq.id_equipo}">
                <label class="form-check-label" for="po-eq-${eq.id_equipo}">${eq.nombre}
                    <span class="badge badge-secondary">${eq.grupo ? "Grupo " + eq.grupo : "sin grupo"}</span></label>
            </div>`).join("") || `<span class="text-muted">No hay equipos con ese filtro.</span>`;
        document.querySelectorAll(".po-eq-chk").forEach(chk => chk.addEventListener("change", actualizarRutaPreview));
        actualizarRutaPreview();
    }
    document.getElementById("po-filtro-grupo").addEventListener("change", pintarListaEquipos);
    pintarListaEquipos();

    document.getElementById("po-btn-ronda1").addEventListener("click", () => generarRonda1Relampago());
}

function nombreRondaPorCantidadPartidos(cantidadPartidos) {
    if (cantidadPartidos === 8) return "Octavos de Final";
    if (cantidadPartidos === 4) return "Cuartos de Final";
    if (cantidadPartidos === 2) return "Semifinal";
    if (cantidadPartidos === 1) return "Final";
    return "Ronda";
}

async function poCrearCrucesDesdeEquipos(equiposOrdenados, etiquetaObservacion) {
    const idCampeonato = document.getElementById("po-campeonato").value;
    const idCancha = document.getElementById("po-cancha").value;
    const idArbitro = document.getElementById("po-arbitro").value;
    const fecha = document.getElementById("po-fecha").value;
    const jornada = document.getElementById("po-jornada").value;
    const progreso = document.getElementById("po-progreso");

    if (!idCampeonato || !idCancha || !idArbitro || !fecha || !jornada) {
        alert("Completa campeonato, cancha, árbitro, fecha y número de jornada.");
        return;
    }
    if (equiposOrdenados.length < 2) {
        alert("Hacen falta al menos 2 equipos.");
        return;
    }
    const n = equiposOrdenados.length;
    if ((n & (n - 1)) !== 0) {
        alert("Para que el cuadro termine correctamente en una sola final, elegí 2, 4, 8, 16, 32... equipos. Actualmente elegiste " + n + ".");
        return;
    }
    const etiquetaFinal = etiquetaObservacion || nombreRondaPorCantidadPartidos(n / 2);
    const cruces = [];
    for (let i = 0; i < n / 2; i++) {
        cruces.push([equiposOrdenados[i], equiposOrdenados[n - 1 - i]]);
    }

    let creados = 0, fallidos = 0, primerError = "";
    for (const [local, visitante] of cruces) {
        const data = {
            id_campeonato: idCampeonato,
            jornada: jornada,
            id_equipo_local: local.id_equipo,
            id_equipo_visitante: visitante.id_equipo,
            id_cancha: idCancha,
            id_arbitro: idArbitro,
            fecha: fecha,
            hora: "19:00",
            estado: "Programado",
            observaciones: `${etiquetaFinal} · ${n} equipos iniciales`
        };
        try {
            const res = await apiCreate("partidos", data, "id_partido");
            if (res && (res.status === 200 || res.status === 201 || res.status === undefined)) { creados++; }
            else { fallidos++; if (!primerError) primerError = (res && res.results) ? res.results : "Error desconocido"; }
        } catch (e) { fallidos++; }
    }
    progreso.innerHTML = `<strong>Ronda generada:</strong> ${creados} partido(s) creado(s). ${fallidos > 0 ? `${fallidos} con error. Motivo: ${primerError}` : ""}`;

    const data = await apiGet("partidos").catch(() => null);
    currentRows = (data && Array.isArray(data.results)) ? data.results : [];
    renderRows(MODULES.partidos, aplicarFiltros());
}

async function generarRonda1Liga() {
    const idCampeonato = document.getElementById("po-campeonato").value;
    const n = parseInt(document.getElementById("po-cantidad-liga").value, 10);
    if (!idCampeonato) { alert("Elegí el campeonato."); return; }
    if (!n || n < 2 || n % 2 !== 0) { alert("La cantidad de clasificados tiene que ser un número par de 2 o más."); return; }

    const tablaData = await apiGet("tabla_posiciones", `?linkTo=id_campeonato&equalTo=${idCampeonato}&orderBy=puntos&orderMode=DESC`).catch(() => ({ results: [] }));
    const tabla = (tablaData.results || []).slice(0, n);

    if (tabla.length < n) {
        alert(`La Tabla de Posiciones de este campeonato tiene menos equipos (${tabla.length}) que los ${n} que pediste. Jugá más partidos de la fase de grupos, o pedí una cantidad menor.`);
        return;
    }
    await poCrearCrucesDesdeEquipos(tabla, `Playoffs - top ${n} de la tabla`);
}

async function generarRonda1Relampago() {
    const seleccionados = Array.from(document.querySelectorAll(".po-eq-chk:checked")).map(c => c.value);
    if (seleccionados.length < 2) { alert("Elegí al menos 2 equipos."); return; }
    if ((seleccionados.length & (seleccionados.length - 1)) !== 0) {
        alert("Elegí 2, 4, 8, 16, 32... equipos para que la ruta llegue automáticamente a una sola final.");
        return;
    }

    const equipos = window.__PO_EQUIPOS || [];
    let lista = seleccionados.map(id => equipos.find(e => String(e.id_equipo) === String(id))).filter(Boolean);

    const sortear = document.getElementById("po-sortear").checked;
    if (sortear) {
        lista = lista.slice();
        for (let i = lista.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lista[i], lista[j]] = [lista[j], lista[i]];
        }
    }
    await poCrearCrucesDesdeEquipos(lista, "Torneo relámpago - Ronda 1");
}

async function avanzarRutaAutomaticamente() {
    const idCampeonato = document.getElementById("po-campeonato").value;
    if (!idCampeonato) { alert("Elegí el campeonato."); return; }

    const partidosData = await apiGet("partidos", `?linkTo=id_campeonato&equalTo=${idCampeonato}`).catch(() => ({ results: [] }));
    const resultadosData = await apiGet("resultados").catch(() => ({ results: [] }));
    const partidos = partidosData.results || [];
    const resultados = resultadosData.results || [];

    if (!partidos.length) {
        alert("Este campeonato todavía no tiene una primera ronda.");
        return;
    }

    // Avanzar ruta trabaja SOLO con partidos del cuadro. Antes tomaba la última
    // jornada de toda la temporada y podía confundir una jornada de Liga con
    // una ronda de eliminatoria.
    const esRondaKO = p => {
        const t = String(p.observaciones || '').toLowerCase();
        return /cuartos|semifinal|playoffs|torneo\s+rel[aá]mpago|\bfinal\b/.test(t);
    };
    const cuadro = partidos.filter(esRondaKO);
    if (!cuadro.length) {
        alert("Este campeonato todavía no tiene una primera ronda de eliminatoria. Generá primero la ronda inicial.");
        return;
    }
    const jornadas = [...new Set(cuadro.map(p => Number(p.jornada) || 0))].sort((a,b) => b-a);
    const jornadaAnterior = jornadas[0];
    const ronda = cuadro.filter(p => Number(p.jornada) === jornadaAnterior);
    if (ronda.length === 1) {
        alert("Esta ruta ya llegó a la FINAL. Cargá el resultado de ese partido para mostrar el campeón.");
        return;
    }

    for (const p of ronda) {
        if (!resultados.some(r => String(r.id_partido) === String(p.id_partido))) {
            alert(`Falta el resultado del partido ${p.id_partido} de la jornada ${jornadaAnterior}. Cargá todos los resultados antes de avanzar.`);
            return;
        }
    }

    const jornadaNueva = Math.max(...partidos.map(p => Number(p.jornada) || 0)) + 1;
    document.getElementById("po-jornada-anterior").value = jornadaAnterior;
    document.getElementById("po-jornada").value = jornadaNueva;

    await generarSiguienteRonda();
}

async function generarSiguienteRonda() {
    const idCampeonato = document.getElementById("po-campeonato").value;
    const idCancha = document.getElementById("po-cancha").value;
    const idArbitro = document.getElementById("po-arbitro").value;
    const fecha = document.getElementById("po-fecha").value;
    const jornada = document.getElementById("po-jornada").value;
    const jornadaAnterior = document.getElementById("po-jornada-anterior").value;
    const progreso = document.getElementById("po-progreso");

    if (!idCampeonato || !idCancha || !idArbitro || !fecha || !jornada || !jornadaAnterior) {
        alert("Completa campeonato, cancha, árbitro, fecha, nº de jornada nueva y nº de jornada anterior a avanzar.");
        return;
    }

    const [partidosData, resultadosData] = await Promise.all([
        apiGet("partidos", `?linkTo=id_campeonato&equalTo=${idCampeonato}`).catch(() => ({ results: [] })),
        apiGet("resultados").catch(() => ({ results: [] }))
    ]);
    const todosPartidos = partidosData.results || [];

    // Evita crear dos veces la misma ronda si el usuario pulsa el botón
    // más de una vez.
    const yaExisteRonda = todosPartidos.some(p =>
        String(p.jornada) === String(jornada) &&
        String(p.id_campeonato) === String(idCampeonato)
    );
    if (yaExisteRonda) {
        alert(`La jornada ${jornada} de este campeonato ya tiene partidos creados. No se generará otra vez para evitar duplicados.`);
        return;
    }

    const esRondaKO = p => {
        const t = String(p.observaciones || '').toLowerCase();
        return /(cuartos|semifinal|playoffs|torneo\s+rel[aá]mpago|final)\b/.test(t);
    };
    // IMPORTANTE: solo se toman los partidos de la llave.
    // La jornada puede coincidir con una jornada de fase regular.
    const partidosRonda = todosPartidos.filter(p =>
        String(p.jornada) === String(jornadaAnterior) && esRondaKO(p)
    );
    const resultados = resultadosData.results || [];

    if (partidosRonda.length < 2) {
        alert("No se encontraron al menos 2 partidos en la jornada " + jornadaAnterior + " de ese campeonato.");
        return;
    }

    const ganadores = [];
    for (const p of partidosRonda) {
        const r = resultados.find(res => String(res.id_partido) === String(p.id_partido));
        if (!r) {
            alert("El partido de la jornada " + jornadaAnterior + " (id " + p.id_partido + ") todavía no tiene resultado cargado. Carga todos los resultados de esa ronda antes de avanzar.");
            return;
        }
        const gl = Number(r.goles_local);
        const gv = Number(r.goles_visitante);
        let ganadorId = null;
        const ganador = String(r.ganador || '').trim().toLowerCase();
        if (ganador === "local" || ganador === "1" || gl > gv) ganadorId = p.id_equipo_local;
        else if (ganador === "visitante" || ganador === "2" || gv > gl) ganadorId = p.id_equipo_visitante;
        else if (ganador === "empate" || ganador === "3" || gl === gv) {
            alert(`El partido ${p.id_partido} terminó empatado. Registra el desempate antes de avanzar la eliminatoria.`);
            return;
        }
        if (!ganadorId) {
            alert(`No se pudo determinar el ganador del partido ${p.id_partido}. Revisa el resultado.`);
            return;
        }
        ganadores.push(ganadorId);
    }

    if (ganadores.length % 2 !== 0) {
        alert("Hay un número impar de ganadores (" + ganadores.length + "), no se puede armar la siguiente ronda automáticamente.");
        return;
    }

    let creados = 0, fallidos = 0, primerError = "";
    for (let i = 0; i < ganadores.length; i += 2) {
        const data = {
            id_campeonato: idCampeonato,
            jornada: jornada,
            id_equipo_local: ganadores[i],
            id_equipo_visitante: ganadores[i + 1],
            id_cancha: idCancha,
            id_arbitro: idArbitro,
            fecha: fecha,
            hora: "19:00",
            estado: "Programado",
            observaciones: `${nombreRondaPorCantidadPartidos(ganadores.length / 2)} · Ruta automática desde jornada ${jornadaAnterior}`
        };
        try {
            const res = await apiCreate("partidos", data, "id_partido");
            if (res && (res.status === 200 || res.status === 201 || res.status === undefined)) { creados++; }
            else { fallidos++; if (!primerError) primerError = (res && res.results) ? res.results : "Error desconocido"; }
        } catch (e) { fallidos++; }
    }
    progreso.innerHTML = `<strong>Siguiente ronda generada:</strong> ${creados} partidos creados. ${fallidos > 0 ? `${fallidos} con error. Motivo: ${primerError}` : ""}`;

    const data = await apiGet("partidos").catch(() => null);
    currentRows = (data && Array.isArray(data.results)) ? data.results : [];
    renderRows(MODULES.partidos, aplicarFiltros());
}

/* =====================================================
   Recalcular Tabla de Posiciones a partir de los partidos
   jugados y sus resultados (ya no se llena a mano).
   ===================================================== */

/* Calcula y guarda la Tabla de Posiciones, sin tocar la pantalla.
   Se llama sola cada vez que se guarda un Resultado, para que el
   admin nunca tenga que acordarse de darle a "Recalcular" a mano. */
async function recalcularTablaPosicionesSilencioso() {
    /* -----------------------------------------------------------
       Regla: un partido cuenta para la tabla si TIENE RESULTADO
       cargado. No hace falta marcarlo "Jugado" a mano.
       Se agrupa por CAMPEONATO (temporada) y por GRUPO (A / B).

       IMPORTANTE: esta versión BORRA toda la tabla_posiciones y
       la reconstruye de cero en cada recálculo. Es más lento que
       actualizar fila por fila, pero es a prueba de datos viejos
       que quedaron pegados de un cálculo anterior (justo el
       problema que venía dando: equipos con el grupo correcto en
       "equipos" pero con el grupo viejo todavía en
       "tabla_posiciones", porque la fila vieja nunca se tocaba).
       ----------------------------------------------------------- */
    const [partidosData, resultadosData, tablaActualData, inscripcionesData] = await Promise.all([
        apiGet("partidos").catch(() => ({ results: [] })),
        apiGet("resultados").catch(() => ({ results: [] })),
        apiGet("tabla_posiciones").catch(() => ({ results: [] })),
        apiGet("campeonato_equipos").catch(() => ({ results: [] }))
    ]);
    const partidos    = partidosData.results || [];
    const resultados  = resultadosData.results || [];
    const tablaActual = tablaActualData.results || [];
    const inscripciones = inscripcionesData.results || [];

    // Fuente de verdad: inscripción del equipo DENTRO de cada campeonato.
    // Esto evita que Grupo A/B de un torneo pise el del otro.
    const grupoDeEquipo = {};
    inscripciones.forEach(x => {
        grupoDeEquipo[String(x.id_campeonato) + "|" + String(x.id_equipo)] = x.grupo;
    });

    const stats = {};
    function acumular(idCampeonato, grupo, idEquipo) {
        const k = idCampeonato + "|" + grupo + "|" + idEquipo;
        if (!stats[k]) {
            stats[k] = { id_campeonato: idCampeonato, grupo: grupo, id_equipo: idEquipo,
                         pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 };
        }
        return stats[k];
    }

    partidos.forEach(p => {
        // La tabla de posiciones corresponde SOLO a la fase de grupos.
        // Los playoffs/cuarto/semifinal/final se crean con grupo NULL y
        // nunca deben sumar PJ, PG, PE, PP, GF, GC ni puntos.
        const grupoPartido = (p.grupo || "").toString().trim().toUpperCase();
        if (!["A", "B"].includes(grupoPartido)) return;

        const r = resultados.find(res => String(res.id_partido) === String(p.id_partido));
        if (!r) return;                       // sin resultado => no cuenta todavía

        // El grupo de CADA equipo sale de su inscripción en ESTE campeonato.
        // Nunca se toma un grupo global del equipo.
        const grupoLocal = grupoDeEquipo[String(p.id_campeonato) + "|" + String(p.id_equipo_local)] || p.grupo;
        const grupoVisitante = grupoDeEquipo[String(p.id_campeonato) + "|" + String(p.id_equipo_visitante)] || p.grupo;
        if (!grupoLocal || !grupoVisitante) return;

        const gl = Number(r.goles_local) || 0;
        const gv = Number(r.goles_visitante) || 0;

        const local  = acumular(p.id_campeonato, grupoLocal, p.id_equipo_local);
        const visita = acumular(p.id_campeonato, grupoVisitante, p.id_equipo_visitante);

        local.pj++;  visita.pj++;
        local.gf += gl;  local.gc += gv;
        visita.gf += gv; visita.gc += gl;

        if (gl > gv)      { local.pg++;  visita.pp++; }
        else if (gl < gv) { visita.pg++; local.pp++;  }
        else              { local.pe++;  visita.pe++; }
    });

    // 1) Borrar TODA la tabla de posiciones actual, sin excepciones
    for (const t of tablaActual) {
        try { await apiDelete("tabla_posiciones", t.id_posicion, "id_posicion"); }
        catch (e) { console.warn("No se pudo borrar fila vieja", t.id_posicion, e); }
    }

    // 2) Insertar todo de nuevo, limpio, con el grupo correcto
    for (const k in stats) {
        const s = stats[k];
        const data = {
            id_campeonato: s.id_campeonato,
            grupo: s.grupo,
            id_equipo: s.id_equipo,
            partidos_jugados: s.pj,
            partidos_ganados: s.pg,
            partidos_empatados: s.pe,
            partidos_perdidos: s.pp,
            goles_favor: s.gf,
            goles_contra: s.gc,
            diferencia_goles: s.gf - s.gc,
            puntos: s.pg * 3 + s.pe
        };
        try { await apiCreate("tabla_posiciones", data, "id_posicion"); }
        catch (e) { console.warn("No se pudo crear fila para", k, e); }
    }

    // Marca de tiempo visible, para comprobar a simple vista que SÍ corrió
    window.__ultimoRecalculo = new Date().toLocaleString("es-BO");
}

/* Ordena una tabla de posiciones con los criterios oficiales:
   puntos > diferencia de goles > goles a favor > nombre */
function ordenarPosiciones(filas) {
    return filas.slice().sort((a, b) =>
        (Number(b.puntos) - Number(a.puntos)) ||
        (Number(b.diferencia_goles) - Number(a.diferencia_goles)) ||
        (Number(b.goles_favor) - Number(a.goles_favor))
    );
}

async function recalcularTablaPosiciones(config) {
    const panel = document.getElementById("adm-extra-panel");
    panel.innerHTML = `<div class="p-3" style="background:#f4f6f5;">Recalculando tablas por grupo...</div>`;

    await recalcularTablaPosicionesSilencioso();

    panel.innerHTML = `<div class="p-3" style="background:#f4f6f5;">
        <strong>Tablas recalculadas</strong> (Grupo A y Grupo B, por temporada).
        <button class="btn btn-sm btn-secondary ml-2" onclick="document.getElementById('adm-extra-panel').innerHTML=''">Cerrar</button>
    </div>`;

    await cargarLookups(true);
    const data = await apiGet("tabla_posiciones").catch(() => null);
    currentRows = (data && Array.isArray(data.results)) ? ordenarPosiciones(data.results) : [];
    renderRows(config, aplicarFiltros());
}
