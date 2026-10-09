<?php 

require_once "connection.php";
require_once "get.model.php";

class DeleteModel{

	/*=============================================
	Peticion Delete para eliminar datos de forma dinámica
	=============================================*/

	static public function deleteData($table, $id, $nameId){

		/*=============================================
		Validar el ID
		=============================================*/

		$response = GetModel::getDataFilter($table, $nameId, $nameId, $id, null,null,null,null);
		
		if(empty($response)){

			return null;

		}

		/*=============================================
		Eliminamos registros
		=============================================*/

		$sql = "DELETE FROM $table WHERE $nameId = :$nameId";

		$link = Connection::connect();
		$stmt = $link->prepare($sql);

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

			// Error 1451: hay otra tabla que todavía referencia este registro
			// (ej: no se puede borrar una categoría mientras un campeonato la use)
			if(strpos($e->getMessage(), "1451") !== false){

				$tablaQueLoUsa = "otro registro";
				if(preg_match('/`([a-zA-Z_]+)`, CONSTRAINT/', $e->getMessage(), $match)){
					$tablaQueLoUsa = $match[1];
				}

				return array(
					"status" => 400,
					"results" => "No se puede eliminar: todavía hay registros en '$tablaQueLoUsa' que usan este dato. Elimina o reasigna esos registros primero."
				);

			}

			return array(
				"status" => 400,
				"results" => "Error de base de datos: " . $e->getMessage()
			);

		}

	}

}