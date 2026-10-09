/* =====================================================
   Liga Provincial de Futsal Vaca Diez #1
   Actualiza el botón de sesión del header público según
   si el visitante ya inició sesión (aficionado, secretario
   o administrador) o no.
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const caja = document.getElementById("liga-sesion-box");
    if (!caja) return;

    const sesion = sesionActual();

    if (!sesion) {
        return; // deja los botones "Iniciar sesión" / "Administrador" tal cual están
    }

    const esStaff = sesion.rol === "Administrador" || sesion.rol === "Secretario";

    caja.innerHTML = `
        <a href="my_account.html" style="margin-right:10px; color:#33443e; font-size:14px; text-decoration:none;">
            <i class="fas fa-user-circle"></i> ${sesion.nombre} <small style="opacity:.7;">(${sesion.rol})</small>
        </a>
        ${esStaff ? `<a href="admin.html" class="btn btn-sign-in" style="margin-right:8px;">Panel Admin</a>` : ""}
        <a href="#" id="liga-cerrar-sesion" class="btn btn-sign-in">Cerrar sesión</a>
    `;

    document.getElementById("liga-cerrar-sesion").addEventListener("click", (e) => {
        e.preventDefault();
        cerrarSesionPublica();
    });
});

function cerrarSesionPublica() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    fetch(AUTH_LOGOUT_URL, { method: "POST" }).catch(() => {});
    window.location.reload();
}
