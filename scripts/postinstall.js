import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function removeBaileysBranding() {
    try {
        const baileysIndexPath = path.join(rootDir, 'node_modules', '@whiskeysockets', 'baileys', 'lib', 'index.js');
        
        if (await fs.pathExists(baileysIndexPath)) {
            let content = await fs.readFile(baileysIndexPath, 'utf8');
            
            const brandingRegex = /^const chalk = require\("chalk"\);[\s\S]*?console\.log\(\);/m;
            
            if (brandingRegex.test(content)) {
                content = content.replace(brandingRegex, '');
                await fs.writeFile(baileysIndexPath, content);
                console.log('✅ Removed Baileys branding');
            }
        }
    } catch (error) {
        console.log('⚠️  Could not remove Baileys branding:', error.message);
    }
}

async function postInstall() {
    console.log('\n🔧 Running post-install setup...\n');
    
    await removeBaileysBranding();

    const dirs = [
        'temp/downloads', 'temp/uploads', 'temp/stickers',
        'temp/audio', 'temp/video', 'temp/documents',
        'logs', 'session', 'cache',
        'backups/database', 'backups/session', 'backups/media',
        'media/profile', 'media/stickers', 'media/downloads', 'media/cache'
    ];

    for (const dir of dirs) {
        await fs.ensureDir(path.join(rootDir, dir));
    }

    if (!await fs.pathExists(path.join(rootDir, '.env'))) {
        if (await fs.pathExists(path.join(rootDir, '.env.example'))) {
            await fs.copy(
                path.join(rootDir, '.env.example'),
                path.join(rootDir, '.env')
            );
            console.log('✅ Created .env from .env.example');
        }
    }

    const requiredBinaries = {
        'ffmpeg': 'FFmpeg is required for media processing',
        'node': 'Node.js runtime'
    };

    for (const [binary, description] of Object.entries(requiredBinaries)) {
        try {
            const { execSync } = await import('child_process');
            const command = process.platform === 'win32' 
                ? `where ${binary}` 
                : `which ${binary}`;
            execSync(command, { stdio: 'ignore' });
            console.log(`✅ ${description}: Found`);
        } catch {
            if (binary === 'ffmpeg') {
                console.log(`⚠️  ${description}: Not found (optional, some features may not work)`);
            }
        }
    }

    console.log('\n✅ Post-install setup completed!\n');
}

postInstall().catch(error => {
    console.error('❌ Post-install failed:', error.message);
});
