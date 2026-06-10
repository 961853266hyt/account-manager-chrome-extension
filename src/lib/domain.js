// 常见的多段后缀，用于近似计算 eTLD+1（主域名）
const MULTI_PART_SUFFIXES = new Set([
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp',
  'com.hk', 'com.tw', 'org.tw',
  'com.au', 'net.au', 'org.au',
  'co.kr', 'or.kr',
  'com.br', 'com.mx', 'co.in', 'co.nz', 'com.sg', 'com.my',
])

const IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/

/**
 * 取主域名（eTLD+1）。
 * mail.google.com -> google.com；a.b.example.com.cn -> example.com.cn
 * IP / localhost 原样返回。
 */
export function getRootDomain(hostname) {
  if (!hostname) return ''
  if (IP_RE.test(hostname) || !hostname.includes('.')) return hostname

  const parts = hostname.split('.')
  if (parts.length <= 2) return hostname

  const lastTwo = parts.slice(-2).join('.')
  if (MULTI_PART_SUFFIXES.has(lastTwo)) {
    return parts.slice(-3).join('.')
  }
  return lastTwo
}

/** 从当前激活标签页拿到主域名，不支持的页面（chrome:// 等）返回 null */
export async function getActiveTabDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url) return { tab: tab ?? null, domain: null }
  let url
  try {
    url = new URL(tab.url)
  } catch {
    return { tab, domain: null }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { tab, domain: null }
  }
  return { tab, domain: getRootDomain(url.hostname) }
}
