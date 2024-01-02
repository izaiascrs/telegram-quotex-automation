import { schedule } from 'node-cron';
import Broker from 'iqoption';
import { buyQueueFindByTime, listJobsOnQueue, removeFromQueue } from './queue';

type TBalance = {
  id: number,
  user_id: number,
  type: number,
  amount: number,
  enrolled_amount: number,
  enrolled_sum_amount: number,
  hold_amount: number,
  orders_amount: number,
  currency: string,
  tournament_id: number | null,
  tournament_name: string | null,
  is_fiat: boolean,
  is_marginal: boolean,
  has_deposits: boolean,
  auth_amount: number,
  equivalent: number
}

type TAssets = {
  active_id: number,
  name: string,
  ticker: string,
}

type TClient = {
  balances: [],
  client_category_id: number,
  country_id: number,
  flag: string,
  img_url: string,
  is_demo_account: boolean,
  is_vip: boolean,
  vip_badge: boolean,
  isSuccessful: boolean,
  registration_time: number,
  selected_asset_id: number,
  selected_balance_type: number,
  selected_option_type: number,
  user_id: number,
  user_name: string,
  status: string,
  gender: string
}

type TProfile = {
  account_status: string,
  address: string,
  auth_two_factor: boolean | null,
  avatar: string,
  balance: number,
  balance_id: number,
  balance_type: number,
  balances: [],
  birthdate: boolean,
  bonus_total_wager: number,
  bonus_wager: number,
  cashback_level_info: { enabled: boolean },
  city: string,
  client_category_id: number,
  company_id: number,
  confirmation_required: number,
  confirmed_phones: [],
  country_id: number,
  created: number,
  currency: string,
  currency_char: string,
  currency_id: number,
  demo: number,
  deposit_count: number,
  deposit_in_one_click: boolean,
  email: string,
  finance_state: string,
  first_name: string,
  flag: string,
  forget_status: { status: string, created: null, expires: null },
  functions: [],
  gender: string,
  group_id: number,
  id: number,
  infeed: number,
  is_activated: boolean,
  is_islamic: boolean,
  is_vip_group: boolean,
  kyc: {
    status: 1,
    isPhoneFilled: boolean,
    isPhoneNeeded: boolean,
    isProfileFilled: boolean,
    isProfileNeeded: boolean,
    isRegulatedUser: boolean,
    daysLeftToVerify: number,
    isPhoneConfirmed: boolean,
    isDocumentsNeeded: boolean,
    isDocumentsApproved: boolean,
    isDocumentsDeclined: boolean,
    isDocumentsUploaded: boolean,
    isDocumentPoaUploaded: boolean,
    isDocumentPoiUploaded: boolean,
    isDocumentsUploadSkipped: boolean,
    isPhoneConfirmationSkipped: boolean
  },
  kyc_confirmed: boolean,
  last_name: string,
  last_visit: boolean,
  locale: string,
  mask: string,
  messages: number,
  money: { deposit: { min: number, max: number }, withdraw: { min: number, max: number } },
  name: string,
  nationality: string,
  need_phone_confirmation: null,
  new_email: string,
  nickname: string,
  personal_data_policy: {
    is_call_accepted: { status: boolean },
    is_push_accepted: { status: boolean },
    is_email_accepted: { status: boolean },
    is_agreement_accepted: { status: boolean },
    is_thirdparty_accepted: { status: boolean }
  },
  phone: string,
  popup: [],
  postal_index: string,
  public: number,
  rate_in_one_click: boolean,
  site_id: number,
  skey: string,
  socials: {},
  ssid: boolean,
  tc: boolean,
  timediff: number,
  tin: string,
  tournaments_ids: null,
  trade_restricted: boolean,
  trial: boolean,
  tz: string,
  tz_offset: number,
  user_circle: null,
  user_group: string,
  user_id: number,
  welcome_splash: number
}

type TBuyParams = {
  user_balance_id: number
  active_id: number, // is EUR/USD OTC, 816 Bitcoin, etc
  option_type_id: number, // is turbo-option, means expiration is less than five mins
  direction: 'call' | 'put', // or 'put'
  expired: 1 | 2 | 3 | 4 | 5, // range 1-5 if it's turbo-option
  price: number
  returnMessage: boolean,
}

