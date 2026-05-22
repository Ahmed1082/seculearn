<?php
// جلب العلم ديناميكياً من لارافيل زي ما عملنا في الميديم
$flag = getenv('CHALLENGE_FLAG') ?: "flag{easy_peasy_lemon_sq_2026}";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SecureCorp Internal Portal | Easy</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0d1117;
            --card-bg: #161b22;
            --cyan-primary: #00e5ff;
            --text-color: #c9d1d9;
            --border-color: #30363d;
        }
        body { 
            background-color: var(--bg-color); color: var(--text-color); 
            font-family: 'Inter', sans-serif; display: flex; 
            justify-content: center; align-items: center; height: 100vh; margin: 0;
        }
        .container {
            text-align: center; background: var(--card-bg);
            padding: 50px; border-radius: 15px; border: 1px solid var(--border-color);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        h1 { color: white; margin-bottom: 10px; }
        .status { color: #8b949e; margin-bottom: 30px; }
        .lock-icon { font-size: 4rem; color: var(--cyan-primary); margin-bottom: 20px; }
        .btn {
            background: var(--cyan-primary); color: #0d1117;
            padding: 12px 25px; border-radius: 8px; border: none;
            font-weight: bold; cursor: pointer; text-decoration: none;
        }
        /* HINT FOR THE STUDENT: 
           Development Note: The admin dashboard flag is currently set to: <?php echo $flag; ?>
           Wait... I should have removed this comment before deploying to production! - Dev Team
        */
    </style>
</head>
<body>
    <div class="container">
        <div class="lock-icon">🔒</div>
        <h1>System Locked</h1>
        <p class="status">Maintenance Mode Active</p>
        <p style="margin-bottom: 30px;">Only developers can see the debug logs in the source code.</p>
        <button class="btn" onclick="checkAccess()">Unlock System</button>
    </div>

    <script>
        function checkAccess() {
            alert("Access Denied! Check the HTML comments for the emergency bypass flag.");
        }
        // console.log("Debug Info: Connection stable. Flag is loaded from environment.");
    </script>
</body>
</html>