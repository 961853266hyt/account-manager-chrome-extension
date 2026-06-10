import { getRootDomain } from './domain'

// 作用域 = 一个域名通配符模式（pattern），既作账号分组 key，也决定抓哪些 Cookie。
//   example.com          整站，含所有子域名（无 * 时也覆盖子域名）
//   www-d.example.com    仅该主机（区分测试/正式）
//   *.example.com        所有子域名
//   *-d.example.com      所有以 -d 结尾的测试子域名

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 通配符匹配主机名：* 匹配任意字符；无 * 的模式同时覆盖其子域名 */
export function matchHost(pattern, host) {
  if (!pattern || !host) return false
  const p = pattern.toLowerCase()
  const h = host.toLowerCase()
  const re = new RegExp('^' + p.split('*').map(escapeRe).join('.*') + '$')
  if (re.test(h)) return true
  if (!p.includes('*') && h.endsWith('.' + p)) return true
  return false
}

/** 从模式推出用于 chrome.cookies.getAll 的具体域名（取注册域 eTLD+1，足够宽，之后再按模式过滤） */
export function queryDomain(pattern) {
  return getRootDomain(pattern.replace(/\*/g, ''))
}

/** 某 cookie 是否落在该作用域内 */
export function cookieInScope(pattern, cookie) {
  const cookieHost = cookie.domain.replace(/^\./, '').toLowerCase()
  if (matchHost(pattern, cookieHost)) return true
  // 设在父域上的 cookie（如 .example.com）覆盖该模式下的主机时也算
  if (!cookie.hostOnly) {
    const literal = pattern.replace(/^\*\./, '').replace(/\*/g, '').toLowerCase()
    if (literal === cookieHost || literal.endsWith('.' + cookieHost)) return true
  }
  return false
}

/** 在已有模式中挑选与 host 最匹配（最具体）的一个，没有则返回 null */
export function bestMatch(patterns, host) {
  const matches = patterns.filter((p) => matchHost(p, host))
  matches.sort((a, b) => {
    const wa = a.includes('*') ? 1 : 0
    const wb = b.includes('*') ? 1 : 0
    if (wa !== wb) return wa - wb // 无通配优先
    return b.replace(/\*/g, '').length - a.replace(/\*/g, '').length // 字面更长更具体
  })
  return matches[0] ?? null
}
