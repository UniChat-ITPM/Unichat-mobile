import * as Contacts from 'expo-contacts';

/** Load address book in pages (required for large contact lists on some devices). */
export async function loadAllDeviceContacts(): Promise<Contacts.ExistingContact[]> {
  const all: Contacts.ExistingContact[] = [];
  const pageSize = 500;
  let pageOffset = 0;

  for (;;) {
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      pageSize,
      pageOffset,
      sort: Contacts.SortTypes.FirstName,
    });

    all.push(...data);

    if (data.length < pageSize) {
      break;
    }
    pageOffset += pageSize;
  }

  return all;
}
