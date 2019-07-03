<?php

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::create(__DIR__ . '/..');
$dotenv->load();

if (($_SERVER['REQUEST_METHOD'] == 'POST') && !empty($_POST['password']) && ($_POST['password'] == $_ENV['START_PASSWORD'])) {
	$process = shell_exec($_ENV['LAUNCH_CODE']);
}

header('Location: /');
exit;

?>