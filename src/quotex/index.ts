import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page, executablePath } from 'puppeteer';
import { TCurrencyPairs } from '../currencies';
import { schedule } from 'node-cron';

puppeteer.use(StealthPlugin());

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function formatDate(hours: string, minutes: string, seconds: string = '00') {
  const opt: Intl.DateTimeFormatOptions = {
    month: "numeric",
    day: "numeric",
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }

  const date = new Date();

  date.setHours(Number(hours));
  date.setMinutes(Number(minutes));
  date.setSeconds(Number(seconds));
  const formater = new Intl.DateTimeFormat('pt', opt);

  return formater.format(date);
}

export type TTimeKeys = keyof typeof TIME_OTC | keyof typeof TIME;
type TTimeOTC = typeof TIME_OTC;
type TTime = typeof TIME;
type TTradeType = 'CALL' | 'PUT';
export type TPendingTimers = keyof typeof PENDING_TIMERS;

const EMAIL = process.env.EMAIL
const PASS = process.env.PASS

const TWO_HOURS = '0 */2 * * *';

export let QuotexPage: Page | null = null;

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

const PENDING_TIMERS = {
  '1 M': 'M1',
  '2 M': 'M2',
  '5 M': 'M5',
  '15 M': 'M15',
  '30 M': 'M30',
  '45 M': 'M45',
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

  const timeInput = await page.evaluate(() => {
    const input = document.querySelector('.section-deal__time input') as HTMLInputElement;
    return input.value.length;
  })


  if (tab?.includes('OTC') && timeInput > 5) {
    await await page.evaluate(() => {
      const switchTimer = document.querySelector('.section-deal__time .input-control__label__switch') as HTMLSpanElement
      switchTimer?.click();
    });
  }

  await page.evaluate((TIME, time) => {
    const minutes = document.querySelector(`div.input-control__dropdown-option:nth-child(${TIME[time]})`) as HTMLDivElement;
    if (minutes) minutes.click();
  }, TIME, time)


  // if (tab?.includes('OTC')) {
  //   await page.evaluate((TIME_OTC, time) => {
  //     const timeOptions = Array.from(document.querySelectorAll('.input-control__dropdown-option'));
  //     const fiveMinutes = timeOptions.find((e) => e.textContent === TIME_OTC[time]) as HTMLDivElement;
  //     fiveMinutes?.click();
  //   }, TIME_OTC, time)
  // } else if (tab) {
  //   await page.evaluate((TIME, time) => {
  //     const minutes = document.querySelector(`div.input-control__dropdown-option:nth-child(${TIME[time]})`) as HTMLDivElement;
  //     if (minutes) minutes.click();
  //   }, TIME, time)
  // }
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
  await page.goto('https://qxbroker.com/pt/sign-in', { waitUntil: 'networkidle0' });
  await page.type("#tab-1 [type='email']", email)
  await page.type("#tab-1 [type='password']", password);
  page.evaluate(() => {
    const btn = document.querySelector('#tab-1 > form > button') as HTMLButtonElement;
    btn?.click()
  });
}

async function selectGrahTime(page: Page, time: string) {
  await sleep(2000)
  await page.evaluate((time) => {
    const defaultTime = document.querySelector('div.trading-chart-settings__item:nth-child(3)') as HTMLDivElement;
    defaultTime.click();
    const allTimeFrames = Array.from(document.querySelectorAll('.popover-select__settings-time-item'));
    const selectedTime = allTimeFrames.find((t) => t.textContent === time) as HTMLDivElement;
    selectedTime?.click()
  }, time)
}

type TTradeParams = {
  currencyPair: TCurrencyPairs,
  time: TTimeKeys,
  amount: number,
  type: TTradeType,
  page: Page,
}

type TTradeParamsPending = {
  currencyPair: TCurrencyPairs,
  time: TPendingTimers,
  amount: number,
  type: TTradeType,
  page: Page,
  pendingTime: string
}

async function authorize(page: Page, num: number) {
  console.log({ num });
  await page.type('.auth__form .form__control [name="code"]', String(num));
  page.evaluate(() => {
    const btn = document.querySelector('.auth__form .auth__submit [type="submit"]') as HTMLButtonElement;
    btn?.click()
  });
}

async function openQuotexPage() {
  const browser = await puppeteer.launch({ headless: false, executablePath: executablePath(), args: ['--no-sandbox', '--disabled-setupid-sandbox'] });
  const page = await browser.newPage();
  QuotexPage = page;

  const previousTab = await browser.pages();
  await previousTab[0].close()

  await login(page, EMAIL!, PASS!);
  await page.waitForNavigation();
  await openTradePage(page);
  await selectGrahTime(page, '5m');  
}

export async function tradeOnQuotex({ page, currencyPair, time, amount, type }: TTradeParams) {
  const selectedAsset = await page.$eval('.tab__label', (e) => e.textContent);

  if (selectedAsset !== currencyPair) {
    await selectAsset(page, currencyPair);
  };

  await selectTime(page, time, TIME_OTC, TIME);
  await setTradeAmount(page, amount);
  await trade(page, type);
  console.log('trade completed sucessfully!');
}

export async function tradeOnQuotexPending({ page, currencyPair, time, amount, pendingTime,  type }: TTradeParamsPending) {
  const selectedAsset = await page.$eval('.tab__label', (e) => e.textContent);

  console.log('trading pending time');

  if (selectedAsset !== currencyPair) {
    await selectAsset(page, currencyPair);
  };

  const [hours, minutes] = pendingTime.split(':');

  await tradePending(page, hours, minutes, time, amount, type);
}

async function selectPendingTime(page: Page, timer: TPendingTimers) {
  await page.evaluate((PENDING_TIMERS, timer) => {
    const allTimers = Array.from(document.querySelectorAll('.form-pending-trade__period-item'));
    const selectedTimer = PENDING_TIMERS[timer];
    const selectedTime = allTimers.find(t => t.textContent === selectedTimer) as HTMLDivElement;
    selectedTime?.click();
  }, PENDING_TIMERS, timer)
}

async function tradePending(page: Page, hours: string, minutes: string, time: TPendingTimers, amount: number, type: TTradeType) {
  await page.click('.section-deal__pending');
  await page.click('div.form-pending-trade__tab:nth-child(2)');
  await page.click('.form-pending-trade .input-control__input', { count: 3 });
  const tradeInputTime = formatDate(hours, minutes);
  await page.type('.form-pending-trade .input-control__input', tradeInputTime);
  await selectPendingTime(page, time);
  await page.click('.form-pending-trade__investment .input-control__input', { count: 3 });
  await page.type('.form-pending-trade__investment .input-control__input', String(amount));
  await page.evaluate((type) => {
    const selector = type === 'CALL' ? '.green' : '.red';
    const tradeBtn = document.querySelector(
      `.form-pending-trade__buttons .form-pending-trade__button${selector}`
    ) as HTMLButtonElement;
    tradeBtn?.click();
  }, type);
  await page.click('.section-deal__pending');
}

async function openTradePage(page: Page | null) {
  if (page) {
    await page.goto('https://qxbroker.com/pt/demo-trade', { waitUntil: 'networkidle0' });
  }
}

async function reloadPage(page: Page | null) {
  if (page) {
    await page.reload();
    console.log(page.url());
    if (page.url().includes('sign-in')) {
      await login(page, EMAIL!, PASS!);
      await page.waitForNavigation();
      await openTradePage(page);
      await selectGrahTime(page, '5m');
    }
  }
}

schedule(TWO_HOURS, async () => {
  await reloadPage(QuotexPage);
  console.log('reload page!');
})

openQuotexPage();