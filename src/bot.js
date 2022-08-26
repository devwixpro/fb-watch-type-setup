import { chromium, firefox, webkit, devices } from "playwright";
import fse from 'fs-extra'
import fs from 'fs';
import nodeCron from "node-cron";
import bunyan from 'bunyan';

const chrome = devices['Desktop Chrome'];
const log = bunyan.createLogger({
    name: "watch-time-bot", level: 'info', streams: [
        {
            level: 'info',
            path: 'myapp-run.log'         // log INFO and above to stdout
        },
        {
            level: 'error',
            path: 'myapp-error.log'  // log ERROR and above to a file
        }
    ]
});

const generateProfiles = async () => {
    log.info("generating profile directories");
    removeProfiles();
    const dir = "./profiles/";
    const paths = [];
    for (let index = 1; index <= 2; index++) {
        const dirPath = dir.concat(`userDataDir-${index}`);
        const pathExists = await fse.pathExists(dirPath);
        if (!pathExists) {
            fse.removeSync(dirPath);
        }
        await fse.ensureDir(dirPath);
        paths.push(dirPath);
    }
    log.info("profile directories generated");
    return paths;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const readCookies = async () => {
    log.info("reading cookies");
    const cookie_DIR = "./cookies/";
    const cookieDirExits = await fse.pathExists(cookie_DIR);
    if (!cookieDirExits) return;
    const contents = fs.readdirSync(cookie_DIR)
    if (!contents.length) return;
    const cookieJSON = contents.map((content) => {
        const dataObject = JSON.parse(fs.readFileSync(cookie_DIR.concat(content)));
        return dataObject;
    });
    const cookies = cookieJSON.map(cookieConcat => {
        const cookieData = cookieConcat.cookies;
        const cookies = cookieData.map(cookie => {
            const { sameSite, ...rest } = cookie;
            return { ...rest, sameSite: 'Lax' };
        });
        return cookies;
    });
    log.info("cookies read");
    return cookies;
}
const contexts = [];
const pages = [];

async function setup() {
    const profilesPaths = await generateProfiles();
    const pathToExtension = 'D:/7.6.0.0_0';
    const videoUrl =
        "https://findsocialsx.vercel.app/";
    const cookies = await readCookies();
    let index = 0;
    for await (const profileDirPath of profilesPaths) {
        log.info(`setting up profile-${index}`);
        const ctx = await chromium.launchPersistentContext(profileDirPath, {
            ...chrome,
            executablePath: "D:/chrome.exe",
            headless: false,
            javaScriptEnabled: true,
            reducedMotion: "reduce",
            serviceWorkers: "block",
            proxy: {
                server: "207.228.46.58:43814",
                username: "vAP2WXXt23fvbeg",
                password: "UAS4POhrcZEPe0R",
            },
        },
        );
        await ctx.clearCookies();
        await ctx.clearPermissions();
        await ctx.addCookies(cookies.pop());
        const page = await ctx.newPage();
        await page.reload().catch(e=>undefined)
        await page.goto(videoUrl, { waitUntil: "networkidle", timeout: 4000000 });
        await sleep(10000)
        // await page.waitForSelector("input[aria-label='Play video']", { timeout: 40000 });
        const elements = await page.$$("div>div>iframe");
        elements.map(el => { el.click(); })
        await sleep(5 * 1000);
        pages.push(page);
        contexts.push(ctx);
        log.info(`profile-${index} setup complete`);
        index = index + 1;
    }
}

const removeProfiles = async () => {
    log.info("removing profile directories");
    const dir = "./profiles";
    const pathExists = await fse.pathExists(dir);
    if (!pathExists) return;
    if (pathExists) {
        fse.removeSync(dir);
    }
    log.info("profile directories removed");
};

const main = async() => {
    await removeProfiles();
    await setup();
    await sleep(900000);
    let index = 0;
    for await (const page of pages){
        await page.close();
        index = index + 1;
    }
    index=0;
    for await (const context of contexts) {
        log.info(`closing profile-${index + 1}`);
        await context.close();
        index = index + 1;
    }
    await removeProfiles();
}

nodeCron.schedule("*/20 * * * *",async () => {
    log.info("cron job started");
    try {
        await removeProfiles();
        await main();
    } catch (error) {
        log.error(error);
    }
    log.info("cron job finished");
});
