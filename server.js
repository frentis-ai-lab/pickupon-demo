import { createApp } from './src/app.js';

const port = Number(process.env.PORT) || 4300;
const host = process.env.HOST || '0.0.0.0';

createApp().listen(port, host, (error) => {
  if (error) throw error;
  console.log(`픽업온 데모 서버: ${host}:${port}`);
  console.log(`  시연 화면   http://localhost:${port}/demo`);
  console.log(`  고객 화면   http://localhost:${port}/`);
  console.log(`  매장 화면   http://localhost:${port}/store`);
  console.log(`  인수조건    http://localhost:${port}/acceptance`);
});
