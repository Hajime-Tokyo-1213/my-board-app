const webpush = require('web-push');

// VAPIDキーを生成
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys Generated:');
console.log('===================');
console.log('\nAdd these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n===================');
console.log('\nPublic Key (for client):');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key (for server - keep secret!):');
console.log(vapidKeys.privateKey);