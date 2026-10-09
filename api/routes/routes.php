<?php
require_once "controllers/get.controller.php";
require_once "controllers/post.controller.php";
require_once "controllers/put.controller.php";
require_once "controllers/delete.controller.php";

/*=============================================
Parámetros que llegan por la URL (?table=...&id=...)
=============================================*/
$table    = $_GET['table'] ?? null;
$select   = $_GET['select'] ?? "*";
$orderBy  = $_GET['orderBy'] ?? null;
$orderMode = $_GET['orderMode'] ?? null;
$startAt  = $_GET['startAt'] ?? null;
$endAt    = $_GET['endAt'] ?? null;
$id       = $_GET['id'] ?? null;
$nameId   = $_GET['nameId'] ?? null;
$linkTo   = $_GET['linkTo'] ?? null;
$equalTo  = $_GET['equalTo'] ?? null;
$except   = $_GET['except'] ?? null;

if ($table === null) {
    $json = array(
        'status' => 400,
        "results" => "Falta el parámetro 'table' en la URL"
    );
    echo json_encode($json, http_response_code($json["status"]));
    return;
}

/*=============================================
Validar llave secreta — aceptar de varias formas
=============================================*/
$clave_recibida = "";

// 1️⃣ Desde encabezado Authorization
if (isset(getallheaders()["Authorization"])) {
    $clave_recibida = getallheaders()["Authorization"];
}
// 2️⃣ Desde parámetro en la URL
elseif (isset($_GET['api_key'])) {
    $clave_recibida = $_GET['api_key'];
}

$clave_correcta = Connection::apikey();

if ($clave_recibida != $clave_correcta) {
    if (in_array($table, Connection::publicAccess()) == 0) {
        $json = array(
            'status' => 400,
            "results" => "You are not authorized to make this request"
        );
        echo json_encode($json, http_response_code($json["status"]));
        return;
    } else {
        // Acceso público: solo lectura (GET), siempre con GetController
        GetController::getData($table, "*", null, null, null, null);
        return;
    }
}

/*=============================================
Autorizado con la API key correcta —
Aquí despachamos según el método HTTP
=============================================*/
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':

        if ($id !== null && $nameId !== null) {
            // Traer un registro puntual por su id (nameId = columna PK)
            GetController::getDataFilter($table, $select, $nameId, $id, $orderBy, $orderMode, $startAt, $endAt);

        } elseif ($linkTo !== null && $equalTo !== null) {
            // Traer registros filtrados por cualquier columna
            GetController::getDataFilter($table, $select, $linkTo, $equalTo, $orderBy, $orderMode, $startAt, $endAt);

        } else {
            // Traer todos los registros de la tabla
            GetController::getData($table, $select, $orderBy, $orderMode, $startAt, $endAt);
        }

        break;

    case 'POST':

        // Los formularios del panel envían application/x-www-form-urlencoded,
        // así que PHP ya llena $_POST automáticamente.
        $data = $_POST;

        if ($except !== null && isset($data[$except])) {
            unset($data[$except]);
        }

        PostController::postData($table, $data);

        break;

    case 'PUT':

        // PHP no llena $_PUT solo: hay que leerlo manualmente del cuerpo crudo.
        parse_str(file_get_contents("php://input"), $data);

        if ($except !== null && isset($data[$except])) {
            unset($data[$except]);
        }

        if ($id === null || $nameId === null) {
            $json = array(
                'status' => 400,
                "results" => "Faltan los parámetros 'id' y/o 'nameId' para actualizar"
            );
            echo json_encode($json, http_response_code($json["status"]));
            break;
        }

        PutController::putData($table, $data, $id, $nameId);

        break;

    case 'DELETE':

        if ($id === null || $nameId === null) {
            $json = array(
                'status' => 400,
                "results" => "Faltan los parámetros 'id' y/o 'nameId' para eliminar"
            );
            echo json_encode($json, http_response_code($json["status"]));
            break;
        }

        DeleteController::deleteData($table, $id, $nameId);

        break;

    default:

        $json = array(
            'status' => 405,
            "results" => "Método no permitido"
        );
        echo json_encode($json, http_response_code($json["status"]));
}
