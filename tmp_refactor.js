const fs = require('fs');
const path = require('path');

const routesDir = path.join(process.cwd(), 'server', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

for (const file of files) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Add "next" to all handlers: async (req, res) => async (req, res, next)
    // Also handle cases like "async (req, res, next)" to avoid duplication
    // Wait, some might already have next. Let's just match exact async (req, res)
    content = content.replace(/async\s*\(\s*req\s*,\s*res\s*\)/g, 'async (req, res, next)');

    // 2. Replace catch bodies.
    // We want to match: catch (err) { ... }
    // We will pass a function to replace to get the matched variable.
    content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{([\s\S]*?)\n\s*\}/g, (match, errVar, body) => {
        // Check if the body already ONLY contains next(err) or equivalent
        if (body.trim() === `next(${errVar});`) {
            return match;
        }
        // Need to avoid replacing catch blocks inside nested logic that shouldn't go to next() if any.
        // In Express route handlers, top level try-catch usually handles everything, but let's just 
        // replace it with `next(errVar)` to unify error handling.
        // Wait, let's keep console.log if they exist? Prompt says:
        // "Ensure every handler uses ... next(err)"
        // Let's just simply replace with next(err) but keep console.logs if they are there?
        // Let's just put next(errVar)
        let logs = [];
        const lines = body.split('\n');
        for (const line of lines) {
            if (line.includes('console.error') || line.includes('console.log') || line.includes('console.warn')) {
                logs.push(line);
            }
        }

        let result = `catch (${errVar}) {\n`;
        for (const log of logs) {
            result += `${log}\n`;
        }
        result += `        next(${errVar});\n    }`;
        return result;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + file);
    }
}
console.log('Done Routes');
