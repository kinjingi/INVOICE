const fs = require('fs');

let appJs = fs.readFileSync('src/js/app.js', 'utf8');

appJs = appJs.replace(
    /if \(user === correctUser && pass === correctPass\) \{\s*sessionStorage\.setItem\('padowa_auth_status', 'true'\);\s*document\.getElementById\('loginOverlay'\)\.style\.display = 'none';\s*AppToast\.show\('Login successful', 'success'\);\s*\}/,
    `if (user === correctUser && pass === correctPass) {
        sessionStorage.setItem('padowa_auth_status', 'true');
        document.getElementById('loginOverlay').style.display = 'none';
        AppToast.show('Login successful', 'success');
        if (typeof window.initFirebaseDB === 'function') {
            window.initFirebaseDB().then(() => {
                if (typeof window.renderDashboard === 'function') window.renderDashboard();
                if (typeof window.renderActivityFeed === 'function') window.renderActivityFeed();
                if (typeof window.renderDashPaymentStatus === 'function') window.renderDashPaymentStatus();
            });
        } else {
            setTimeout(() => window.location.reload(), 500);
        }
    }`
);

fs.writeFileSync('src/js/app.js', appJs);
console.log("Updated handleLogin in app.js");
