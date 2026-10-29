const fs = require('fs');
const vm = require('vm');
const content = fs.readFileSync('web/index.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/i);
if (scriptMatch) {
  const code = scriptMatch[1];
  try {
    new vm.Script(code, {filename: 'index.js'});
    console.log('🎉 100% CLEAN SYNTAX! No syntax errors!');
  } catch(e) {
    console.log('Error at stack:\n', e.stack);
  }
}
