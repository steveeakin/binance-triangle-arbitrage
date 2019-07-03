<?php

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::create(__DIR__ . '/..');
$dotenv->load();

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
	$pid = shell_exec($_ENV['PID']);

	if (!empty($pid)) {
		$pid = explode(' ', $pid);
	}

	if (!empty($pid) && (!empty($pid[$_ENV['PID_NUMBER']]) && is_numeric($pid[$_ENV['PID_NUMBER']]))) {
		if ($pid[$_ENV['PID_NUMBER']] == $_POST['pid']) {
			shell_exec('kill -9 ' . $pid[$_ENV['PID_NUMBER']]);
		}
	}
}

header('Location: /');
exit;

?>