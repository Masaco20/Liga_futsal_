<?php 

require_once "models/delete.model.php";

class DeleteController{

	/*=============================================
	Peticion Delete para eliminar datos
	=============================================*/

	static public function deleteData($table, $id, $nameId){

		$response = DeleteModel::deleteData($table, $id, $nameId);
		
		$return = new DeleteController();
		$return -> fncResponse($response);

	}

	/*=============================================
	Respuestas del controlador
	=============================================*/

	public function fncResponse($response){

		if(!empty($response) && is_array($response) && isset($response["status"])){

			// el modelo ya armó su propia respuesta de error (ej: llave foránea)
			$json = $response;

		}else if(!empty($response)){

			$json = array(

				'status' => 200,
				'results' => $response

			);

		}else{

			$json = array(

				'status' => 404,
				'results' => 'Not Found',
				'method' => 'delete'

			);

		}

		echo json_encode($json, http_response_code($json["status"]));

	}

}