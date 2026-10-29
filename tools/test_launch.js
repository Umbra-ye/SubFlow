const { spawn } = require('child_process');
const path = 'C:\\Users\\74185\\Desktop\\SubFlow\u8BA2\u9605\u6D41\\SubFlow-v1.0-\u4FBF\u643A\u7248\\SubFlow.exe';
const cwd = 'C:\\Users\\74185\\Desktop\\SubFlow\u8BA2\u9605\u6D41\\SubFlow-v1.0-\u4FBF\u643A\u7248';

console.log('Spawning SubFlow.exe...');
const p = spawn(path, [], { cwd, detached: true, stdio: 'ignore' });
p.unref();

console.log('Spawned with PID:', p.pid);
setTimeout(() => {
  const isRunning = process.kill(p.pid, 0);
  console.log('Process running check (PID ' + p.pid + '):', isRunning);
}, 2000);
