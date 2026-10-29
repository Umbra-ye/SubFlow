const fs = require('fs');
const content = fs.readFileSync('web/index.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/i);
if (scriptMatch) {
  const code = scriptMatch[1];
  const lines = code.split('\n');
  const stack = [];
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    // Simple state machine skipping strings & comments
    let inStr = false;
    let strChar = '';
    let inLineComment = false;
    
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const prev = col > 0 ? line[col-1] : '';
      
      if (inLineComment) break;
      if (inStr) {
        if (ch === strChar && prev !== '\\') {
          inStr = false;
        }
        continue;
      }
      
      if (ch === '/' && line[col+1] === '/') {
        inLineComment = true;
        break;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        inStr = true;
        strChar = ch;
        continue;
      }
      
      if (ch === '{' || ch === '(' || ch === '[') {
        stack.push({ char: ch, line: lineIdx + 1, col: col + 1, text: line.trim() });
      } else if (ch === '}' || ch === ')' || ch === ']') {
        const expected = ch === '}' ? '{' : ch === ')' ? '(' : '[';
        if (stack.length === 0) {
          console.log(`Unmatched closing ${ch} at line ${lineIdx + 1}:${col + 1}`);
        } else {
          const top = stack.pop();
          if (top.char !== expected) {
            console.log(`Mismatched bracket at line ${lineIdx + 1}: found ${ch}, expected matching for ${top.char} from line ${top.line}`);
          }
        }
      }
    }
  }
  
  console.log('Remaining unclosed brackets count:', stack.length);
  stack.forEach(item => {
    console.log(`Unclosed ${item.char} opened at line ${item.line}: ${item.text}`);
  });
}
