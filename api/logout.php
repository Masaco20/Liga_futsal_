<?php

/*=============================================
Cierra la sesión del servidor. Se llama junto con
borrar el sessionStorage del navegador, para que la
sesión quede invalidada de verdad de los dos lados.
=============================================*/

header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('content-type: application/json; charset=utf-8');

session_start();
$_SESSION = array();
session_destroy();

echo json_encode(["status" => 200, "results" => "Sesión cerrada"]);
