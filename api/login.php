<?php

/*=============================================
Endpoint de login dedicado.

A diferencia de la API genérica (que solo hace SELECT/INSERT/
UPDATE/DELETE crudos), este archivo compara la contraseña
DENTRO del servidor con password_verify(), así el navegador
nunca recibe el hash de la contraseña de nadie, ni siquiera
para compararlo.

Uso desde el frontend:
  POST api/login.php
  Header: Authorization: <apikey>
  Body:   correo=...&password=...
=============================================*/

define('DIR', __DIR__);
ini_set("display_errors", 1);
ini_set("log_errors", 1);
ini_set("error_log", DIR . "/php_error_log");

header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('content-type: application/json; charset=utf-8');

require_once "models/connection.php";

function responder($status, $results) {
    echo json_encode(["status" => $status, "results" => $results], http_response_code($status));
    exit;
}

/*=============================================
Requiere la misma apikey que usa el resto de la API
=============================================*/

$headers = getallheaders();
$auth = $headers["Authorization"] ?? "";

if ($auth !== Connection::apikey()) {
    responder(401, "No autorizado");
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, "Método no permitido");
}

$correo = $_POST['correo'] ?? '';
$password = $_POST['password'] ?? '';

if ($correo === '' || $password === '') {
    responder(400, "Correo y contraseña son obligatorios");
}

try {
    $link = Connection::connect();
    $stmt = $link->prepare("SELECT * FROM usuarios WHERE correo = :correo LIMIT 1");
    $stmt->bindParam(":correo", $correo, PDO::PARAM_STR);
    $stmt->execute();
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$usuario) {
        responder(400, "No existe un usuario con ese correo.");
    }

    if ((int)$usuario['estado'] !== 1) {
        responder(400, "Este usuario está inactivo.");
    }

    $hashGuardado = $usuario['password'];

    // Compatibilidad: si la contraseña en la base todavía está en
    // texto plano (cuentas viejas de antes de este cambio), se
    // acepta comparando directo UNA vez, y de inmediato se re-guarda
    // ya hasheada para que la próxima vez sea segura.
    $esHashValido = password_verify($password, $hashGuardado);
    $eraTextoPlano = !$esHashValido && $password === $hashGuardado;

    if (!$esHashValido && !$eraTextoPlano) {
        responder(400, "Contraseña incorrecta.");
    }

    if ($eraTextoPlano) {
        $nuevoHash = password_hash($password, PASSWORD_DEFAULT);
        $upd = $link->prepare("UPDATE usuarios SET password = :password WHERE id_usuario = :id");
        $upd->bindParam(":password", $nuevoHash, PDO::PARAM_STR);
        $upd->bindParam(":id", $usuario['id_usuario'], PDO::PARAM_INT);
        $upd->execute();
    }

    unset($usuario['password']); // nunca se devuelve la contraseña/hash al navegador

    // Sesión real del lado del servidor: esto es lo que de verdad
    // autoriza a escribir datos (ver routes.php), no solo la apikey
    // que viaja en el JavaScript del navegador.
    session_start();
    session_regenerate_id(true);
    $_SESSION['id_usuario'] = $usuario['id_usuario'];
    $_SESSION['rol'] = $usuario['rol'];
    $_SESSION['correo'] = $usuario['correo'];

    responder(200, $usuario);

} catch (PDOException $e) {
    responder(500, "Error de base de datos: " . $e->getMessage());
}
