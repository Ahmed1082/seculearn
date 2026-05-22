<?php
// --- جلب الـ Flag من البيئة أو استخدام قيمة افتراضية ---
$flag = getenv('CHALLENGE_FLAG') ?: "flag{default_flag_for_testing}";

// --- الـ SQL Logic الواقعي ---
$db = new PDO('sqlite::memory:');
$db->exec("CREATE TABLE users (id INTEGER, username TEXT, password TEXT)");
$db->exec("INSERT INTO users VALUES (1, 'admin', 'very_strong_password_12345')");
$db->exec("INSERT INTO users VALUES (2, 'guest', 'guest123')");

$status_message = "";
if (isset($_POST['username'])) {
    $user = $_POST['username'];
    $pass = $_POST['password'];

    // الثغرة الحقيقية
    $query = "SELECT * FROM users WHERE username = '$user' AND password = '$pass'";
    
    try {
        $result = $db->query($query);
        $found = $result ? $result->fetch() : false;

        if ($found) {
            $status_message = "<div class='alert alert-success'>
                <p>Authentication bypassed. Logged in as admin.</p>
                <p class='flag-text'><b>Flag: " . htmlspecialchars($flag) . "</b></p>
                <button class='copy-btn'>Copy flag</button>
            </div>";
        } else {
            $status_message = "<div class='alert alert-danger'>Invalid login!</div>";
        }
    } catch (Exception $e) {
        $status_message = "<div class='alert alert-error'>SQL Error! (Try harder...)</div>";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SecureCorp Admin Portal | Lab-01.ctf</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0d1117;
            --card-bg: #161b22;
            --cyan-primary: #00e5ff;
            --cyan-hover: #00b8d4;
            --text-color: #c9d1d9;
            --border-color: #30363d;
            --input-bg: #0d1117;
            --success-green: #2ecc71;
            --error-red: #e74c3c;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
            background-color: var(--bg-color); 
            color: var(--text-color); 
            font-family: 'Inter', sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh;
            -webkit-font-smoothing: antialiased;
        }

        .login-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 40px;
            width: 400px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            text-align: center;
        }

        .icon-header { color: var(--cyan-primary); font-size: 2em; margin-bottom: 10px; }
        h2 { color: white; font-weight: 700; margin-bottom: 5px; font-size: 1.5rem;}
        .subtitle { color: #8b949e; font-size: 0.9rem; margin-bottom: 30px; }

        input { 
            display: block; margin-bottom: 15px; padding: 15px; width: 100%; 
            border-radius: 8px; border: 1px solid var(--border-color); 
            background-color: var(--input-bg); color: white; font-size: 1rem;
        }

        input:focus { outline: none; border-color: var(--cyan-primary); }

        button.submit-btn { 
            background-color: var(--cyan-primary); color: #0a0e17; border: none; 
            padding: 15px; width: 100%; border-radius: 8px; cursor: pointer; 
            font-weight: 700; font-size: 1.1rem; text-transform: uppercase;
        }

        .alert { border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 0.95rem; text-align: left; }
        .alert-success { background-color: rgba(46, 204, 113, 0.1); border: 1px solid var(--success-green); color: var(--success-green); }
        .alert-danger { background-color: rgba(231, 76, 60, 0.1); border: 1px solid var(--error-red); color: var(--error-red); }

        .flag-text { margin-top: 10px; font-family: monospace; font-size: 1.1em; color: white; word-break: break-all;}
        .copy-btn { background: none; border: 1px solid var(--border-color); color: var(--text-color); padding: 5px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="icon-header">🛡️</div>
        <h2>SecureCorp Admin Portal</h2>
        <p class="subtitle">Authorized personnel only</p>
        <?php echo $status_message; ?>
        <form method="POST">
            <input type="text" name="username" placeholder="Username" required autocomplete="off">
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit" class="submit-btn">Sign In</button>
        </form>
        <p style="font-size: 0.85em; color: #586069; margin-top: 15px;">Normal login: <span style="color: var(--cyan-primary);">guest / guest123</span></p>
    </div>
</body>
</html>