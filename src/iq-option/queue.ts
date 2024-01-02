const buyQueue: TAddToQueueParams[] = [];

type TAddToQueueParams = {
  direction: 'call' | 'put',
  expired: 1 | 5,
  price: number,
  time: string,
  assetId: number;
}

export function addToQueue( params: TAddToQueueParams) {
  const { direction, expired, price, time } = params;
  if(direction && expired && price && time) {
    buyQueue.push(params);
  }
}

export function removeFromQueue(time: string) {  
  if(buyQueue.length) {
    const index = buyQueue.findIndex((v) => v.time === time);
    if(index !== -1) {
      buyQueue.splice(index, 1);
    }
  }
}

export function buyQueueFindByTime(time: string) {
  return buyQueue.find((j) => j.time === time);
}

export function listJobsOnQueue() {
  return buyQueue;
}