type TBuyResponse = {
  user_id: number,
  id: number,
  refund_value: number,
  price: number,
  exp: number,
  created: number,
  created_millisecond: number,
  time_rate: number,
  type: string,
  act: number,
  direction: string,
  exp_value: number,
  value: number,
  profit_income: number,
  profit_return: number,
  robot_id: number | null,
  client_platform_id: number
  message?: string
}

type TBroker = {
  connect: () => Promise<void>;
  profile: TProfile,
  client: TClient,
  balances: TBalance[],
  send: (msg: string, params: TBuyParams) => Promise<TBuyResponse>
  on: (msg: string, cb: (data: any) => void) => void;
}

const broker: TBroker = new Broker({
  ssid: process.env.SSID
})

let practiceBalanceId: number | undefined = undefined;

let lossCount = 0;
let totalLoss = 0;

export async function loginToIQoption() {

  await broker.connect();

  console.log('user logged successfully');
  

  const {
    user_id,
    balance_id
  } = broker.profile;
  
  const balances = broker.balances;

  practiceBalanceId = balances.find(b => b.type === 4)?.id; 

  broker.on('position-changed', function (data) {
    const { 
      option_type_id,
      active_id,
      direction,
      result,
      amount,
      profit_percent
    } = data.raw_event.binary_options_option_changed1;

    
    console.log({ option_type_id, active_id, direction, result, amount, profit_percent });

    if(result === 'win' || lossCount > 1) {
      lossCount = 0;  
      totalLoss = 0;
      return; 
    }     
    
    
    if(result === 'loose' && lossCount <= 1) {        
      lossCount++;
      // totalLoss+= amount;
      const profit = profit_percent / 100;
      const newAmount = calculateMartingale(amount, profit);
      console.log({ newAmount, profit });
      
      if (practiceBalanceId) {
        buyOnIQoption({
          broker,
          active_id,
          direction,
          expired: 1,
          price: newAmount,
          user_balance_id: practiceBalanceId
        });  
      }
    }
 
    
  })

}

export function getAssetId(assetName: string) {
  const assets: TAssets[] = Broker.assets();
  const assetID = assets.find((asset) => asset.name === assetName)?.active_id;
  return assetID;
}

type TBuyOnIQoptionsParams = {
  broker: TBroker;
  user_balance_id: number;
  active_id: number;
  direction: 'call' | 'put';
  expired: 1 | 2 | 3 | 4 | 5;
  price: number;
}

async function buyOnIQoption(params: TBuyOnIQoptionsParams) {
  const {
    active_id,
    direction,
    expired,
    price,
    user_balance_id,
    broker
  } = params;

  try {
    console.log('trying to buy...');

    const option = await broker.send('binary-options.open-option', {
      user_balance_id,
      active_id,
      option_type_id: 3, // is turbo-option, means expiration is less than five mins
      direction, // or 'put'
      expired, // range 1-5 if it's turbo-option
      price, // amount to invest
      returnMessage: true,
    });

    if (option.message) {
      console.log(option.message);
    } else {
      console.log('buy successfuly!');
    }

    // console.log(option)

  } catch (error) {
    console.log(error);

  }

}

function calculateMartingale(totalLoss: number, payout: number = 1.8) {
  // return +(totalLoss / (payout - 1)).toFixed(2);
  return +(totalLoss * payout).toFixed(2);
}

loginToIQoption();

schedule('0 */1 * * * *', async () => {
  const formatedTime = Intl.DateTimeFormat('pt-br', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const date = new Date(new Date().toLocaleString('en', { timeZone: 'America/Sao_Paulo'}));
  const currentTime = formatedTime.format(date);
  const currentJob = buyQueueFindByTime(currentTime);
  const jobsList = listJobsOnQueue(); 
  
  console.log('running every minute', currentTime);
  console.log({ jobsList }); 
  

  if (currentJob) {
    if (practiceBalanceId) {
      buyOnIQoption({
        broker,
        active_id: currentJob.assetId,
        direction: currentJob.direction,
        expired: currentJob.expired,
        price: currentJob.price,
        user_balance_id: practiceBalanceId
      });

      removeFromQueue(currentJob.time);
    }

  }

}, { timezone: 'America/Sao_Paulo' })