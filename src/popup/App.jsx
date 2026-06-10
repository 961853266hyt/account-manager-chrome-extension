import { useCallback, useEffect, useRef, useState } from 'react'
import { getActiveTabDomain } from '../lib/domain'
import { getDomainCookies, applyAccount } from '../lib/cookies'
import { getDomainConfig } from '../lib/domain-config'
import {
  getAccountsForDomain,
  saveAccount,
  updateAccountCookies,
  renameAccount,
  deleteAccount,
  exportAccounts,
  importAccounts,
} from '../lib/storage'
import CookieSettings from './CookieSettings'

export default function App() {
  const [tab, setTab] = useState(null)
  const [domain, setDomain] = useState(null)
  const [config, setConfig] = useState(null) // { cookieNames } | null
  const [accounts, setAccounts] = useState([])
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'ok' | 'error', text }
  const fileInputRef = useRef(null)

  const refresh = useCallback(async (d) => {
    setAccounts(await getAccountsForDomain(d))
  }, [])

  useEffect(() => {
    ;(async () => {
      const { tab, domain } = await getActiveTabDomain()
      setTab(tab)
      setDomain(domain)
      if (domain) {
        setConfig(await getDomainConfig(domain))
        await refresh(domain)
      }
    })()
  }, [refresh])

  function notify(type, text) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 2800)
  }

  async function run(fn) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      notify('error', e?.message ?? '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const patterns = config?.cookieNames

  const handleSave = () =>
    run(async () => {
      const name = newName.trim()
      if (!name) {
        notify('error', '请先输入账号备注名')
        return
      }
      const cookies = await getDomainCookies(domain, patterns)
      if (cookies.length === 0) {
        notify('error', patterns?.length ? '没匹配到要管理的 Cookie，检查⚙设置或是否已登录' : '当前域名下没有 Cookie，可能尚未登录')
        return
      }
      await saveAccount(domain, name, cookies)
      setNewName('')
      await refresh(domain)
      notify('ok', `已保存「${name}」（${cookies.length} 条 Cookie）`)
    })

  const handleSwitch = (account) =>
    run(async () => {
      const failed = await applyAccount(domain, account.cookies, patterns)
      await refresh(domain)
      if (tab?.id) await chrome.tabs.reload(tab.id)
      notify('ok', failed > 0 ? `已切换，但 ${failed} 条 Cookie 写入失败` : `已切换到「${account.name}」`)
    })

  const handleUpdate = (account) =>
    run(async () => {
      const cookies = await getDomainCookies(domain, patterns)
      await updateAccountCookies(domain, account.id, cookies)
      await refresh(domain)
      notify('ok', `已用当前登录态覆盖「${account.name}」（${cookies.length} 条）`)
    })

  const handleRename = (account) =>
    run(async () => {
      const name = prompt('新的备注名：', account.name)?.trim()
      if (!name || name === account.name) return
      await renameAccount(domain, account.id, name)
      await refresh(domain)
    })

  const handleDelete = (account) =>
    run(async () => {
      if (!confirm(`确定删除「${account.name}」吗？`)) return
      await deleteAccount(domain, account.id)
      await refresh(domain)
      notify('ok', '已删除')
    })

  const handleExport = (onlyCurrent) =>
    run(async () => {
      const json = await exportAccounts(onlyCurrent ? domain : null)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = onlyCurrent
        ? `accounts-${domain}-${Date.now()}.json`
        : `accounts-all-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      notify('ok', '已导出 JSON 文件')
    })

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    run(async () => {
      const text = await file.text()
      const count = await importAccounts(text)
      if (domain) await refresh(domain)
      notify('ok', `成功导入 ${count} 个账号`)
    })
  }

  if (domain === null) {
    return (
      <div className="app">
        <header className="header">
          <h1>账号切换助手</h1>
        </header>
        <p className="empty">当前页面不支持（仅支持 http/https 网页）。</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>账号切换助手</h1>
        <div className="header-right">
          <span className="domain" title={domain}>{domain}</span>
          <button
            className="icon-btn"
            title="设置要管理的 Cookie"
            onClick={() => setShowSettings((s) => !s)}
          >
            ⚙
          </button>
        </div>
      </header>

      {showSettings ? (
        <CookieSettings
          domain={domain}
          config={config}
          onClose={() => setShowSettings(false)}
          onSaved={(names) => {
            setConfig(names.length ? { cookieNames: names } : null)
            setShowSettings(false)
            notify('ok', names.length ? `已设置管理 ${names.length} 个 Cookie` : '已设为管理全部 Cookie')
          }}
        />
      ) : (
        <>
          {patterns?.length ? (
            <div className="config-bar">
              管理 {patterns.length} 个 Cookie：
              <span className="config-names" title={patterns.join(', ')}>{patterns.join(', ')}</span>
            </div>
          ) : (
            <div className="config-bar warn">
              未设置，当前保存<b>全部</b> Cookie。建议点 ⚙ 只选登录相关的。
            </div>
          )}

          <div className="save-row">
            <input
              type="text"
              placeholder="备注名，如：工作号"
              value={newName}
              maxLength={30}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              disabled={busy}
            />
            <button className="primary" onClick={handleSave} disabled={busy}>
              保存当前账号
            </button>
          </div>

          {accounts.length === 0 ? (
            <p className="empty">
              还没有保存过 <b>{domain}</b> 的账号。
              <br />
              先在网页上登录，再点上方「保存当前账号」。
            </p>
          ) : (
            <ul className="list">
              {accounts.map((acc) => (
                <li key={acc.id} className="item">
                  <div className="item-info">
                    <span className="item-name" title={acc.name}>{acc.name}</span>
                    <span className="item-meta">
                      {acc.cookies.length} 条 Cookie · {new Date(acc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="item-actions">
                    <button className="primary" onClick={() => handleSwitch(acc)} disabled={busy} title="切换到该账号">
                      切换
                    </button>
                    <button onClick={() => handleUpdate(acc)} disabled={busy} title="用当前登录态覆盖此账号">
                      更新
                    </button>
                    <button onClick={() => handleRename(acc)} disabled={busy}>
                      改名
                    </button>
                    <button className="danger" onClick={() => handleDelete(acc)} disabled={busy}>
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <footer className="footer">
            <button onClick={() => handleExport(true)} disabled={busy || accounts.length === 0}>
              导出本站
            </button>
            <button onClick={() => handleExport(false)} disabled={busy}>
              导出全部
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={busy}>
              导入 JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleImportFile}
            />
          </footer>

          <p className="warning">⚠ 导出文件包含登录凭证，请勿分享给不信任的人。</p>
        </>
      )}

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}
    </div>
  )
}
