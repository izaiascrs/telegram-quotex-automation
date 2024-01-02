import { TelegramClient, client, Api } from 'telegram';
import { NewMessage } from 'telegram/events';
import { StringSession } from 'telegram/sessions';
import 'dotenv/config';
import {
  listContacts,
  listDialogs,
  initialSetup,
  sendMessagesToDestinationList
} from './utils/helpers';

import {
  checkIfMessageHasSignal,
  checkIfSignalMessageIsCallOrPut,
  checkIfStickIsCallOrPut,
  createNewSignalMesage,
  createTradeSignalMessage,
  extractDataFromEspecialChannelMessage,
  extractDataFromMessage,
  isSticker
} from './utils/handle-message';

import { 
  checkIfMessageIsFromDifferentChannel,
  findChannelById,
  findChannelBySignal,
  isEspecialChannel,
  setChannelWaintingForSignal
} from './utils/channels';

import { type TTimeKeys, tradeOnQuotex, QuotexPage, tradeOnQuotexPending, TPendingTimers } from './quotex';
import { TCurrencyPairs } from './currencies';
import { getAssetId } from './iq-option';
import { addToQueue } from './iq-option/queue';

const SESSION_TOKEN = process.env.SESSION_TOKEN;
const API_HASH = process.env.API_HASH;
const APP_ID = process.env.APP_ID;

const apiId = Number(APP_ID);
const apiHash = API_HASH!;
const stringSession = new StringSession(SESSION_TOKEN);

const TEN_MINUTES = 1000 * 60 * 10;
const MAX_TIME_TO_WATING_FOR_SIGNAL = TEN_MINUTES;
const MY_ID = process.env.MY_ID
const destinationList = [Number(MY_ID)];

let signalTimeout: NodeJS.Timeout | null = null;

function createSignalTimeout() {
  return signalTimeout = setTimeout(() => {
    console.log('reset signal');
    const channelBySignal = findChannelBySignal(true);
    if (channelBySignal) setChannelWaintingForSignal(channelBySignal.id, false);
    clearSignalTimeout();
  }, MAX_TIME_TO_WATING_FOR_SIGNAL);
}

function clearSignalTimeout() {
  console.log('clear timeout');
  if (signalTimeout) clearTimeout(signalTimeout);
  return signalTimeout = null;
}

