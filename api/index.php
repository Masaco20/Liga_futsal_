<?php
define('DIR', __DIR__);
ini_set("display_errors", 1);
ini_set("log_errors", 1);
ini_set("error_log", DIR."/php_error_log");

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("content-type: application/json; charset=utf-8");

require_once __DIR__ . "/models/connection.php";
require_once __DIR__ . "/controllers/routes.controller.php";

$index = new RoutesController();
$index -> index();