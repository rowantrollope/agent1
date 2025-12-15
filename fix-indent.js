const fs = require('fs');
const path = require('path');

function normalizeIndentation(content) {
    const lines = content.split('\n');
    const normalizedLines = [];
    
    for (const line of lines) {
        // Match leading whitespace
        const match = line.match(/^(\s*)(.*)$/);
        if (!match) {
            normalizedLines.push(line);
            continue;
        }
        
        const [, leadingWhitespace, rest] = match;
        
        // If no leading whitespace, just push the line
        if (!leadingWhitespace) {
            normalizedLines.push(rest);
            continue;
        }
        
        // Count the actual indent level by treating tabs as 4 spaces
        // and spaces as 1 space, but we need to figure out the base indent unit
        // Strategy: find the most common indent unit (2 or 4 spaces) in the file
        // For now, let's be smart: detect if it's likely 2-space or 4-space based on common patterns
        
        // Convert tabs to 4 spaces temporarily
        const normalizedWhitespace = leadingWhitespace.replace(/\t/g, '    ');
        const spaceCount = normalizedWhitespace.length;
        
        // Detect base indent unit: if we see many 2-space indents, use 2; if 4-space, use 4
        // But we want to convert everything to 4-space, so:
        // - If spaceCount is divisible by 4, keep it (already 4-space)
        // - If spaceCount is divisible by 2, convert to 4-space
        // - Otherwise, approximate
        
        let indentLevel;
        if (spaceCount % 4 === 0) {
            // Already in 4-space units
            indentLevel = spaceCount / 4;
        } else if (spaceCount % 2 === 0) {
            // In 2-space units, convert to 4-space
            indentLevel = spaceCount / 2;
        } else {
            // Odd number, approximate (likely a 2-space base with 1 extra)
            indentLevel = Math.round(spaceCount / 2);
        }
        
        // Convert to 4-space indentation
        const newIndent = ' '.repeat(indentLevel * 4);
        normalizedLines.push(newIndent + rest);
    }
    
    return normalizedLines.join('\n');
}

function walkDir(dir, extensions, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file[0] !== '.') {
                walkDir(filePath, extensions, fileList);
            }
        } else {
            const ext = path.extname(file);
            if (extensions.includes(ext)) {
                fileList.push(filePath);
            }
        }
    });
    
    return fileList;
}

// Find all TypeScript/TSX/CSS files
const srcFiles = walkDir('./src', ['.ts', '.tsx', '.css']);
const configFiles = walkDir('.', ['.ts', '.tsx', '.mjs']).filter(f => 
    !f.includes('node_modules') && !f.includes('.next') && !f.includes('/convert-indent.js') && !f.includes('/fix-indent.js')
);

const allFiles = [...new Set([...srcFiles, ...configFiles])];

console.log(`Found ${allFiles.length} files to normalize...`);

let converted = 0;
allFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const newContent = normalizeIndentation(content);
        
        if (newContent !== content) {
            fs.writeFileSync(file, newContent, 'utf8');
            converted++;
            console.log(`Fixed: ${file}`);
        }
    } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
    }
});

console.log(`\nNormalization complete! ${converted} files updated.`);

