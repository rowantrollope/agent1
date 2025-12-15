const fs = require('fs');
const path = require('path');

function detectAndNormalize(content) {
    const lines = content.split('\n');
    
    // First, detect the base indent unit by looking at common indent patterns
    const indentSamples = [];
    for (const line of lines) {
        const match = line.match(/^(\s+)/);
        if (match && match[1]) {
            const indent = match[1];
            const spaceCount = indent.replace(/\t/g, '    ').length;
            if (spaceCount > 0 && spaceCount <= 40) {
                indentSamples.push(spaceCount);
            }
        }
    }
    
    // Find the most common small indent (likely 2, 4, 8, etc.)
    // This will help us determine if the file uses 2-space or 4-space base
    const indentCounts = {};
    indentSamples.forEach(count => {
        // Group by potential base units
        if (count % 4 === 0) indentCounts[4] = (indentCounts[4] || 0) + 1;
        if (count % 2 === 0) indentCounts[2] = (indentCounts[2] || 0) + 1;
    });
    
    // Determine base unit (prefer smaller)
    let baseUnit = 2;
    if (indentCounts[4] && indentCounts[4] > indentCounts[2]) {
        baseUnit = 4;
    }
    
    // Now normalize: convert to indent levels, then to 4-space
    const normalizedLines = [];
    for (const line of lines) {
        const match = line.match(/^(\s*)(.*)$/);
        if (!match) {
            normalizedLines.push(line);
            continue;
        }
        
        const [, leadingWhitespace, rest] = match;
        
        if (!leadingWhitespace) {
            normalizedLines.push(rest);
            continue;
        }
        
        const spaceCount = leadingWhitespace.replace(/\t/g, '    ').length;
        
        // Convert from detected base unit to indent level, then to 4-space
        // If spaceCount is very large (like 48), it might be 8-space indent
        // Try to detect: if divisible by 8, use 8; else if divisible by 4, use 4; else 2
        let indentLevel;
        if (spaceCount % 8 === 0 && spaceCount >= 8) {
            // Likely 8-space base (from over-conversion)
            indentLevel = spaceCount / 8;
        } else if (spaceCount % 4 === 0) {
            // 4-space base
            indentLevel = spaceCount / 4;
        } else if (spaceCount % 2 === 0) {
            // 2-space base
            indentLevel = spaceCount / 2;
        } else {
            // Odd, approximate
            indentLevel = Math.round(spaceCount / 2);
        }
        
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

const srcFiles = walkDir('./src', ['.ts', '.tsx', '.css']);
const configFiles = walkDir('.', ['.ts', '.tsx', '.mjs']).filter(f => 
    !f.includes('node_modules') && !f.includes('.next') && !f.includes('/fix-indent')
);

const allFiles = [...new Set([...srcFiles, ...configFiles])];

console.log(`Found ${allFiles.length} files to normalize...`);

let converted = 0;
allFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const newContent = detectAndNormalize(content);
        
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

