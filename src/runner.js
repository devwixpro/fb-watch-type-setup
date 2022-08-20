import { chromium, firefox, webkit, devices } from "playwright";
import fse from 'fs-extra'
import fs from 'fs';
import nodeCron from "node-cron";
const chrome = devices['Desktop Chrome'];

const generateProfiles = async () => {
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
  return paths;
}

async function init() {
  console.log(1);
  await sleep(1000);
  console.log(2);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const readCookies = async () => {
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
  return cookies;
}
let contexts = [];
let pages = [];

async function setup() {
  const profilesPaths = await generateProfiles();
  const pathToExtension = 'v1 video loop fast speed';
  const videoUrl =
    "https://finezts.com/elementor-11/";
  const cookies = await readCookies();
  profilesPaths.map(async (profileDirPath, index) => {
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
    });
    await ctx.clearCookies();
    await ctx.clearPermissions();
    await ctx.addCookies(cookies[index]);
    const page = await ctx.newPage();
    await page.goto(videoUrl, { waitUntil: "networkidle" });
    // page.waitForSelector("input[aria-label='Play video']", { timeout: 40000 });
    await page.$$eval("input[aria-label='Play video']", (els) => {
      console.log(els.length());
      els.forEach(el => el.click());
    }).catch(() => {
      console.log("error");
    }).then(() => {
      console.log("done");
    });
    await sleep(3000);
    pages.push(page);
    contexts.push(ctx);
  });
}

const removeProfiles = async () => {
  const dir = "./profiles";
  const pathExists = await fse.pathExists(dir);
  if (!pathExists) return;
  if (pathExists) {
    console.log("removing existing profiles");
    await fse.removeSync(dir);
  }
};

let isRan = false;
nodeCron.schedule("*/1 * * * *", async () => {
  console.log("runned");
  removeProfiles();
  try {
    await setup();
    isRan = true;
  } catch (error) {
    console.log(error);
  }
})
nodeCron.schedule("50 */1 * * * *", async () => { 
  console.log(pages, contexts);
  if (isRan) {
      pages.map((page, index) => {
      pages[index].close();
      contexts[index].close();
    });
    pages = [];
    contexts = [];
    removeProfiles();
  }
  isRan = false;
});
