// 每个主域名可配置「要管理的 Cookie 名字」。
// 存储结构：chrome.storage.local 中 domainConfigs = { [rootDomain]: { cookieNames: string[] } }
// cookieNames 为空 / 无配置时，回退为「管理全部 Cookie」。

const KEY = 'domainConfigs'

export async function getAllConfigs() {
  const data = await chrome.storage.local.get(KEY)
  return data[KEY] ?? {}
}

export async function getDomainConfig(domain) {
  const all = await getAllConfigs()
  return all[domain] ?? null
}

/** 设置某域名要管理的 Cookie 名字；传空数组表示清除配置（回退为全部） */
export async function setCookieNames(domain, names) {
  const all = await getAllConfigs()
  const cleaned = [...new Set((names ?? []).map((n) => n.trim()).filter(Boolean))]
  if (cleaned.length === 0) {
    delete all[domain]
  } else {
    all[domain] = { cookieNames: cleaned }
  }
  await chrome.storage.local.set({ [KEY]: all })
  return cleaned
}