(async () => {
  const client = new TelegramClient(
    stringSession,
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );
  
  await client.connect();
  await client.getDialogs();
  

  client.addEventHandler(async (event) => {
    const message = {
      chatId: parseInt(String(event.chatId)),
      isChannel: event.isChannel,
      isGroup: event.isGroup,
      isPrivate: event.isPrivate,
      message: event.message.message,
      media: event?.message?.media,
    }

    if (message.isChannel) {

      const channelById = findChannelById(message.chatId);
      const channelBySignal = findChannelBySignal(true);

      if (checkIfMessageIsFromDifferentChannel(channelById, channelBySignal)) return;

      if (channelById) {

        if(isEspecialChannel(message.chatId)) {
          const { currencyPair, hours, time } = extractDataFromEspecialChannelMessage(message.message); 
          const signal = checkIfMessageHasSignal(message.message);
          if (signal?.length) {
            const CALL_PUT_SIGNAL = checkIfSignalMessageIsCallOrPut(signal[0]);
            const assetId = getAssetId(currencyPair);        
            if(assetId) {
              console.log('job added to queue');              
              addToQueue({
                assetId: assetId,
                direction: CALL_PUT_SIGNAL.toLocaleLowerCase() as 'call' | 'put',
                expired: Number(time.split(' ')[0])! as 5 | 1,
                price: 10,
                time: hours.trim(),              
              });
            }
          }

          console.log({ currencyPair, hours, time }); 
          
        }
        // if (message.message && message.message.length < 250) {
        //   if (channelBySignal?.waitingForSignal) {
        //     const signal = checkIfMessageHasSignal(message.message);
        //     if (signal?.length) {
        //       const CALL_PUT_SIGNAL = checkIfSignalMessageIsCallOrPut(signal[0]);
        //       const CALL_PUT_MESSAGE = createTradeSignalMessage(CALL_PUT_SIGNAL);
        //       const messageObj = { message: CALL_PUT_MESSAGE }
        //       await sendMessagesToDestinationList(client, messageObj, destinationList);
        //       setChannelWaintingForSignal(channelById.id, false);
        //       clearSignalTimeout();
        //     }
        //   } else {
        //     const { currencyPair, time, hours } = extractDataFromMessage(message.message);

            

        //     if (currencyPair.length && time.length) {
        //       let signal: RegExpExecArray | null = null;

        //       if (hours.length > 0) {
        //         signal = checkIfMessageHasSignal(message.message);
        //       }

        //       const channelName = channelById.name;
        //       const signalMessage = createNewSignalMesage({ currencyPair, time, hours, signal, channelName });
        //       const messageObj = { message: signalMessage }
              
        //       await sendMessagesToDestinationList(client, messageObj, destinationList);

        //       if (signal === null || hours.length === 0) {
        //         setChannelWaintingForSignal(channelById.id, true);
        //         createSignalTimeout();
        //       }

        //       if(currencyPair.length && time.length && hours.length) {
        //         if(QuotexPage && signal?.length) {
        //           const CALL_PUT_SIGNAL = checkIfSignalMessageIsCallOrPut(signal[0]);                  
        //           await tradeOnQuotexPending({ 
        //             page: QuotexPage,
        //             amount: 5,
        //             currencyPair: currencyPair as TCurrencyPairs,
        //             pendingTime: hours,
        //             time: time as TPendingTimers,
        //             type: CALL_PUT_SIGNAL 
        //           })
        //         }
        //       }
              
        //     }

        //     const signal = checkIfMessageHasSignal(message.message);
        //     if (signal === null || hours.length === 0) {
        //       if (signal?.length && channelById.waitingForSignal) {
        //         const CALL_PUT_SIGNAL = checkIfSignalMessageIsCallOrPut(signal[0]);
        //         const CALL_PUT_MESSAGE = createTradeSignalMessage(CALL_PUT_SIGNAL);
        //         const messageObj = { message: CALL_PUT_MESSAGE }
        //         await sendMessagesToDestinationList(client, messageObj, destinationList);
        //         setChannelWaintingForSignal(channelById.id, false);
        //         clearSignalTimeout();

        //         // if (currencyPair && time && CALL_PUT_SIGNAL && hours.length === 0) {                  
        //         //   if(QuotexPage) {
        //         //     tradeOnQuotex({
        //         //       page: QuotexPage,
        //         //       amount: 10,
        //         //       currencyPair: currencyPair as TCurrencyPairs,
        //         //       time: time as TTimeKeys,
        //         //       type: CALL_PUT_SIGNAL
        //         //     })
        //         //   }
        //         //   console.log({ time, currencyPair, CALL_PUT_SIGNAL });
        //         // }
        //       }
        //     }
        //   }
        // }

        // if (isSticker(message.media)) {
        //   if (channelBySignal?.waitingForSignal) {
        //     const isCallOrPut = checkIfStickIsCallOrPut(message.media as Api.MessageMediaDocument);
        //     if (isCallOrPut) {
        //       const CALL_PUT = createTradeSignalMessage(isCallOrPut);
        //       const messageObj = { message: CALL_PUT }
        //       await sendMessagesToDestinationList(client, messageObj, destinationList);
        //       setChannelWaintingForSignal(channelById.id, false);
        //       clearSignalTimeout();
        //     }
        //   }
        // }

        // console.log(channelById?.waitingForSignal);
        // console.log(signalTimeout);
      }
    }

  }, new NewMessage({}));
})()