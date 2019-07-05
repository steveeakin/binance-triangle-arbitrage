<?php

$logs = file_get_contents('../logs/performance.log');
$logs = explode("\n", $logs);

?>

<html>
	<head>
		<title>Bermuda | Performance Logs</title>
		<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.19/css/jquery.dataTables.min.css" type="text/css">
	</head>
	<body>
		<h1>Performance Logs</h1>
		<table id="log" style="width:100%">
		    <thead>
		        <tr>
		            <th>Timestamp</th>
		            <th>Level</th>
		            <th>Log</th>
		        </tr>
		    </thead>
		    <tbody>
	        	<?php foreach($logs as $log) { ?>
	        		<tr>
	        			<td align="center"><?php echo trim(substr($log, stripos($log, '["') + 2, stripos($log, '"]') - 2)); ?></td>
	        			<td align="center"><?php echo trim(substr($log, stripos($log, '"]') + 2, stripos($log, ': ', stripos($log, '"]')) - stripos($log, '"]') - 1)); ?></td>
	        			<td align="center"><?php echo trim(substr($log, stripos($log, ':', stripos($log, '"]')) + 1)); ?></td>
	        		</tr>
	        	<?php } ?>
		        </tr>
		    </tbody>
		</table>
		<footer>
			<p><a href="/">HUD</a> | <a href="/execution">Execution Log</a> | <a href="/performance">Performance Log</a></p>
		</footer>
		<script type="text/javascript" src="https://code.jquery.com/jquery-3.3.1.js"></script>
		<script type="text/javascript" src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.min.js"></script>
		<script type="text/javascript">
			$(document).ready(function() {
			    $('#log').DataTable({
        			"order": [[ 0, "desc" ]]
    			});
			});
		</script>
	</body>
</html>