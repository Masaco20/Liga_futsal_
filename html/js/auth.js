/* =====================================================
   Liga Provincial de Futsal Vaca Diez #1
   Autenticación del panel de administración
   ===================================================== */

const AUTH_API_BASE_URL = "../api/index.php";
const AUTH_LOGIN_URL = "../api/login.php";
const AUTH_LOGOUT_URL = "../api/logout.php";

// ⚠️ PEGA AQUÍ LA MISMA CLAVE QUE TIENES EN api/index.php
const AUTH_API_KEY = "sfgfgdfhdfhdgfhrtwertwedsfasdfasde";

const AUTH_SESSION_KEY = "liga_admin_session";

async function intentarLogin(correo, contrasena) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(AUTH_LOGIN_URL, {
            method: "POST",
            headers: {
                "Authorization": AUTH_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: new URLSearchParams({ correo, password: contrasena }).toString(),
            credentials: "same-origin",
            signal: controller.signal
        });

        const texto = await res.text();
        let data = null;
        try {
            data = JSON.parse(texto);
        } catch (e) {
            console.error("Respuesta no JSON de login.php:", res.status, texto);
            return {
                ok: false,
                mensaje: `El servidor respondió HTTP ${res.status} pero no devolvió JSON. Revisa XAMPP/Apache/PHP y api/php_error_log.`
            };
        }

        if (!res.ok || !data || data.status !== 200) {
            return {
                ok: false,
                mensaje: (data && typeof data.results === "string")
                    ? data.results
                    : `No se pudo iniciar sesión (HTTP ${res.status}).`
            };
        }

        const usuario = data.results;
        const sesion = {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            usuario: usuario.usuario,
            correo: usuario.correo,
            rol: usuario.rol
        };
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sesion));
        return { ok: true, usuario: sesion };
    } catch (e) {
        console.error("Error de login:", e);
        if (e.name === "AbortError") {
            return {
                ok: false,
                mensaje: "El servidor no respondió en 8 segundos. Verifica que Apache y MySQL/MariaDB estén iniciados en XAMPP y que la base liga_futsal exista."
            };
        }
        return {
            ok: false,
            mensaje: "No se pudo conectar con la API. Verifica que Apache esté iniciado y que exista api/login.php."
        };
    } finally {
        clearTimeout(timeout);
    }
}

async function registrarAficionado({ nombre, apellido, usuario, correo, contrasena }) {
    const dataForm = new URLSearchParams({
        nombre, apellido, usuario, correo,
        password: contrasena,
        rol: "Aficionado",
        estado: 1
    });
    const res = await fetch(`${AUTH_API_BASE_URL}?table=usuarios&token=no&except=id_usuario`, {
        method: "POST",
        headers: {
            "Authorization": AUTH_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: dataForm.toString()
    });
    const data = await res.json();
    if (data && (data.status === 200 || data.status === 201)) {
        return { ok: true };
    }
    return { ok: false, mensaje: (data && data.results) ? data.results : "No se pudo registrar la cuenta." };
}

function sesionActual() {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
}

function exigirSesion() {
    const sesion = sesionActual();
    if (!sesion) {
        window.location.href = "login.html";
        return null;
    }
    return sesion;
}

function exigirSesionStaff() {
    const sesion = exigirSesion();
    if (sesion && sesion.rol === "Aficionado") {
        alert("Esta sección es solo para personal de la liga (Administrador o Secretario).");
        window.location.href = "index.html";
        return sesion;
    }
    return sesion;
}

function cerrarSesion() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    fetch(AUTH_LOGOUT_URL, { method: "POST" }).catch(() => {});
    window.location.href = "login.html";
}