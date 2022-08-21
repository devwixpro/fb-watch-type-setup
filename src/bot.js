import { chromium, firefox, webkit, devices } from "playwright";
import fse from 'fs-extra'
import fs from 'fs';
import nodeCron from "node-cron";
import bunyan from 'bunyan';

const chrome = devices['Desktop Chrome'];
const log = bunyan.createLogger({name: "watch-time-bot", level: 'info', streams: [
    {
      level: 'info',
      path: 'myapp-run.log'         // log INFO and above to stdout
    },
    {
      level: 'error',
      path: 'myapp-error.log'  // log ERROR and above to a file
    }
  ]});

const generateProfiles = async () => {
    log.info("generating profile directories");
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
let contexts = [];
let pages = [];

async function setup() {
    const profilesPaths = await generateProfiles();
    const pathToExtension = 'v1 video loop fast speed';
    const videoUrl =
        "https://finezts.com/elementor-11/";
    // const cookies = await readCookies();
    let index = 1;
    for await (const profileDirPath of profilesPaths) {
        log.info(`setting up profile-${index}`);
        const ctx = await chromium.launchPersistentContext(profileDirPath, {
            ...chrome,
            headless: false,
            chromiumSandbox: true,
            javaScriptEnabled: true,
            reducedMotion: "reduce",
            serviceWorkers: "block",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
            slowMo: 1000,
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`
            ]
        },
        );
        await ctx.clearCookies();
        await ctx.clearPermissions();
        // await ctx.addCookies(cookies[index]);
        const page = await ctx.newPage();
        await page.goto(videoUrl, { waitUntil: "networkidle" , timeout: 600000});
        // // page.waitForSelector("input[aria-label='Play video']", { timeout: 40000 });
        // await page.$$eval("input[aria-label='Play video']", (els) => {
        //   console.log(els.length());
        //   els.forEach(el => el.click());
        // }).catch(() => {
        //   console.log("error");
        // }).then(() => {
        //   console.log("done");
        // });
        await sleep(5* 1000);
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
        await fse.removeSync(dir);
    }
    log.info("profile directories removed");
};

const main = async () => {
    removeProfiles();
    setup();
    await sleep(1 * 60 * 1000);
    let index = 0;
    for await (const context of contexts) {
        log.info(`closing profile-${index+1}`);
        await context.close();
        await pages[index].close();
        await sleep(3000);
        index = index + 1;
    }
}
nodeCron.schedule("*/2 * * * *", async () => {
  log.info("cron job started");
  try {
    await main();
  } catch (error) {
    log.error(error);
  }
  log.info("cron job finished");
})