<?php
$token = $_GET['auth'] ?? '';
if ($token !== "Bypass_Gate_01_Success_2026") {
    echo "<body style='background:#05080a; color:red; font-family:monospace; text-align:center; padding-top:50px;'><h1>[!] UNAUTHORIZED</h1></body>";
    exit;
}
$id = $_GET['id'] ?? '100';
$is_admin = ($id == '1');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TERMINAL - STAGE 02</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root { --neon: #00f2ff; --bg: #05080a; --card: #0a0f14; --gold: #ffd700; }
        body { background: var(--bg); color: var(--neon); font-family: 'Fira Code', monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .cyber-card { background: var(--card); border: 2px solid var(--neon); padding: 40px; border-radius: 5px; width: 450px; }
        .btn { display: inline-block; padding: 10px 20px; border: 1px solid var(--neon); color: var(--neon); text-decoration: none; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="cyber-card">
        <h1>User Records</h1>
        <p>Browsing ID: <?php echo htmlspecialchars($id); ?></p>
        <div style="border-left: 3px solid var(--neon); padding-left: 20px;">
            <?php if ($is_admin): ?>
                <h3 style="color: var(--gold);">ROLE: SUPER_ADMIN</h3>
                <p>Passcode: <b>SuperSecret2026</b></p>
                <a href="stage3.php?auth=Bypass_Gate_01_Success_2026" class="btn">Proceed to Stage 3</a>
            <?php else: ?>
                <h3>ROLE: STAFF</h3>
                <p>Access Level: Low. Admin data is restricted.</p>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>