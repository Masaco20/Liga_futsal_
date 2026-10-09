<?php

/*=============================================
Endpoint para subir archivos de imagen reales
(escudo de equipo, foto de jugador/árbitro,
imagen de noticia), en vez de pegar una URL.

Uso desde el frontend:
  POST api/upload.php
  Header: Authorization: <apikey>
  Body:   multipart/form-data con un campo "imagen"

Devuelve: {"status":200,"results":{"url":"uploads/xxxx.jpg"}}

La ruta devuelta es relativa a la carpeta api/, así que
desde html/ se guarda como "../api/uploads/xxxx.jpg" en
el campo correspondiente (escudo, foto, imagen).
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
Misma apikey que el resto de la API, y además
exige sesión de servidor (solo un usuario que
inició sesión puede subir archivos).
=============================================*/

$headers = getallheaders();
$auth = $headers["Authorization"] ?? "";

if ($auth !== Connection::apikey()) {
    responder(401, "No autorizado");
}

session_start();
if (!isset($_SESSION['id_usuario'])) {
    responder(401, "Sesión no válida o expirada. Vuelve a iniciar sesión.");
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, "Método no permitido");
}

if (!isset($_FILES['imagen']) || $_FILES['imagen']['error'] !== UPLOAD_ERR_OK) {
    responder(400, "No se recibió ningún archivo de imagen válido.");
}

$archivo = $_FILES['imagen'];

/*=============================================
Validaciones de seguridad: tamaño, y que el
contenido real del archivo sea una imagen (no
solo confiar en la extensión o el Content-Type
que manda el navegador, que se puede falsificar).
=============================================*/

$tamanoMaximo = 3 * 1024 * 1024; // 3 MB
if ($archivo['size'] > $tamanoMaximo) {
    responder(400, "La imagen no puede pesar más de 3 MB.");
}

$infoImagen = @getimagesize($archivo['tmp_name']);
if ($infoImagen === false) {
    responder(400, "El archivo no es una imagen válida.");
}

$extensionesPermitidas = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG  => 'png',
    IMAGETYPE_GIF  => 'gif',
    IMAGETYPE_WEBP => 'webp'
];

$tipo = $infoImagen[2];
if (!isset($extensionesPermitidas[$tipo])) {
    responder(400, "Formato de imagen no permitido. Usa JPG, PNG, GIF o WEBP.");
}

$extension = $extensionesPermitidas[$tipo];
$nombreArchivo = uniqid('img_', true) . '.' . $extension;
$carpetaDestino = DIR . '/uploads/';
$rutaDestino = $carpetaDestino . $nombreArchivo;

if (!is_dir($carpetaDestino)) {
    mkdir($carpetaDestino, 0755, true);
}

if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
    responder(500, "No se pudo guardar la imagen en el servidor.");
}

responder(200, ["url" => "uploads/" . $nombreArchivo]);
