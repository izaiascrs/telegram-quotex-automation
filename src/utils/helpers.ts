import { Api, TelegramClient } from "telegram";
import input from 'input';

async function listContacts(client: TelegramClient) {
  try {

    const apiContacts = await client.invoke(
      new Api.contacts.GetContacts({})
    ) as unknown as { users: Api.User[]};


    const contacts = apiContacts?.users?.map((user) => ({
      firstName: user.firstName,
      phone: user.phone,
      id: parseInt(String(user.id))
    }));

    return contacts;

  } catch (error) {
    console.log(error);
    return [];
  }
}

async function initialSetup(client: TelegramClient) {
  await client.start({
    phoneNumber: async () => await input.text('Please enter your number: '),
    password: async () => await input.text('Please enter your password: '),
    phoneCode: async () =>
      await input.text('Please enter the code you received: '),
    onError: (err) => console.log(err),
  });
  console.log('You should now be connected.');
  console.log(client.session.save());

}

async function listDialogs(client: TelegramClient) {
  const apiDialogs = await client.getDialogs();

  const dialogs = apiDialogs.map((d) => ({
    type: d?.entity?.className,
    id: d?.entity?.id,
    name: (
      (d.entity?.className === 'Chat' || d?.entity?.className === 'Channel')
      ? d.entity.title
      : (d.entity?.className === 'User') ? d?.entity?.firstName : 'N/A'
      )
  }))

  return dialogs;
}

type TMessage = {
  message: string,
}

async function sendMessagesToDestinationList(client: TelegramClient, messageObj: TMessage, destinationListArray: number[]) {
  const promises = destinationListArray.map((dest) => client.sendMessage(dest, messageObj))
  await Promise.all(promises);
}

export { listContacts, listDialogs, initialSetup, sendMessagesToDestinationList };