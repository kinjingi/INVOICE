const fs = require('fs');
const path = require('path');
const historyDir = 'C:\\Users\\praveen\\AppData\\Roaming\\Antigravity IDE\\User\\History';

if (fs.existsSync(historyDir)) {
    const dirs = fs.readdirSync(historyDir);
    let latestFile = null;
    let latestMtime = 0;
    
    dirs.forEach(d => {
        const dPath = path.join(historyDir, d);
        if(fs.statSync(dPath).isDirectory()) {
            fs.readdirSync(dPath).forEach(f => {
                const fPath = path.join(dPath, f);
                const stat = fs.statSync(fPath);
                if (stat.isFile()) {
                    try {
                        const content = fs.readFileSync(fPath, 'utf8');
                        if (content.includes('id="markAsFiledModal"')) {
                            if (stat.mtimeMs > latestMtime) {
                                latestMtime = stat.mtimeMs;
                                latestFile = fPath;
                            }
                        }
                    } catch(e){}
                }
            });
        }
    });
    
    if(latestFile) {
        console.log('Found latest history file:', latestFile);
        fs.copyFileSync(latestFile, 'index_recovered3.html');
        console.log('Restored index.html!');
    } else {
        console.log('No history found');
    }
} else {
    console.log('History dir not found');
}
