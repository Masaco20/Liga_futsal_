<?php 

require_once "connection.php";

class PostModel{

	/*=============================================
	Peticion POST para crear datos de forma dinámica
	=============================================*/

	static public function postData($table, $data){

		$columns = "";
		$params = "";

		foreach ($data as $key => $value) {
			
			$columns .= $key.",";
			
			$params .= ":".$key.",";
			
		}

		$columns = substr($columns, 0, -1);
		$params = substr($params, 0, -1);


		$sql = "INSERT INTO $table ($columns) VALUES ($params)";

		$link = Connection::connect();
		$stmt = $link->prepare($sql);

		foreach ($data as $key => $value) {

			$stmt->bindParam(":".$key, $data[$key], PDO::PARAM_STR);
		
		}

		try{

			if($stmt -> execute()){

				$response = array(

					"lastId" => $link->lastInsertId(),
					"comment" => "The process was successful"
				);

				return $response;

			}else{

				return $link->errorInfo();

			}

		}catch(PDOException $e){

			if(strpos($e->getMessage(), "1452") !== false){

				return array(
					"status" => 400,
					"results" => "No se pudo guardar: el valor seleccionado (ej. equipo, categoría, partido) no existe."
				);

			}

			if(strpos($e->getMessage(), "1062") !== false){

				return array(
					"status" => 400,
					"results" => "No se pudo guardar: ya existe un registro con ese mismo valor único (ej. correo o código repetido)."
				);

			}

			return array(
				"status" => 400,
				"results" => "Error de base de datos: " . $e->getMessage()
			);

		}


	}

}