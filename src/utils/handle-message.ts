import { Api } from "telegram";
import { currencies } from "../currencies";

const currenciesLookup = currencies.reduce((acc, v) => {
  return acc.set(v, true);
}, new Map());

export function checkIfStickIsCallOrPut(media: Api.MessageMediaDocument) {
  const document = media.document as Api.Document;
  const attributes = document.attributes;
  const isSticker = attributes.find((a) => a.className === 'DocumentAttributeSticker') as Api.DocumentAttributeSticker;

  if (isSticker) {
    if (
      isSticker.alt.includes('👎') ||
      isSticker.alt.includes('🔽') ||
      isSticker.alt.includes('👇')
    ) {
      return 'PUT';
    }

    if (
      isSticker.alt.includes('👍') ||
      isSticker.alt.includes('🔼') ||
      isSticker.alt.includes('👆')
    ) {
      return 'CALL';
    }
  }

  return null;
}

export function createNewSignalMesage(
  { currencyPair, time, hours, signal, channelName }:
  { currencyPair: string, time: string, hours: string, signal: RegExpExecArray | null, channelName: string }
) {
  if (signal && signal.length) {
    const CALL_PUT_SIGNAL = checkIfSignalMessageIsCallOrPut(signal[0]);
    const CALL_PUT_MESSAGE = createTradeSignalMessage(CALL_PUT_SIGNAL);
    const formatedMessage = `⚠ **ATENÇÃO TRADERS!** \n\n 📛 **${channelName}** \n\n 👉 ${currencyPair} \n\n ⏱ ${time} \n\n ${hours.length ? '⏰' + hours+ '\n\n' : ''} ${CALL_PUT_MESSAGE}`;
    return formatedMessage;
  } else {
    const formatedMessage = `⚠ **ATENÇÃO TRADERS!** \n 📛 **${channelName}** \n 👉 ${currencyPair} \n ⏱ ${time} \n 🏁 Aguarde o momento de entrada`;
    return formatedMessage;
  }
}

export function createTradeSignalMessage(signal: 'CALL' | 'PUT') {
  const message = signal === 'CALL' ? '🟢👆 COMPRA' : '🔴👇 VENDA';
  return message;
}

export function extractDataFromMessage(msg: string) {
  const time = /\d\s?m/igm.exec(msg); // select digite followed by the m char
  const currencyPair = /\b[A-Z]{3}(?:\s|\/)[A-Z]{3}\b/g.exec(msg); // select 3 uppercase char followed by space or backslash followed 3 uppercase char  
  const hours = /(?<!-)\d{2}:\d{2}/gm.exec(msg);

  const timeCurrencyPair = {
    currencyPair: '',
    time: '',
    hours: '',
  }

  if (time?.length) {
    const formatedTime = time[0].replace(/\s/, "").split("").join(" ").toUpperCase();
    timeCurrencyPair.time = formatedTime;
  } else {
    const time = /m\s?\d/gi.exec(msg); // M5 M 5
    if (time?.length) {
      const formatedTime = time[0].split('').reverse().join(' ');
      timeCurrencyPair.time = formatedTime;
    }
  }

  if (currencyPair?.length) {
    const pair = currencyPair[0].replace(/\s?\//g, '')
    const isValidCurrencyPair = currenciesLookup.has(pair);
    if(isValidCurrencyPair) {
      const formatedPair = currencyPair[0].replace(/\s/, '/');
      timeCurrencyPair.currencyPair = formatedPair;      
    }
  } else {
    const currencyPair = /\b[A-Z]{6}\b/g.exec(msg);
    if (currencyPair?.length) {
      const isValidCurrencyPair = currenciesLookup.has(currencyPair[0]);
      if (isValidCurrencyPair) {
        timeCurrencyPair.currencyPair = currencyPair[0].replace(/(\w{3})/, '$1/')
      }
    }
  }

  if (hours?.length) {
    // if (timeCurrencyPair.time !== '1 M') {
      timeCurrencyPair.hours = hours[0];
    // }
  }

  return timeCurrencyPair;
}

export function extractDataFromEspecialChannelMessage(msg: string) {
  const time = /m\s?\d/gi.exec(msg); // M5 M 5
  const currencyPair = /\b[A-Z]{6}\b.*/g.exec(msg); // select 3 uppercase char followed by space or backslash followed 3 uppercase char  
  const hours = /(?<!-)\d{2}:\d{2}/gm.exec(msg);
  const result = /resultado/gim.exec(msg);

  const isOTC = (cPair: string) => /otc/gi.test(cPair);
  const formatOTCPair = (otcPair: string) => otcPair.replace(/(-)(OTC)/gi, ' (OTC)')

  const timeCurrencyPair = {
    currencyPair: '',
    time: '',
    hours: '',
  }

  if(result?.length) return timeCurrencyPair;

  if (time?.length) {
    const formatedTime = time[0].split('').reverse().join(' ');
    timeCurrencyPair.time = formatedTime;
  }
  
  if (currencyPair?.length) {   
    
    const currencyPairWithSlash = currencyPair[0].replace(/(\w{3})/, '$1/');
    const finalCurrencyPair = isOTC(currencyPair[0]) ? formatOTCPair(currencyPairWithSlash) : currencyPairWithSlash;
    timeCurrencyPair.currencyPair = finalCurrencyPair;
    
     
  }

  if (hours?.length) {
    timeCurrencyPair.hours = hours[0];
  }

  return timeCurrencyPair;
}

export function checkIfMessageHasSignal(msg: string) {
  let signal = /👎|👍|👇|👆|CALL|PUT|UP|DOWN|COMPRA|VENDA/g.exec(msg); // signals only uppercase
  if(!signal) {
    signal = /👎|👍|👇|👆|CALL|PUT|UP|DOWN|COMPRA|VENDA/gi.exec(msg); // signals uppercase and lowercase
  }
  return signal;
}

export function checkIfSignalMessageIsCallOrPut(msg: string) {
  const callRegex = /👆|👍|CALL|UP|COMPRA/gi.exec(msg);
  if (callRegex?.length) return "CALL";
  return "PUT";
}

export function isSticker(media: Api.TypeMessageMedia | undefined) {
  return media && media.className === 'MessageMediaDocument';
}