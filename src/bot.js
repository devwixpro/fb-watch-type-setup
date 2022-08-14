// const playwright = require('playwright');
// const { devices } = require('playwright');
// const Chrome = devices['Desktop Chrome'];

// const botRunner = async () => {
//     let cookie = require('../m.facebook.com_13-08-2022.json');
//     const browser = await playwright['chromium'].launch({ headless: false });
//     const context = await browser.browserType().launchPersistentContext(
//         userDataDir="../userDataDir",
//         options = {
//             baseURL: 'https://m.facebook.com',
//              args: ['--lang=en-GB'],
//             storageState: 'm.facebook.com_13-08-2022.json'
//         });
//     const cookies = cookie.cookies.map(c => {
//         const { sameSite, ...rest } = c;
//         return { ...rest, sameSite: 'Lax' };
//     });
//     context.addCookies(cookies);
//     const page = await context.newPage();
//     await page.goto('https://m.facebook.com/');
//     await page.waitForSelector('#email');
//     // await browser.close();
// }
// // for (let i = 0; i < 10; i++) {
// //     botRunner();
// // }
// async(await botRunner());
// // let cookie = require('../m.facebook.com_13-08-2022.json');
// // console.log(typeof cookie);
// // console.log(cookie.length);
// // console.log(cookie)

