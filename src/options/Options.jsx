import { useCallback, useEffect, useRef, useState } from 'react'
import { listScopes, renameScope, deleteScope } from '../lib/scopes'
import { setCookieNames } from '../lib/domain-config'
import { applyAccount } from '../lib/cookies'
import {
  renameAccount,
  deleteAccount,
  exportAccounts,
  importAccounts,
} from '../lib/storage'

export default function Options() {
  const [scopes, setScopes] = useState([])
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)

  const reload = useCallback(async () => {
    setScopes(await listScopes())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

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

  const onRenamePattern = (pattern) =>
    run(async () => {
      const next = prompt('新的域名通配模式：', pattern)?.trim()
      if (!next || next === pattern) return
      await renameScope(pattern, next)
      await reload()
      notify('ok', `作用域已改为 ${next}`)
    })

  const onDeleteScope = (pattern) =>
    run(async () => {
      if (!confirm(`删除作用域「${pattern}」及其下全部账号？此操作不可撤销。`)) return
      await deleteScope(pattern)
      await reload()
      notify('ok', '已删除作用域')
    })

  const onAddCookieName = (scope, name) =>
    run(async () => {
      const v = name.trim()
      if (!v || scope.cookieNames.includes(v)) return
      await setCookieNames(scope.pattern, [...scope.cookieNames, v])
      await reload()
    })

  const onRemoveCookieName = (scope, name) =>
    run(async () => {
      await setCookieNames(
        scope.pattern,
        scope.cookieNames.filter((n) => n !== name),
      )
      await reload()
    })

  const onRenameAcc = (scope, acc) =>
    run(async () => {
      const next = prompt('新的备注名：', acc.name)?.trim()
      if (!next || next === acc.name) return
      await renameAccount(scope.pattern, acc.id, next)
      await reload()
    })

  const onDeleteAcc = (scope, acc) =>
    run(async () => {
      if (!confirm(`删除账号「${acc.name}」？`)) return
      await deleteAccount(scope.pattern, acc.id)
      await reload()
      notify('ok', '已删除账号')
    })

  const onApply = (scope, acc) =>
    run(async () => {
      const failed = await applyAccount(scope.pattern, acc.cookies, scope.cookieNames)
      notify('ok', failed > 0 ? `已应用，但 ${failed} 条失败。请打开/刷新对应站点` : `已应用「${acc.name}」，请打开/刷新对应站点`)
    })

  const download = (text, filename) => {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const onExportScope = (pattern) =>
    run(async () => {
      download(await exportAccounts(pattern), `accounts-${pattern}-${Date.now()}.json`)
      notify('ok', '已导出')
    })

  const onExportAll = () =>
    run(async () => {
      download(await exportAccounts(null), `accounts-all-${Date.now()}.json`)
      notify('ok', '已导出全部')
    })

  const onImportFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    run(async () => {
      const count = await importAccounts(await file.text())
      await reload()
      notify('ok', `成功导入 ${count} 个账号`)
    })
  }

  const totalAccounts = scopes.reduce((n, s) => n + s.accounts.length, 0)

  return (
    <div className="opt-wrap">
      <header className="opt-header">
        <div>
          <h1>账号切换助手 · 管理</h1>
          <p className="opt-summary">
            {scopes.length} 个作用域 · {totalAccounts} 个账号
          </p>
        </div>
        <div className="opt-actions">
          <button onClick={onExportAll} disabled={busy}>导出全部</button>
          <button onClick={() => fileInputRef.current?.click()} disabled={busy}>导入 JSON</button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
        </div>
      </header>

      {scopes.length === 0 ? (
        <p className="opt-empty">
          还没有任何作用域。打开任意网站，点插件图标登录后「保存当前账号」即可。
        </p>
      ) : (
        scopes.map((scope) => (
          <ScopeCard
            key={scope.pattern}
            scope={scope}
            busy={busy}
            onRenamePattern={() => onRenamePattern(scope.pattern)}
            onDeleteScope={() => onDeleteScope(scope.pattern)}
            onExportScope={() => onExportScope(scope.pattern)}
            onAddCookieName={(name) => onAddCookieName(scope, name)}
            onRemoveCookieName={(name) => onRemoveCookieName(scope, name)}
            onRenameAcc={(acc) => onRenameAcc(scope, acc)}
            onDeleteAcc={(acc) => onDeleteAcc(scope, acc)}
            onApply={(acc) => onApply(scope, acc)}
          />
        ))
      )}

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}
    </div>
  )
}

function ScopeCard({
  scope,
  busy,
  onRenamePattern,
  onDeleteScope,
  onExportScope,
  onAddCookieName,
  onRemoveCookieName,
  onRenameAcc,
  onDeleteAcc,
  onApply,
}) {
  const [cookieInput, setCookieInput] = useState('')

  const addCookie = () => {
    onAddCookieName(cookieInput)
    setCookieInput('')
  }

  return (
    <section className="scope-card">
      <div className="card-head">
        <div className="pattern-wrap">
          <span className="pattern-label">域名通配</span>
          <code className="pattern">{scope.pattern}</code>
        </div>
        <div className="card-head-actions">
          <button onClick={onRenamePattern} disabled={busy}>改通配</button>
          <button onClick={onExportScope} disabled={busy || scope.accounts.length === 0}>导出</button>
          <button className="danger" onClick={onDeleteScope} disabled={busy}>删除作用域</button>
        </div>
      </div>

      <div className="card-section">
        <div className="section-title">
          Cookie 组
          {scope.cookieNames.length === 0 && <span className="all-tag">未设置 · 管理全部 Cookie</span>}
        </div>
        <div className="group-chips">
          {scope.cookieNames.map((name) => (
            <span key={name} className="gchip">
              <code>{name}</code>
              <button onClick={() => onRemoveCookieName(name)} disabled={busy} title="移除">×</button>
            </span>
          ))}
          <span className="add-chip">
            <input
              value={cookieInput}
              placeholder="加 Cookie 名，支持 前缀*"
              onChange={(e) => setCookieInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCookie()}
              disabled={busy}
            />
            <button onClick={addCookie} disabled={busy}>添加</button>
          </span>
        </div>
      </div>

      <div className="card-section">
        <div className="section-title">Profile（{scope.accounts.length}）</div>
        {scope.accounts.length === 0 ? (
          <p className="acc-empty">该作用域下还没有账号</p>
        ) : (
          <table className="acc-table">
            <thead>
              <tr>
                <th>备注名</th>
                <th>Cookie 数</th>
                <th>更新时间</th>
                <th className="ta-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {scope.accounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="acc-name">{acc.name}</td>
                  <td>{acc.cookies.length}</td>
                  <td>{new Date(acc.updatedAt).toLocaleString()}</td>
                  <td className="ta-right">
                    <button onClick={() => onApply(acc)} disabled={busy} title="把该账号的 Cookie 写入浏览器">应用</button>
                    <button onClick={() => onRenameAcc(acc)} disabled={busy}>改名</button>
                    <button className="danger" onClick={() => onDeleteAcc(acc)} disabled={busy}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
