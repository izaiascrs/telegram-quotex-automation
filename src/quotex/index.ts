import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page, Protocol, executablePath } from 'puppeteer';
import { cookies } from '../cookies';
import { TCurrencyPairs } from '../currencies';

puppeteer.use(StealthPlugin());

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export type TTimeKeys = keyof typeof TIME_OTC | keyof typeof TIME;
type TTimeOTC = typeof TIME_OTC;
type TTime = typeof TIME;
type TTradeType = 'CALL' | 'PUT';

const TIME_OTC = {
  '1 M': '01:00',
  '2 M': '02:00',
  '5 M': '05:00',
  '10 M': '10:00',
  '15 M': '15:00',
  '30 M': '30:00',
}

const TIME = {
  '1 M': 1,
  '2 M': 2,
  '5 M': 5,
  '10 M': 6,
  '15 M': 7,
  '30 M': 8,
}

async function trade(page: Page, type: TTradeType) {
  await page.evaluate((type) => {
    const selector = type === 'CALL' ? '.call-btn' : '.put-btn';
    const tradeBtn = document.querySelector(selector) as HTMLButtonElement;
    tradeBtn?.click();
  }, type)
}

async function selectAsset(page: Page, asset: TCurrencyPairs) {
  await page.click('.asset-select__button');
  await page.type('.asset-select__search-input', asset);
  await page.click('.assets-table__name ');
}

async function selectTime(page: Page, time: TTimeKeys, TIME_OTC: TTimeOTC, TIME: TTime) {
  const tab = await page.evaluate(() => {
    return document.querySelector('#tab-active .tab__label')?.textContent;
  })

  if (tab?.includes('OTC')) {
    await page.evaluate((TIME_OTC, time) => {
      const timeOptions = Array.from(document.querySelectorAll('.input-control__dropdown-option'));
      const fiveMinutes = timeOptions.find((e) => e.textContent === TIME_OTC[time]) as HTMLDivElement;
      fiveMinutes?.click();
    }, TIME_OTC, time)
  } else if (tab) {
    await page.evaluate((TIME, time) => {
      const minutes = document.querySelector(`div.input-control__dropdown-option:nth-child(${TIME[time]})`) as HTMLDivElement;
      if (minutes) minutes.click();
    }, TIME, time)
  }
}

async function setTradeAmount(page: Page, amount: number) {
  await page.click(".section-deal__investment .input-control__input", { clickCount: 3 })
  await page.type('.section-deal__investment .input-control__input', String(Math.floor(amount)));
}

async function getBalance(page: Page) {
  const balance = await page.evaluate(() => {
    return document.querySelector('.usermenu__info-balance')?.textContent;
  });
  return balance;
}

async function login(page: Page, email: string, password: string) {
  await page.goto('https://qxbroker.com/pt/sign-in', { timeout: 0 });
  await page.type("#tab-1 [type='email']", email)
  await page.type("#tab-1 [type='password']", password);
  page.evaluate(() => {
    const btn = document.querySelector('#tab-1 > form > button') as HTMLButtonElement;
    btn?.click()
  });
}

type TTradeParams = {
  currencyPair: TCurrencyPairs,
  time: TTimeKeys,
  amount: number,
  type: TTradeType
}

export async function tradeOnQuotex({ currencyPair, time, amount, type }: TTradeParams) {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: executablePath() });
  const page = await browser.newPage();
  await page.setCookie(...cookies);

  await page.goto('https://qxbroker.com/pt/demo-trade', { waitUntil: 'networkidle0' });
  page.setDefaultNavigationTimeout(0);

  await selectAsset(page, currencyPair);
  await selectTime(page, time, TIME_OTC, TIME);
  await setTradeAmount(page, amount);
  await trade(page, type);
  await browser.close();
  console.log('trade completed browser closed');
}
