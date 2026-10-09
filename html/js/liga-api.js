/* =====================================================
   Liga Provincial de Futsal Vaca Diez #1 - Primera "A"
   Conexión de la página principal con la API REST.

   Estructura de las tablas CONFIRMADA con tu export completo
   de phpMyAdmin (liga_provincial_futsal.sql).

   Cambia API_BASE_URL por la ruta real de tu carpeta "api".
   ===================================================== */

const API_BASE_URL = "../api/index.php";

async function apiGet(tabla, params = "") {
    try {
        const query = params ? "&" + params.slice(1) : "";
        const res = await fetch(`${API_BASE_URL}?table=${tabla}${query}`, {
            headers: { "Accept": "application/json" }
        });
        const texto = await res.text();
        let data;
        try { data = JSON.parse(texto); }
        catch (e) {
            console.error(`API ${tabla}: respuesta no JSON`, res.status, texto.slice(0, 500));
            throw new Error(`API respondió HTTP ${res.status} con contenido no JSON`);
        }
        if (!res.ok) {
            console.error(`API ${tabla}: HTTP ${res.status}`, data);
            throw new Error(data?.results || `HTTP ${res.status}`);
        }
        if (data && Array.isArray(data.results)) return data.results;
        return [];
    } catch (err) {
        console.warn(`No se pudo conectar a la API para "${tabla}":`, err);
        return null;
    }
}

function limpiarPlaceholders(contenedor, claseSelector) {
    if (!contenedor) return;
    contenedor.querySelectorAll(claseSelector).forEach(el => el.remove());
}

/* Mapa id_equipo -> nombre de equipo, usado por varias secciones */
let MAPA_EQUIPOS = null;
let MAPA_GRUPOS = {};
let LISTA_EQUIPOS = [];
async function obtenerMapaEquipos() {
    if (MAPA_EQUIPOS) return MAPA_EQUIPOS;
    const equipos = await apiGet("equipos");
    MAPA_EQUIPOS = {};
    MAPA_GRUPOS = {};
    LISTA_EQUIPOS = equipos || [];
    if (equipos) {
        equipos.forEach(eq => {
            MAPA_EQUIPOS[eq.id_equipo] = eq.nombre;
            MAPA_GRUPOS[eq.id_equipo] = eq.grupo || "A";
        });
    }
    return MAPA_EQUIPOS;
}

function grupoDe(id) {
    return MAPA_GRUPOS[id] || "A";
}
function nombreEquipo(mapa, id) {
    return (mapa && mapa[id]) ? mapa[id] : `Equipo #${id}`;
}

function resolverUrlImagenPublica(valor) {
    if (!valor) return "";
    if (valor.startsWith("http://") || valor.startsWith("https://")) return valor;
    // rutas guardadas como "uploads/xxxx.jpg" (subidas desde el admin)
    // son relativas a la carpeta api/, no a html/
    return `../api/${valor}`;
}

