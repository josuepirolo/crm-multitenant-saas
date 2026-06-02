import { ContactsClient } from "./contacts-client";
import { getContactsPageContext } from "./actions";

export default async function ContactsPage() {
  const { role, members, userId } = await getContactsPageContext();
  return (
    <ContactsClient
      initialRole={role ?? null}
      initialMembers={members}
      currentUserId={userId ?? ""}
    />
  );
}
