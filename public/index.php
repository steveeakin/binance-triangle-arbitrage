<?php

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::create(__DIR__ . '/..');
$dotenv->load();

$status = 'not running.';
$running = false;

$pid = shell_exec($_ENV['PID']);
$server = $_ENV['SERVER_FRIENDLY_NAME'];

if (!empty($pid)) {
	$pid = explode(' ', $pid);
}

if (!empty($pid) && (!empty($pid[$_ENV['PID_NUMBER']]) && is_numeric($pid[$_ENV['PID_NUMBER']]))) {
	$status = 'running (pid ' . $pid[$_ENV['PID_NUMBER']] . ')';
	$pid = $pid[$_ENV['PID_NUMBER']];
	$running = true;
} else {
	$pid = false;
}

?>
<!doctype html>
<html>
	<head>
		<title>Bermuda | Crypto Triangle Arbitrage HUD</title>
		<style type="text/css">
			html, body { height: 100%; }
			button { float: right; margin-left: 5px; margin-right: 5px; margin-top: 0; margin-bottom: 0;}
			iframe { z-index: -1000; }
			.start {
				background-color: #28a745;
				border-color: #28a745;
			}

			.stop {
				background-color: #dc3545;
				border-color: #dc3545;
			}

			button:not(:disabled):not(.disabled) {
				cursor: pointer;
			}

			button {
				color: #fff;
				display: inline-block;
			    font-weight: 400;
			    text-align: center;
			    white-space: nowrap;
			    vertical-align: middle;
			    -webkit-user-select: none;
			    -moz-user-select: none;
			    -ms-user-select: none;
			    user-select: none;
			    border: 1px solid transparent;
			    padding: .375rem .75rem;
			    font-size: 1rem;
			    line-height: 1.5;
			    border-radius: .25rem;
			    transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;
			}
		</style>
		<script type="text/javascript">
			function getPassword() {
				var password = prompt("Password?");

				if (password) {
					document.getElementById('password').value = password;

					return true;
				} else {
					return false;
				}
			}
		</script>
	</head>
	<body>
		<form method="POST" action="kill.php">
			<button class="stop" <?php if (!$running) { ?>disabled="disabled"<?php } ?>>STOP TRADING</button>
			<input type="hidden" value="<?php echo $pid; ?>" name="pid" />
		</form>
		<form method="POST" action="start.php" id="startForm">
			<button class="start" onClick="return getPassword();" <?php if ($running) { ?>disabled="disabled"<?php } ?>>START TRADING</button>
			<input type="hidden" value="" name="password" id="password"/>
		</form>
		<h1>Triangle HUD</h1>
		<h3>Bot status: <strong><?php echo $status; ?></strong></h3>
		<header>
			<p><a href="/">HUD</a> | <a href="/execution">Execution Log</a> | <a href="/performance">Performance Log</a></p>
		</header>
      	<iframe src="http://<?php echo $server; ?>:3030" name="shell" frameborder="0" scrolling="no" width="100%" height="800"></iframe>
	</body>
</html>