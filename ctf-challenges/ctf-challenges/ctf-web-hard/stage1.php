<?php
$admin_secret = $_SERVER['HTTP_X_ADMIN_SECRET'] ?? '';
$token = "Bypass_Gate_01_Success_2026";
$is_bypassed = ($admin_secret === 'SecuLearn_Admin_2026');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TERMINAL - STAGE 01</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root { --neon: #00f2ff; --bg: #05080a; --card: #0a0f14; --red: #ff3e3e; }
        body { background: var(--bg); color: var(--neon); font-family: 'Fira Code', monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; overflow: hidden; }
        .cyber-card { background: var(--card); border: 2px solid var(--neon); padding: 40px; border-radius: 5px; box-shadow: 0 0 20px rgba(0, 242, 255, 0.2); text-align: center; position: relative; width: 450px; }
        .status-box { border: 1px solid #30363d; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 0.9rem; background: rgba(0,0,0,0.3); }
        .error { color: var(--red); border-color: var(--red); }
        .success { color: #39ff14; border-color: #39ff14; }
        .btn { display: inline-block; padding: 12px 25px; border: 1px solid var(--neon); color: var(--neon); text-decoration: none; font-weight: bold; margin-top: 20px; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="cyber-card">
        <h1>Access Status</h1>
        <?php if (!$is_bypassed): ?>
            <div class="status-box error">
                <p>[!] ACCESS_DENIED</p>
                <p>Status: Missing Security Header</p>
            </div>
            <p style="font-size: 0.8rem; color: #586069;">Analyze the source code for hidden clues--> Auth_Gateway_Key (Base64): WC1BZG1pbi1TZWNyZXQ6IFNlY3VMZWFybl9BZG1pbl8yMDI2</p>
        <?php else: ?>
            <div class="status-box success">
                <p>[+] IDENTITY_VERIFIED</p>
                <p>Welcome back, Admin.</p>
            </div>
            <a href="stage2.php?id=100&auth=<?php echo $token; ?>" class="btn">Enter Stage 2</a>
        <?php endif; ?>
    </div>
</body>
</html>