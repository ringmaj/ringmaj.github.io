<?php
$server = 'localhost';
$username ='root';
$password = 'qproject';
$database = 'auth2';

try{
	$conn = new PDO("mysql:host=$server;dbname=$database;", $username, $password);
} catch(PDOException $e){
	die( "Connection failed: " . $e->getMessage());
}


?>