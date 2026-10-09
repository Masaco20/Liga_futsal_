<?php 

require_once "connection.php";
require_once "get.model.php";

class PutModel{

	/*=============================================
	Peticion Put para editar datos de forma dinámica
	=============================================*/

	static public function putData($table, $data, $id, $nameId){

		/*=============================================
		Validar el ID
		=============================================*/

		$response = GetModel::getDataFilter($table, $nameId, $nameId, $id, null,null,null,null);
		
		if(empty($response)){

			return null;

		}

		/*=============================================
		Actualizamos registros
		=============================================*/

		$set = "";

		foreach ($data as $key => $value) {
			
			$set .= $key." = :".$key.",";
			
		}

		$set = substr($set, 0, -1);

		$sql = "UPDATE $table SET $set WHERE $nameId = :$nameId";

		$link = Connection::connect();
		$stmt = $link->prepare($sql);

		foreach ($data as $key => $value) {

			$stmt->bindParam(":".$key, $data[$key], PDO::PARAM_STR);
		
		}

		$stmt->bindParam(":".$nameId, $id, PDO::PARAM_STR);

		try{

			if($stmt -> execute()){

				$response = array(

					"comment" => "The process was successful"
				);

				return $response;

			}else{

				return $link->errorInfo();

			}

		}catch(PDOException $e){

			if(strpos($e->getMessage(), "1451") !== false || strpos($e->getMessage(), "1452") !== false){

				return array(
					"status" => 400,
					"results" => "No se pudo guardar: el valor seleccionado no existe o está siendo usado en un lugar no permitido."
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