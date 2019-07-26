<?php

// Run this every minute to ensure the bot is running, or not, when it's supposed to be.

require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::create(__DIR__);
$dotenv->load();

$pid = shell_exec($_ENV['CRON_PID']);

if (!empty($pid)) {
	$pid = explode(' ', $pid);
}

if (file_exists(__DIR__ . '/.start') && !(!empty($pid) && (!empty($pid[$_ENV['CRON_PID_NUMBER']]) && is_numeric($pid[$_ENV['CRON_PID_NUMBER']])) && (stristr($pid[$_ENV['CRON_NODE_PID']], 'node') !== false))) {
	// If .start exists, and pid is empty, launch.
	$process = shell_exec($_ENV['LAUNCH_CODE']);
} elseif (!file_exists(__DIR__ . '/.start') && (!empty($pid) && (!empty($pid[$_ENV['CRON_PID_NUMBER']]) && is_numeric($pid[$_ENV['CRON_PID_NUMBER']])))) {
	// If start doesn't exist, and the process is running, kill the process.
	shell_exec('kill -9 ' . $pid[$_ENV['CRON_PID_NUMBER']]);
}

?>