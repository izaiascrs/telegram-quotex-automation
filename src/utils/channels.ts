type TchannelInfo = {
  id: number;
  name: string;
  waitingForSignal: boolean;
  type: string;
};

const channelsInfo: TchannelInfo[] = [
  {
    id: -1002137003427,
    name: 'Canal teste',
    waitingForSignal: false,
    type: 'Channel'
  },
  {
    id: -1002039318892,
    name: 'canal teste 2',
    waitingForSignal: false,
    type: 'Channel',
  },
  // {
  //   id: -1002138548602,
  //   name: 'Teste bot',
  //   waitingForSignal: false,
  //   type: 'Channel'
  // },
  // {
  //   type: 'Channel',
  //   id: -1002011222704,
  //   name: 'Teste Bot 2',
  //   waitingForSignal: false,
  // },

  //************ official channels watch list ************//
  {
    type: 'Channel',
    id:  -1001625871874,
    name: 'SinaisOB - M1',
    waitingForSignal: false,
  },
  {
    type: 'Channel',
    id: -1001630460062,
    name: 'SinaisOB - M5',
    waitingForSignal: false,
  },
  // {
  //   type: 'Channel',
  //   id: -1001941369397,
  //   name: '💰VIVA DE RENDA SINAIS OFICIAL 💰',
  //   waitingForSignal: false,
  // },
  // {
  //   type: 'Channel',
  //   id: -1001744454246,
  //   name: '💰SINAIS TRADER MÁGICO💰',
  //   waitingForSignal: false,
  // },
  // {
  //   type: 'Channel',
  //   id:  -1001296434684,
  //   name: 'Olymp Trade Quotex Signals',
  //   waitingForSignal: false,
  // },
  // {
  //   type: 'Channel',
  //   id: -1001695472706,
  //   name: 'MOQ|Master Of Quotex',
  //   waitingForSignal: false,
  // },
  // {
  //   type: 'Channel',
  //   id:  -1001194604848,
  //   name: '🏳 CONSYSTE TRADERS 🏴'      ,
  //   waitingForSignal: false,
  // },
  // {
  //   type: 'Channel',
  //   id:  -1001786822830,
  //   name: 'Canal Oficial | MOHAMED ®'  ,
  //   waitingForSignal: false,
  // },  
  // {
  //   type: 'Channel',
  //   id:  -1001618524236,
  //   name: 'BULLISH QUEEN 🎯',
  //   waitingForSignal: false,
  // }, 
  // {
  //   type: 'Channel',
  //   id:  -1001942617161,
  //   name: 'MASHALLAH TRADER🌹',
  //   waitingForSignal: false,
  // },
  // {
  //   type: 'Channel',
  //   id:  -1001724386836,
  //   name: 'Technical Hitesh',
  //   waitingForSignal: false,
  // },
  // {
  //   type: 'Channel',
  //   id: -1001785019775,
  //   name: 'QUOTEX BUG SIGNALS 🤯🚀',
  //   waitingForSignal: false,
  // },
  // {
  //   type: 'Channel',
  //   id: -1001504485479,
  //   name: 'CONSYSTE 1 GALE (FREE)',
  //   waitingForSignal: false,
  // },
];

export function findChannelById(id: number) {
  return channelsInfo.find(c => c.id === id);
}

export function findChannelBySignal(waiting: boolean) {
  return channelsInfo.find(c => c.waitingForSignal === waiting);
}

export function checkIfMessageIsFromDifferentChannel(
  channelA: TchannelInfo | undefined,
  channelB: TchannelInfo | undefined
) {
  if(channelA && channelB && channelA.id !== channelB.id) return true; 
  return false;
}

export function setChannelWaintingForSignal(id: number, waiting: boolean) {
  const channel = channelsInfo.find((c) => c.id === id);
  if(channel) channel.waitingForSignal = waiting;
}

export function isEspecialChannel(id: number) {
  const especialChannelsIds = [ -1001625871874 ]; // -1002137003427 || -1001630460062
  return especialChannelsIds.find(c => c === id);
}