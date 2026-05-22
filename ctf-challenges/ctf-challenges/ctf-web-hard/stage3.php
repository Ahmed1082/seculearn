<?php
$token = $_GET['auth'] ?? '';
if ($token !== "Bypass_Gate_01_Success_2026") { header("Location: stage1.php"); exit; }

$flag = getenv('CHALLENGE_FLAG') ?: "flag{hard_triple_gate_mastered_2026}";
$passcode = $_POST['passcode'] ?? '';
$page = $_GET['file'] ?? '';
$authenticated = ($passcode === 'SuperSecret2026');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TERMINAL - FINAL_STAGE</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root { --neon: #00f2ff; --bg: #05080a; --card: #0a0f14; --green: #39ff14; --red: #ff3e3e; }
        body { background: var(--bg); color: var(--neon); font-family: 'Fira Code', monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .cyber-card { background: var(--card); border: 2px solid var(--neon); padding: 40px; border-radius: 5px; width: 500px; }
        input { background: transparent; border: 1px solid var(--neon); color: var(--neon); padding: 10px; width: 100%; margin-bottom: 10px; }
        .flag-box { border: 2px double var(--green); padding: 20px; color: var(--green); margin-top: 20px; }
    </style>
</head>
<body>
    <div class="cyber-card">
        <h1>Secure Explorer</h1>
        <?php if (!$authenticated && empty($page)): ?>
            <form method="POST">
                <input type="password" name="passcode" placeholder="Enter Passcode" required>
                <button type="submit" style="background:var(--neon); border:none; width:100%; padding:10px; cursor:pointer;">DECRYPT</button>
            </form>
        <?php elseif (!empty($page)): ?>
            <div class="status-box">
                <?php 
                if ($page === "../secret_flag.txt") {
                    echo "<div class='flag-box'>[+] SENSITIVE_FILE_OPENED<br><br>FLAG: " . htmlspecialchars($flag) . "</div>";
                } elseif ($page === "welcome.txt") {
                    echo "<p>Welcome. Current directory: /var/www/html/public/</p>";
                    echo "<p style='color:orange;'>Warning: Hidden files may exist in parent directories (../)</p>";
                } else {
                    echo "<p style='color:var(--red);'>[!] ERROR: Cannot read " . htmlspecialchars($page) . "</p>";
                }
                ?>
            </div>
            <a href="stage3.php?auth=Bypass_Gate_01_Success_2026" style="color:var(--neon); font-size:0.8rem;">[ Back ]</a>
        <?php else: ?>
            <p style="color: var(--green);">[+] ACCESS GRANTED</p>
            <ul>
                <li><a href="stage3.php?auth=Bypass_Gate_01_Success_2026&file=welcome.txt" style="color:var(--neon);">welcome.txt</a></li>
            </ul>
        <?php endif; ?>
    </div>
</body>
</html>