function iniciales(nombre) {
    return (nombre || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join("");
}

/* ---------- Tarjeta: cantidad de equipos ---------- */
async function cargarStatEquipos() {
    const equipos = await apiGet("equipos");
    if (!equipos) return;
    const el = document.getElementById("stat-equipos");
    if (el) el.textContent = equipos.length;
}

/* ---------- Tabla de posiciones ---------- */
async function cargarTablaPosiciones() {
    /* La tabla de posiciones la calcula y guarda el sistema solo,
       cada vez que se registra un resultado en el panel. Acá
       simplemente se muestra, separada por grupo.
       Los torneos relámpago (formato Eliminatoria) no tienen tabla de
       puntos — se ignoran acá, se ven jugando el cuadro en Calendario. */
    const [datos, mapaEquipos, campeonatosData] = await Promise.all([
        apiGet("tabla_posiciones"),
        obtenerMapaEquipos(),
        apiGet("campeonatos").catch(() => null)
    ]);
    if (!datos) return; // sin conexión, deja los datos de muestra
    const tbody = document.getElementById("tabla-posiciones-body");
    if (!tbody) return;

    if (datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-muted">Aún no hay resultados cargados.</td></tr>`;
        return;
    }

    const idsLiga = new Set((campeonatosData || [])
        .filter(c => (c.formato || "Liga") === "Liga")
        .map(c => Number(c.id_campeonato)));
    const datosLiga = idsLiga.size ? datos.filter(d => idsLiga.has(Number(d.id_campeonato))) : datos;

    if (datosLiga.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-muted">El campeonato actual es un torneo relámpago (eliminatoria directa) — no tiene tabla de posiciones.</td></tr>`;
        return;
    }

    // Se queda con la temporada de Liga más reciente (el id_campeonato más alto)
    const campMax = Math.max(...datosLiga.map(d => Number(d.id_campeonato) || 0));
    let deEstaTemporada = datosLiga.filter(d => Number(d.id_campeonato) === campMax);

    // Respaldo: si tabla_posiciones todavía no fue materializada para un campeonato,
    // la tabla pública se calcula desde partidos + resultados de su fase regular.
    if (deEstaTemporada.length === 0) {
        const campActual = (campeonatosData || []).find(c => Number(c.id_campeonato) === campMax);
        const partidos = await apiGet("partidos");
        const resultados = await apiGet("resultados");
        if (campActual && partidos && resultados) {
            const ps = partidos.filter(p => Number(p.id_campeonato) === campMax);
            const rm = new Map(resultados.filter(r => Number(r.id_campeonato) === campMax).map(r => [String(r.id_partido), r]));
            const stats = {};
            ps.forEach(p => {
                const obs = String(p.observaciones || "").toLowerCase();
                if (/\bcuartos\b|\bsemifinal\b|^final\b/.test(obs)) return;
                const r = rm.get(String(p.id_partido));
                if (!r) return;
                const a=String(p.id_equipo_local), b=String(p.id_equipo_visitante);
                if (!stats[a]) stats[a]={id_campeonato:campMax,id_equipo:Number(a),grupo:p.grupo||grupoDe(a),partidos_jugados:0,partidos_ganados:0,partidos_empatados:0,partidos_perdidos:0,goles_favor:0,goles_contra:0,diferencia_goles:0,puntos:0};
                if (!stats[b]) stats[b]={id_campeonato:campMax,id_equipo:Number(b),grupo:p.grupo||grupoDe(b),partidos_jugados:0,partidos_ganados:0,partidos_empatados:0,partidos_perdidos:0,goles_favor:0,goles_contra:0,diferencia_goles:0,puntos:0};
                const gl=Number(r.goles_local||0), gv=Number(r.goles_visitante||0);
                stats[a].partidos_jugados++; stats[b].partidos_jugados++;
                stats[a].goles_favor+=gl; stats[a].goles_contra+=gv; stats[b].goles_favor+=gv; stats[b].goles_contra+=gl;
                stats[a].diferencia_goles+=gl-gv; stats[b].diferencia_goles+=gv-gl;
                if(gl>gv){stats[a].partidos_ganados++;stats[b].partidos_perdidos++;stats[a].puntos+=3;}
                else if(gv>gl){stats[b].partidos_ganados++;stats[a].partidos_perdidos++;stats[b].puntos+=3;}
                else{stats[a].partidos_empatados++;stats[b].partidos_empatados++;stats[a].puntos++;stats[b].puntos++;}
            });
            deEstaTemporada=Object.values(stats);
        }
    }

    function ordenar(filas) {
        return filas.slice().sort((a, b) =>
            (Number(b.puntos) - Number(a.puntos)) ||
            (Number(b.diferencia_goles) - Number(a.diferencia_goles)) ||
            (Number(b.goles_favor) - Number(a.goles_favor)));
    }

    let html = "";
    const gruposPresentes = [...new Set(deEstaTemporada.map(f => f.grupo || grupoDe(f.id_equipo)))].sort();
    gruposPresentes.forEach(g => {
        const filas = ordenar(deEstaTemporada.filter(f => (f.grupo || grupoDe(f.id_equipo)) === g));
        if (filas.length === 0) return;

        html += `<tr style="background:#0f5132;color:#fff;">
                    <td colspan="9" style="font-weight:700;letter-spacing:.5px;">PRIMERA A &mdash; GRUPO ${g}</td>
                 </tr>`;

        filas.forEach((fila, i) => {
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td class="text-left">${nombreEquipo(mapaEquipos, fila.id_equipo)}</td>
                    <td>${fila.partidos_jugados ?? 0}</td>
                    <td>${fila.partidos_ganados ?? 0}</td>
                    <td>${fila.partidos_empatados ?? 0}</td>
                    <td>${fila.partidos_perdidos ?? 0}</td>
                    <td>${fila.goles_favor ?? 0}</td>
                    <td>${fila.goles_contra ?? 0}</td>
                    <td><strong>${fila.puntos ?? 0}</strong></td>
                </tr>`;
        });
    });

    tbody.innerHTML = html || `<tr><td colspan="9" class="text-muted">Aún no hay datos.</td></tr>`;
}

/* ---------- Equipos de Primera A ---------- */
async function cargarEquipos() {
    const datos = await apiGet("equipos", "?orderBy=nombre&orderMode=ASC");
    if (!datos) return;
    const cont = document.getElementById("equipos-grid");
    if (!cont) return;
    limpiarPlaceholders(cont, ".equipo-placeholder");
    if (datos.length === 0) return;

    let html = "";
    const gruposPresentes = [...new Set(datos.map(eq => eq.grupo || "A"))].sort();
    gruposPresentes.forEach(g => {
        const delGrupo = datos.filter(eq => (eq.grupo || "A") === g);
        if (delGrupo.length === 0) return;
        html += `<div class="col-12 mb-2">
                    <h5 style="color:#0f5132;font-weight:700;border-bottom:2px solid #0f5132;padding-bottom:6px;">
                        Grupo ${g}
                    </h5>
                 </div>`;
        delGrupo.forEach(eq => {
            html += `
                <div class="col-md-3 col-6 text-center mb-4">
                    <div class="liga-stat-card">
                        ${eq.escudo
                            ? `<img src="${resolverUrlImagenPublica(eq.escudo)}" alt="${eq.nombre}" class="img-fluid mb-2" style="max-height:60px;">`
                            : `<div class="liga-crest">${iniciales(eq.nombre)}</div>`}
                        <strong>${eq.nombre}</strong>
                    </div>
                </div>`;
        });
    });
    cont.innerHTML += html;
}

/* ---------- Próxima fecha ---------- */
async function cargarProximosPartidos() {
    const [datos, mapaEquipos, campeonatos] = await Promise.all([
        apiGet("partidos"),
        obtenerMapaEquipos(),
        apiGet("campeonatos")
    ]);
    if (!datos || !campeonatos) return;

    const cont = document.getElementById("proximos-partidos");
    if (!cont) return;

    // Solo mostramos la siguiente jornada del campeonato activo. Así no se mezclan
    // partidos de temporadas anteriores ni jornadas ya disputadas.
    const activos = campeonatos
        .filter(c => String(c.estado || "").toLowerCase() === "activo")
        .sort((a,b) => Number(b.id_campeonato) - Number(a.id_campeonato));
    const actual = activos[0] || campeonatos.slice().sort((a,b) => Number(b.id_campeonato) - Number(a.id_campeonato))[0];
    if (!actual) {
        cont.innerHTML = '<div class="liga-upcoming-placeholder">No hay un campeonato activo registrado.</div>';
        return;
    }

    const hoy = new Date();
    const hoyStr = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');
    const futuros = datos.filter(p =>
        String(p.id_campeonato) === String(actual.id_campeonato) &&
        String(p.fecha || '') >= hoyStr &&
        String(p.estado || '').toLowerCase() !== 'finalizado'
    ).sort((a,b) => {
        const ka = `${a.fecha || ''} ${a.hora || ''}`;
        const kb = `${b.fecha || ''} ${b.hora || ''}`;
        return ka.localeCompare(kb);
    });

    if (!futuros.length) {
        cont.innerHTML = `<div class="liga-upcoming-empty"><i class="fas fa-calendar-check"></i><strong>No hay próximos partidos</strong><span>El calendario del campeonato activo todavía no tiene encuentros programados.</span></div>`;
        const contador = document.getElementById("partidos-programados-count");
        if (contador) contador.textContent = "";
        return;
    }

    const jornadas = futuros.map(p => Number(p.jornada)).filter(Number.isFinite);
    const siguienteJornada = jornadas.length ? Math.min(...jornadas) : null;
    const proximos = siguienteJornada === null ? futuros.slice(0, 6) : futuros.filter(p => Number(p.jornada) === siguienteJornada);

    const subtitulo = document.getElementById("proxima-fecha-subtitulo");
    if (subtitulo) {
        const primera = proximos[0];
        const d = primera?.fecha ? new Date(String(primera.fecha).slice(0,10) + 'T12:00:00') : null;
        const fechaTxt = d && !isNaN(d) ? d.toLocaleDateString('es-BO', {day:'2-digit', month:'long'}) : 'próximamente';
        subtitulo.textContent = `Jornada ${siguienteJornada ?? '-'} · ${fechaTxt} · ${actual.nombre || 'Campeonato'} ${actual.temporada || ''}`;
    }

    const fmtHora = h => String(h || '').slice(0,5) || '--:--';
    const fmtFecha = f => {
        if (!f) return '';
        const d = new Date(String(f).slice(0,10) + 'T12:00:00');
        return isNaN(d) ? String(f) : d.toLocaleDateString('es-BO',{weekday:'short',day:'2-digit',month:'short'});
    };

    cont.innerHTML = proximos.map(p => {
        const grupo = p.grupo || grupoDe(p.id_equipo_local);
        return `<a href="partido.html?id=${encodeURIComponent(p.id_partido)}" class="liga-upcoming-row">
            <div class="liga-upcoming-time"><strong>${fmtHora(p.hora)}</strong><span>${fmtFecha(p.fecha)}</span></div>
            <div class="liga-upcoming-teams"><strong>${nombreEquipo(mapaEquipos, p.id_equipo_local)}</strong><span class="liga-upcoming-vs">VS</span><strong>${nombreEquipo(mapaEquipos, p.id_equipo_visitante)}</strong></div>
            <div class="liga-upcoming-group">Grupo ${grupo}</div>
            <div class="liga-upcoming-arrow"><i class="fas fa-chevron-right"></i></div>
        </a>`;
    }).join('');

    const contador = document.getElementById("partidos-programados-count");
    if (contador) contador.textContent = `${proximos.length} partido${proximos.length === 1 ? '' : 's'} en la próxima jornada · Ver detalle en cada encuentro`;

    const statFecha = document.getElementById("stat-proxima-fecha");
    if (statFecha) statFecha.textContent = proximos[0] ? fmtFecha(proximos[0].fecha) : 'Por definir';
}
/* ---------- Goleadores del campeonato activo ---------- */
async function cargarGoleadores() {
    const [goles, jugadores, partidos, campeonatos] = await Promise.all([
        apiGet("detalle_goles"), apiGet("jugadores"), apiGet("partidos"), apiGet("campeonatos")
    ]);
    const cont = document.getElementById("top-goleadores");
    if (!cont) return;
    const camps = campeonatos || [];
    const activo = camps.find(c => String(c.estado || "").toLowerCase() === "activo")
        || camps.slice().sort((a,b) => Number(b.id_campeonato) - Number(a.id_campeonato))[0];
    if (!activo) { cont.innerHTML = '<p class="text-muted mb-0">No hay campeonato activo.</p>'; return; }
    const idsPartidos = new Set((partidos || [])
        .filter(p => String(p.id_campeonato) === String(activo.id_campeonato))
        .map(p => String(p.id_partido)));
    const golesCamp = (goles || []).filter(g => idsPartidos.has(String(g.id_partido)));
    const mapaJugadores = {};
    (jugadores || []).forEach(j => { mapaJugadores[String(j.id_jugador)] = `${j.nombre || ""} ${j.apellido || ""}`.trim(); });
    const conteo = {};
    golesCamp.forEach(g => { const id=String(g.id_jugador); conteo[id]=(conteo[id]||0)+1; });
    const ranking = Object.entries(conteo).sort((a,b) => b[1]-a[1] || String(mapaJugadores[a[0]]||"").localeCompare(String(mapaJugadores[b[0]]||""))).slice(0,5);
    if (!ranking.length) { cont.innerHTML = '<p class="text-muted mb-0">Todavía no hay goles detallados para el campeonato activo.</p>'; return; }
    cont.innerHTML = ranking.map(([jugadorId,total],i) => `
        <div class="liga-scorer-item">
            <span class="liga-scorer-name"><strong>${i+1}.</strong> ⚽ ${escaparTexto(mapaJugadores[jugadorId] || `Jugador #${jugadorId}`)}</span>
            <span class="liga-scorer-goals">${total}</span>
        </div>`).join("");
}

/* ---------- Campeón / eliminatoria ---------- */

async function cargarCampeon() {
    const panel = document.getElementById("campeon-panel");
    if (!panel) return;

    const [partidos, resultados, equipos, campeonatos, campeonatoEquipos, tablaPosiciones] = await Promise.all([
        apiGet("partidos"), apiGet("resultados"), obtenerMapaEquipos(), apiGet("campeonatos"), apiGet("campeonato_equipos"), apiGet("tabla_posiciones")
    ]);
    if (!partidos || !resultados || !equipos || !campeonatos) return;
    window.__LIGA_TABLA_POSICIONES__ = tablaPosiciones || [];

    const estado = c => String(c?.estado || "").toLowerCase();
    const faseDe = p => {
        const t = `${String(p?.observaciones || "")} ${String(p?.fase || p?.ronda || "")}`.toLowerCase();
        if (/cuartos|quarter/.test(t)) return "Cuartos de Final";
        if (/semifinal/.test(t)) return "Semifinal";
        if (/\bfinal\b/.test(t) && !/semifinal/.test(t)) return "Final";
        return "";
    };
    const resultadoDe = p => resultados.find(r => String(r.id_partido) === String(p.id_partido));
    const campeonDe = c => {
        if (estado(c) !== "finalizado") return null;

        const ps = partidos.filter(p => String(p.id_campeonato) === String(c.id_campeonato));
        const resultadoDePartido = p => resultados.find(r => String(r.id_partido) === String(p.id_partido));

        // 1) Preferimos una final explícita: es la fuente principal para torneos
        // que terminan con fase eliminatoria.
        let finals = ps.filter(p => faseDe(p) === "Final")
            .sort((a,b) => String(b.fecha || "").localeCompare(String(a.fecha || "")) || Number(b.id_partido) - Number(a.id_partido));

        if (!finals.length && ps.length) {
            const ce = (campeonatoEquipos || []).filter(x => String(x.id_campeonato) === String(c.id_campeonato));
            const grupos = {};
            ce.forEach(x => {
                const g = String(x.grupo || "").trim() || "UNICO";
                grupos[g] = (grupos[g] || 0) + 1;
            });
            const counts = Object.values(grupos);
            const equiposCount = counts.length
                ? counts.reduce((a,b) => a+b, 0)
                : new Set(ps.flatMap(p => [p.id_equipo_local, p.id_equipo_visitante])).size;
            const regularEsperada = counts.length
                ? counts.reduce((sum,n) => sum + (n * (n - 1)) / 2, 0)
                : (equiposCount * (equiposCount - 1)) / 2;

            const ordenados = ps.slice().sort((a,b) =>
                `${a.fecha || ""} ${a.hora || ""} ${a.id_partido}`
                    .localeCompare(`${b.fecha || ""} ${b.hora || ""} ${b.id_partido}`)
            );
            const extras = ordenados.slice(Math.max(0, Math.floor(regularEsperada)));
            if (extras.length >= 7) finals = [extras[6]];
        }

        if (finals.length) {
            const p = finals[0];
            const r = resultadoDePartido(p);
            if (r) {
                const gl = Number(r.goles_local), gv = Number(r.goles_visitante);
                let idGanador = null;
                if (String(r.ganador).toLowerCase() === "local" || gl > gv) idGanador = p.id_equipo_local;
                if (String(r.ganador).toLowerCase() === "visitante" || gv > gl) idGanador = p.id_equipo_visitante;
                if (idGanador) return { equipo: nombreEquipo(equipos, idGanador), partido:p, resultado:r, metodo:"final" };
            }
        }

        // 2) Torneos de liga que terminaron sin cuadro: campeón = primer lugar.
        // Usamos tabla_posiciones si existe; si no, la calculamos desde resultados.
        let filas = (campeonatoEquipos || [])
            .filter(x => String(x.id_campeonato) === String(c.id_campeonato))
            .map(x => Number(x.id_equipo));

        const tabla = [];
        const tablaRegistrada = (window.__LIGA_TABLA_POSICIONES__ || []);
        const registradas = tablaRegistrada.filter(x => String(x.id_campeonato) === String(c.id_campeonato));

        if (registradas.length) {
            registradas.forEach(x => tabla.push({
                id_equipo:Number(x.id_equipo),
                puntos:Number(x.puntos || 0),
                dg:Number(x.diferencia_goles || 0),
                gf:Number(x.goles_favor || 0)
            }));
        } else {
            const stats = {};
            ps.forEach(p => {
                const r = resultadoDePartido(p);
                if (!r) return;
                const gl = Number(r.goles_local || 0), gv = Number(r.goles_visitante || 0);
                [p.id_equipo_local, p.id_equipo_visitante].forEach(id => {
                    if (!stats[id]) stats[id] = { id_equipo:Number(id), puntos:0, dg:0, gf:0 };
                });
                stats[p.id_equipo_local].gf += gl;
                stats[p.id_equipo_local].dg += gl - gv;
                stats[p.id_equipo_visitante].gf += gv;
                stats[p.id_equipo_visitante].dg += gv - gl;
                if (gl > gv) stats[p.id_equipo_local].puntos += 3;
                else if (gv > gl) stats[p.id_equipo_visitante].puntos += 3;
                else { stats[p.id_equipo_local].puntos += 1; stats[p.id_equipo_visitante].puntos += 1; }
            });
            Object.values(stats).forEach(x => tabla.push(x));
        }

        if (!tabla.length && filas.length) {
            filas.forEach(id => tabla.push({id_equipo:id,puntos:0,dg:0,gf:0}));
        }

        tabla.sort((a,b) => (b.puntos-a.puntos) || (b.dg-a.dg) || (b.gf-a.gf));
        const primero = tabla[0];
        if (primero) {
            return {
                equipo: nombreEquipo(equipos, primero.id_equipo),
                partido: null,
                resultado: null,
                metodo:"tabla"
            };
        }
        return null;
    };

    const orden = campeonatos.slice().sort((a,b) => Number(b.id_campeonato) - Number(a.id_campeonato));
    const activo = orden.find(c => estado(c) === "activo") || orden[0];
    const historicos = orden.filter(c => estado(c) === "finalizado").map(c => ({ c, ch: campeonDe(c) })).filter(x => x.ch);

    let html = "";
    if (activo && estado(activo) === "activo") {
        html += `<div class="liga-champion-card liga-champion-running mb-4"><div class="liga-champion-trophy">🏆</div><div class="liga-champion-label">CAMPEONATO ACTUAL · ${escaparTexto(activo.temporada || "")}</div><div class="liga-champion-name">${escaparTexto(activo.nombre || "Campeonato")}</div><div class="liga-champion-final">En curso · todavía no hay campeón definido.</div></div>`;
    }

    if (historicos.length) {
        html += `<div class="liga-historical-champions"><div class="historical-title">Campeones de temporadas anteriores</div><div class="historical-grid">`;
        html += historicos.map(({c,ch}) => {
            const r = ch.resultado;
            const p = ch.partido;
            return `<a class="historical-champion-card" href="eliminatoria.html?campeonato=${encodeURIComponent(c.id_campeonato)}"><div class="historical-year">${escaparTexto(c.temporada || "")}</div><div class="historical-trophy">🏆</div><strong>${escaparTexto(ch.equipo)}</strong><span>${escaparTexto(c.nombre || "Torneo")}</span><small>${ch.metodo === "final" && r ? `Final: ${Number(r.goles_local)} - ${Number(r.goles_visitante)}` : "Primer lugar de la tabla"}</small></a>`;
        }).join("");
        html += `</div></div>`;
    }

    if (!html) html = `<div class="liga-champion-empty">Todavía no hay campeones históricos registrados con una final y resultado.</div>`;
    panel.innerHTML = html;
}

function escaparTexto(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}

/* ---------- Noticias ---------- */
async function cargarNoticias() {
    const datos = await apiGet("noticias", "?orderBy=fecha_publicacion&orderMode=DESC&startAt=0&endAt=3");
    if (!datos) return;
    const cont = document.getElementById("noticias-grid");
    if (!cont) return;
    limpiarPlaceholders(cont, ".noticia-placeholder");
    if (datos.length === 0) return;
    datos.forEach(n => {
        cont.innerHTML += `
            <div class="col-md-4">
                <div class="liga-news-card">
                    <img src="${n.imagen ? resolverUrlImagenPublica(n.imagen) : 'img/liga-hero-placeholder.jpg'}" alt="${n.titulo}">
                    <div class="liga-news-body">
                        <h5>${n.titulo}</h5>
                        <a href="noticias.html?id=${n.id_noticia}" class="liga-read-more">Leer más &rarr;</a>
                    </div>
                </div>
            </div>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    cargarStatEquipos();
    cargarTablaPosiciones();
    cargarEquipos();
    cargarProximosPartidos();
    cargarGoleadores();
    cargarCampeon();
    cargarNoticias();
});
