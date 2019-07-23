<?php

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::create(__DIR__ . '/..');
$dotenv->load();

if (($_SERVER['REQUEST_METHOD'] == 'POST') && !empty($_POST['password']) && ($_POST['password'] == $_ENV['START_PASSWORD'])) {
	// Create a .start file in the root.
	$myfile = fopen(__DIR__ . '/../.start', 'w');
}

header('Location: /');
exit;

?>