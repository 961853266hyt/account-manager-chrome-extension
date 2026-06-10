import { useEffect, useState } from 'react'
import { setCookieNames } from '../lib/domain-config'

// 启发式：HttpOnly 或名字像登录态的，默认推荐勾选
const AUTH_RE = /sess|auth|token|sid|login|uid|user|csrf|jwt|account|secure|remember|passport|ticket/i
function isLikelyAuth(c) {
  return c.httpOnly || AUTH_RE.test(c.name)
}

export default function CookieSettings({ domain, config, onSaved, onClose }) {
  const [cookies, setCookies] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [extras, setExtras] = useState([]) // 配置里但当前页不存在的名字/通配
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.cookies.getAll({ domain }).then((list) => {
      // 按名字去重并排序
      const byName = [...new Map(list.map((c) => [c.name, c])).values()].sort(
        (a, b) => a.name.localeCompare(b.name),
      )
      setCookies(byName)
      if (config?.cookieNames?.length) {
        const present = new Set()
        const extra = []
        for (const p of config.cookieNames) {
          if (byName.some((c) => c.name === p)) present.add(p)
          else extra.push(p)
        }
        setSelected(present)
        setExtras(extra)
      } else {
        setSelected(new Set(byName.filter(isLikelyAuth).map((c) => c.name)))
      }
      setLoading(false)
    })
  }, [domain, config])

  function toggle(name) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function addCustom() {
    const v = custom.trim()
    if (v && !extras.includes(v) && !selected.has(v)) setExtras((e) => [...e, v])
    setCustom('')
  }

  async function save() {
    const names = await setCookieNames(domain, [...selected, ...extras])
    onSaved(names)
  }

  const total = selected.size + extras.length

  return (
    <div className="settings">
      <div className="settings-head">
        <strong>选择要管理的 Cookie</strong>
        <button onClick={onClose}>关闭</button>
      </div>
      <p className="settings-hint">
        只保存 / 切换这里选中的 Cookie（一般是登录态相关的几个），不碰分析、追踪类 Cookie。全部不选则保存全部。
      </p>

      {loading ? (
        <p className="empty">读取当前 Cookie…</p>
      ) : (
        <>
          <div className="cookie-actions">
            <button onClick={() => setSelected(new Set(cookies.map((c) => c.name)))}>
              全选
            </button>
            <button onClick={() => setSelected(new Set())}>清空</button>
            <button
              onClick={() =>
                setSelected(new Set(cookies.filter(isLikelyAuth).map((c) => c.name)))
              }
            >
              智能推荐
            </button>
          </div>

          <ul className="cookie-list">
            {cookies.length === 0 && <li className="empty">当前域名下没有 Cookie</li>}
            {cookies.map((c) => (
              <li key={c.name}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(c.name)}
                    onChange={() => toggle(c.name)}
                  />
                  <span className="cookie-name" title={c.name}>
                    {c.name}
                  </span>
                  {c.httpOnly && <span className="badge">HttpOnly</span>}
                </label>
              </li>
            ))}
          </ul>

          {extras.length > 0 && (
            <div className="chips">
              {extras.map((p) => (
                <span key={p} className="chip">
                  {p}
                  <button onClick={() => setExtras((e) => e.filter((x) => x !== p))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="custom-row">
            <input
              placeholder="手动添加名字，支持前缀通配 如 __Secure-*"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            />
            <button onClick={addCustom}>添加</button>
          </div>

          <button className="primary settings-save" onClick={save}>
            保存设置（{total > 0 ? `${total} 项` : '全部'}）
          </button>
        </>
      )}
    </div>
  )
}
