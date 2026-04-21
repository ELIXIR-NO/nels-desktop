import * as keytar from 'keytar'

const SERVICE = 'nels-desktop'

export async function keychainRead(account: string): Promise<string | null> {
  return keytar.getPassword(SERVICE, account)
}

export async function keychainWrite(account: string, value: string): Promise<void> {
  return keytar.setPassword(SERVICE, account, value)
}

export async function keychainDelete(account: string): Promise<void> {
  await keytar.deletePassword(SERVICE, account)
}
