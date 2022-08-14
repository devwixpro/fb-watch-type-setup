import { chromium, firefox, webkit } from "playwright";
import fse from 'fs-extra'
import fs from 'fs';
import nodeCron from "node-cron";

const generateProfiles = async () => {
  const dir = "./profiles/";
  const paths = [];
  for (let index = 1; index <= 2; index++) {
    const dirPath = dir.concat(`userDataDir-${index}`);
    const pathExists = await fse.pathExists(dirPath);
    if (!pathExists) {
      fse.remove(dirPath);
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

async function setup() {
  const profilesPaths = await generateProfiles();
  const videoUrl =
    "https://findsocialsx.vercel.app";
  const contexts = [];
  const pages = [];
  const cookies = await readCookies();
  profilesPaths.map(async (profileDirPath, index) => {
    const ctx = await firefox.launchPersistentContext(profileDirPath, {
      headless: false,
    });
    ctx.clearCookies();
    ctx.clearPermissions();
    ctx.addCookies(cookies[index]);
    const page = await ctx.newPage();
    await page.goto(videoUrl, { waitUntil: "load" });
    page.waitForSelector(`//*[iframe]`);
    const arrayOfLocators = await page.locator('//*[iframe]');
    const elementCount = await arrayOfLocators.count();
    for (let i = 0; i < elementCount; i++) {
      await arrayOfLocators.nth(i).click();
    }
    await sleep(3000);
    pages.push(page);
    contexts.push(ctx);
  });
  return [pages, contexts];
}
let pages, contexts;
let isRan = false;
nodeCron.schedule("40 */20 * * * *", async () => {
  console.log("runned");
  try {
    [pages, contexts] = await setup();
    isRan = true;
  } catch (error) {
    console.log(error);
  }
})

nodeCron.schedule("*/20 * * * *", async () => { 
  if (!(pages?.length || contexts?.length)) {
    return;
  }
  if (isRan) {
    pages.map((page, index) => {
      page.close();
      contexts[index].close();
    });
    pages = null;
    contexts = null;
  }
  isRan = false;
});