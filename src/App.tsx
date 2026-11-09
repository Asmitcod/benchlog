import { AnimatePresence, motion } from 'motion/react'
import { Glass } from 'glisse'
import 'glisse/styles.css'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  Hammer,
  History,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MoreHorizontal,
  Plus,
  Printer,
  QrCode,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Moon,
  Wrench,
  X,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'

type Tool = {
  id: string
  name: string
  category: string
  model: string
  location: string
  status: 'Good' | 'Due soon' | 'Overdue'
  illustration: 'saw' | 'printer' | 'drill'
  color: string
}

type ServiceTask = {
  id: number
  tool: string
  action: string
  due: string
  state: 'Overdue' | 'Today' | 'Tomorrow' | 'This week'
  icon: typeof Wrench
  color: string
}

type ServiceLog = {
  id: string
  taskId: number
  tool: string
  action: string
  note: string
  completedAt: string
}

const initialTools: Tool[] = [
  {
    id: 'TL-001',
    name: 'Table saw',
    category: 'Woodworking',
    model: 'SawStop · PCS31230',
    location: 'Main bench',
    status: 'Good',
    illustration: 'saw',
    color: 'sand',
  },
  {
    id: 'TL-002',
    name: 'Prusa MK4S',
    category: '3D printing',
    model: 'Prusa Research · MK4S',
    location: 'Print corner',
    status: 'Due soon',
    illustration: 'printer',
    color: 'rose',
  },
  {
    id: 'TL-003',
    name: 'Drill press',
    category: 'Metalworking',
    model: 'WEN · 4214T',
    location: 'East wall',
    status: 'Good',
    illustration: 'drill',
    color: 'blue',
  },
]

function isTool(value: unknown): value is Tool {
  if (typeof value !== 'object' || value === null) return false
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'category' in value &&
    typeof value.category === 'string' &&
    'model' in value &&
    typeof value.model === 'string' &&
    'location' in value &&
    typeof value.location === 'string' &&
    'status' in value &&
    (value.status === 'Good' || value.status === 'Due soon' || value.status === 'Overdue') &&
    'illustration' in value &&
    (value.illustration === 'saw' || value.illustration === 'printer' || value.illustration === 'drill') &&
    'color' in value &&
    typeof value.color === 'string'
  )
}

function readSavedTools(): Tool[] {
  const saved = localStorage.getItem('benchlog.tools')
  if (!saved) return initialTools
  try {
    const value: unknown = JSON.parse(saved)
    if (Array.isArray(value) && value.every(isTool)) return value
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    console.error('Saved workshop tools could not be read; starting with the sample tools.', error)
    return initialTools
  }
  console.error('Saved workshop tools were invalid; starting with the sample tools.')
  return initialTools
}

function readCompletedTaskIds(): number[] {
  const saved = localStorage.getItem('benchlog.completed-tasks')
  if (!saved) return []
  try {
    const value: unknown = JSON.parse(saved)
    if (Array.isArray(value) && value.every((id): id is number => Number.isInteger(id))) return value
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    console.error('Saved maintenance history could not be read; starting with the sample tasks.', error)
    return []
  }
  console.error('Saved maintenance history was invalid; starting with the sample tasks.')
  return []
}

function isServiceLog(value: unknown): value is ServiceLog {
  if (typeof value !== 'object' || value === null) return false
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'taskId' in value &&
    typeof value.taskId === 'number' &&
    Number.isInteger(value.taskId) &&
    'tool' in value &&
    typeof value.tool === 'string' &&
    'action' in value &&
    typeof value.action === 'string' &&
    'note' in value &&
    typeof value.note === 'string' &&
    'completedAt' in value &&
    typeof value.completedAt === 'string' &&
    Number.isFinite(Date.parse(value.completedAt))
  )
}

function readServiceLogs(): ServiceLog[] {
  const saved = localStorage.getItem('benchlog.service-logs')
  if (!saved) return []
  try {
    const value: unknown = JSON.parse(saved)
    if (Array.isArray(value) && value.every(isServiceLog)) return value
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    console.error('Saved service history could not be read; starting with an empty history.', error)
    return []
  }
  console.error('Saved service history was invalid; starting with an empty history.')
  return []
}

const initialTasks: ServiceTask[] = [
  { id: 1, tool: 'Prusa MK4S', action: 'Clean & lubricate linear rails', due: '2 days overdue', state: 'Overdue', icon: Settings2, color: 'peach' },
  { id: 2, tool: 'Table saw', action: 'Check blade alignment', due: 'Today', state: 'Today', icon: SlidersHorizontal, color: 'lavender' },
  { id: 3, tool: 'Shop vac', action: 'Replace HEPA filter', due: 'Tomorrow', state: 'Tomorrow', icon: Sparkles, color: 'mint' },
  { id: 4, tool: 'Soldering station', action: 'Inspect & tin the tip', due: 'In 4 days', state: 'This week', icon: Wrench, color: 'butter' },
]

const DrillScene = lazy(() => import('./DrillScene'))
const today = new Date()
const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
  .format(today)
  .toUpperCase()
const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(today)
const serviceDateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })

function formatServiceDate(value: string) {
  return serviceDateFormat.format(new Date(value))
}

function readToolIdFromHash() {
  const match = window.location.hash.match(/^#tool\/(.+)$/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch (error) {
    if (!(error instanceof URIError)) throw error
    return null
  }
}

function GlassSurface({ active }: { active: boolean }) {
  return active ? <Glass className="glisse-panel-surface" aria-hidden="true" /> : null
}

function ToolIllustration({ type }: { type: Tool['illustration'] }) {
  return (
    <svg className={`tool-illustration illustration-${type}`} viewBox="0 0 280 130" aria-hidden="true">
      {type === 'saw' && (
        <>
          <ellipse cx="145" cy="111" rx="91" ry="8" fill="#667060" opacity=".14" />
          <path d="M75 41h132l-10 53H83z" fill="#e1dfd0" stroke="#8c8a78" strokeWidth="2" />
          <path d="M92 93h108v22H92z" fill="#8a9380" />
          <path d="M105 115v6m82-6v6" stroke="#5d6558" strokeWidth="5" strokeLinecap="round" />
          <circle cx="142" cy="66" r="28" fill="#abb0a1" stroke="#687164" strokeWidth="3" />
          <circle cx="142" cy="66" r="20" fill="#d9d8c8" stroke="#828878" strokeWidth="2" />
          <path d="m142 47 5 15 13-7-8 12 13 7-15 1 1 15-8-13-12 9 6-14-14-5 15-3z" fill="#929788" />
          <path d="M73 40h137M97 32l10 8m84-8-10 8" stroke="#777e70" strokeWidth="2" strokeLinecap="round" />
          <path d="M62 58h13m132 0h12" stroke="#bc6b42" strokeWidth="5" strokeLinecap="round" />
          <rect x="176" y="46" width="17" height="10" rx="3" fill="#cf7146" />
        </>
      )}
      {type === 'printer' && (
        <>
          <ellipse cx="145" cy="113" rx="67" ry="7" fill="#756c67" opacity=".14" />
          <path d="M91 25h99v8H91zM92 29h7v77h-7zm91 0h7v77h-7z" fill="#43534b" />
          <path d="M91 103h99v12H91z" fill="#d28b6e" />
          <path d="M117 36h48v6h-48z" fill="#59675d" />
          <path d="M131 42h20v17h-20z" fill="#d28b6e" />
          <path d="M137 59h9v12h-9z" fill="#515d53" />
          <path d="M102 91h76v6h-76z" fill="#758078" />
          <path d="M119 88h38l-8-11h-21z" fill="#e9b08b" />
          <path d="M130 76h15" stroke="#f4d0a6" strokeWidth="3" strokeLinecap="round" />
          <circle cx="197" cy="47" r="14" fill="#e5ddcb" stroke="#8c8778" strokeWidth="2" />
          <circle cx="197" cy="47" r="5" fill="#b9ac92" />
          <path d="M195 39c7 1 10 8 7 13" fill="none" stroke="#c58f66" strokeWidth="3" />
          <path d="M79 110h122" stroke="#566456" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {type === 'drill' && (
        <>
          <ellipse cx="145" cy="113" rx="72" ry="7" fill="#66726c" opacity=".14" />
          <path d="M96 105h100l-12 10h-77z" fill="#555f59" />
          <path d="M139 37h12v69h-12z" fill="#7e8d88" />
          <path d="M108 36h70v24h-70z" fill="#d7ddce" stroke="#68776f" strokeWidth="2" />
          <path d="M116 29h47v8h-47z" fill="#849189" />
          <path d="M172 42h31v13h-31z" fill="#c68156" />
          <path d="M201 46h13v6h-13z" fill="#697772" />
          <path d="M181 44v20" stroke="#68776f" strokeWidth="3" />
          <path d="M136 61h17l-3 10h-11z" fill="#606c67" />
          <path d="M141 71h8v15h-8z" fill="#c1bba7" />
          <path d="M121 86h46" stroke="#66746d" strokeWidth="3" strokeLinecap="round" />
          <circle cx="116" cy="48" r="4" fill="#c68156" />
          <path d="M130 43h24" stroke="#f3f0e2" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'My tools', icon: Hammer, count: '12' },
  { label: 'Maintenance', icon: CalendarDays, count: '4', alert: true },
  { label: 'Parts & stock', icon: Box, count: '2', alert: true },
  { label: 'Documents', icon: FileText },
]

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem('benchlog.theme') === 'light' ? 'light' : 'dark',
  )
  const [activeSection, setActiveSection] = useState('Overview')
  const [tools, setTools] = useState(readSavedTools)
  const [completedTaskIds, setCompletedTaskIds] = useState(readCompletedTaskIds)
  const [serviceLogs, setServiceLogs] = useState(readServiceLogs)
  const tasks = useMemo(() => initialTasks.filter((task) => !completedTaskIds.includes(task.id)), [completedTaskIds])
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<'tool' | 'service' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [serviceNote, setServiceNote] = useState('')
  const [profileToolId, setProfileToolId] = useState(readToolIdFromHash)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    localStorage.setItem('benchlog.tools', JSON.stringify(tools))
  }, [tools])

  useLayoutEffect(() => {
    localStorage.setItem('benchlog.theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    localStorage.setItem('benchlog.completed-tasks', JSON.stringify(completedTaskIds))
  }, [completedTaskIds])

  useEffect(() => {
    localStorage.setItem('benchlog.service-logs', JSON.stringify(serviceLogs))
  }, [serviceLogs])

  useEffect(() => {
    const syncProfileFromUrl = () => setProfileToolId(readToolIdFromHash())
    window.addEventListener('hashchange', syncProfileFromUrl)
    return () => window.removeEventListener('hashchange', syncProfileFromUrl)
  }, [])

  const filteredTools = useMemo(
    () =>
      tools.filter((tool) =>
        `${tool.name} ${tool.category} ${tool.model} ${tool.location}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, tools],
  )
  const profileTool = tools.find((tool) => tool.id === profileToolId)
  const profileTasks = profileTool ? tasks.filter((task) => task.tool === profileTool.name) : []
  const profileServiceLogs = profileTool ? serviceLogs.filter((log) => log.tool === profileTool.name) : []
  const latestServiceLog = serviceLogs[0]
  const profileUrl = useMemo(() => {
    if (!profileTool) return ''
    const url = new URL(window.location.href)
    url.hash = `tool/${encodeURIComponent(profileTool.id)}`
    return url.toString()
  }, [profileTool])

  function setProfileRoute(toolId: string | null) {
    const url = new URL(window.location.href)
    url.hash = toolId ? `tool/${encodeURIComponent(toolId)}` : ''
    window.history.pushState(null, '', url)
    setProfileToolId(toolId)
  }

  function openService(taskId?: number) {
    setSelectedTask(taskId ?? null)
    setServiceNote('')
    setModal('service')
  }

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setToast('Tool link copied. It opens this profile on this device.')
    } catch (error) {
      console.error('Could not copy the tool profile link.', error)
      setToast('Could not copy the link. Check clipboard permissions and try again.')
    }
  }

  function completeService(id: number, note: string) {
    const task = tasks.find((item) => item.id === id)
    if (!task) {
      setToast('Choose an active maintenance task before saving a service log.')
      return
    }
    const completedAt = new Date().toISOString()
    setServiceLogs((items) => [{
      id: `${id}-${completedAt}`,
      taskId: id,
      tool: task.tool,
      action: task.action,
      note: note.trim(),
      completedAt,
    }, ...items])
    setCompletedTaskIds((items) => items.includes(id) ? items : [...items, id])
    setSelectedTask(null)
    setServiceNote('')
    setModal(null)
    setToast(`${task.tool} service logged.`)
  }

  function addTool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name')).trim()
    if (!name) return
    const id = `TL-${String(tools.length + 1).padStart(3, '0')}`
    setTools((items) => [
      ...items,
      {
        id,
        name,
        category: String(formData.get('category')),
        model: String(formData.get('model') || 'Model not added'),
        location: String(formData.get('location') || 'Workshop'),
        status: 'Good',
        illustration: 'drill',
        color: 'blue',
      },
    ])
    setModal(null)
    setToast(`${name} added to your workshop.`)
  }

  function selectNavigation(label: string) {
    setActiveSection(label)
    if (label === 'My tools') {
      document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })
    } else if (label === 'Maintenance') {
      document.getElementById('maintenance')?.scrollIntoView({ behavior: 'smooth' })
    } else if (label === 'Parts & stock') {
      document.getElementById('stock')?.scrollIntoView({ behavior: 'smooth' })
    } else if (label === 'Documents') {
      setToast('Your workshop documents are ready to organize.')
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setMenuOpen(false)
  }

  const visibleTasks = activeSection === 'Maintenance' ? tasks : tasks.slice(0, 3)

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={() => selectNavigation('Overview')}>
          <span className="brand-mark"><span /><span /><span /></span>
          <span>bench<span className="brand-light">log</span></span>
        </a>

        <button className="workshop-switcher" type="button" onClick={() => setToast('You’re viewing Asmit’s workshop.')}>
          <span className="workshop-avatar">A</span>
          <span className="workshop-copy"><strong>Asmit’s workshop</strong><small>Personal space</small></span>
          <ChevronDown size={15} />
        </button>

        <span className="nav-heading">WORKSPACE</span>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon, count, alert }) => {
            const badgeCount = label === 'Maintenance' ? String(tasks.length) : count
            return (
              <button
                className={`nav-link ${activeSection === label ? 'nav-active' : ''}`}
                key={label}
                onClick={() => selectNavigation(label)}
                type="button"
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
                {badgeCount && <span className={`nav-count ${alert ? 'nav-alert' : ''}`}>{badgeCount}</span>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="offline-card">
            <span className="offline-icon"><ShieldCheck size={17} /></span>
            <div><strong>All caught up</strong><span>Your workshop is in sync</span></div>
            <span className="online-dot" />
          </div>
          <button className="nav-link quiet-link" type="button" onClick={() => setToast('Settings are coming to your workshop.')}>
            <CircleHelp size={17} /><span>Help & feedback</span><ArrowUpRight size={14} className="quiet-arrow" />
          </button>
          <button className="profile-button" type="button" onClick={() => setToast('Signed in as Asmit Bisht.')}>
            <span className="profile-avatar">AB</span>
            <span className="profile-copy"><strong>Asmit Bisht</strong><small>Maker plan</small></span>
            <MoreHorizontal size={19} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)} type="button">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeSection}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input aria-label="Search tools" onChange={(event) => setQuery(event.target.value)} placeholder="Find anything..." value={query} />
              <kbd><Command size={11} /> K</kbd>
            </label>
            <button
              className="theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              type="button"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotificationOpen(!notificationOpen)} type="button">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <button className="add-button top-add" onClick={() => setModal('tool')} type="button"><Plus size={16} /> Add a tool</button>
            <AnimatePresence>
              {notificationOpen && (
                <motion.div className="notification-popover" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <strong>You’re all set</strong>
                  <span>Your workshop is up to date. 1 service needs your attention.</span>
                  <button type="button" onClick={() => { setNotificationOpen(false); selectNavigation('Maintenance') }}>View maintenance <ArrowRight size={14} /></button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="content-wrap">
          <motion.section className="welcome-row" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> {todayLabel} <span className="eyebrow-divider">/</span> YOUR WORKSHOP</div>
              <h1>A good day to <span>make something.</span></h1>
              <p>Here’s what’s happening around the workshop.</p>
            </div>
            <button className="date-button" type="button" onClick={() => setToast('You’re viewing this week in your workshop.')}>
              <CalendarDays size={15} /> This week <ChevronDown size={14} />
            </button>
          </motion.section>

          <motion.section className="hero-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
            <div className="hero-copy">
              <span className="hero-kicker"><span className="hero-kicker-dot" /> YOUR WORKSHOP AT A GLANCE</span>
              <h2>Everything in its place.<br />Nothing <em>slips through.</em></h2>
              <p>12 tools looked after. {tasks.length} little things to take care of.<br />You’ve got this.</p>
              <button className="hero-cta" onClick={() => selectNavigation('Maintenance')} type="button">
                See what needs love <ArrowRight size={15} />
              </button>
            </div>
            <div className="hero-art" aria-label="A three-dimensional cordless drill illustration">
              <div className="art-glow" />
              <div className="art-grid" />
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-caption"><span className="caption-line" /> A TOOL THAT<br />EARNS ITS KEEP</div>
              <Suspense fallback={<div className="scene-loading" />}><DrillScene /></Suspense>
              <div className="art-shadow" />
              <div className="art-index">01 <span>/</span> 12</div>
            </div>
            <div className="hero-footer"><span><span className="hero-footer-dot" /> YOUR BENCH, IN GOOD SHAPE</span><span>GOOD WORK STARTS HERE <ArrowDownRight size={13} /></span></div>
          </motion.section>

          <section className="stats-grid" aria-label="Workshop summary">
            <motion.article className="stat-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <GlassSurface active={theme === 'dark'} />
              <span className="stat-label">IN YOUR WORKSHOP <Hammer size={15} /></span>
              <div className="stat-value">{12 + tools.length - initialTools.length}<span>tools</span></div>
              <div className="stat-foot"><span className="positive-dot" /> Everything where it belongs <ArrowUpRight size={13} /></div>
            </motion.article>
            <motion.article className="stat-card stat-card-due" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <GlassSurface active={theme === 'dark'} />
              <span className="stat-label">NEEDS A LITTLE LOVE <Clock3 size={15} /></span>
              <div className="stat-value">{tasks.length}<span>tasks</span></div>
              <div className="stat-foot"><span className="due-dot" /> {tasks.some((task) => task.state === 'Overdue') ? 'One is a little overdue' : 'You’re all caught up'} <ArrowUpRight size={13} /></div>
            </motion.article>
            <motion.article className="stat-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <GlassSurface active={theme === 'dark'} />
              <span className="stat-label">PARTS & MATERIALS <Box size={15} /></span>
              <div className="stat-value">2<span>running low</span></div>
              <div className="stat-foot"><span className="stock-dot" /> A quick restock goes a long way <ArrowUpRight size={13} /></div>
            </motion.article>
            <motion.article className="stat-card stat-card-quiet" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
              <GlassSurface active={theme === 'dark'} />
              <span className="stat-label">LAST THING YOU DID <Sparkles size={15} /></span>
              <div className="stat-value stat-last">{latestServiceLog?.action ?? 'No service logged yet'}</div>
              <div className="stat-foot"><span className="positive-dot" />{latestServiceLog ? `${formatServiceDate(latestServiceLog.completedAt)} · ${latestServiceLog.tool}` : 'Your service notes will appear here'}</div>
            </motion.article>
          </section>

          <div className="dashboard-grid">
            <section className="panel maintenance-panel" id="maintenance">
              <GlassSurface active={theme === 'dark'} />
              <div className="panel-heading">
                <div><span className="section-eyebrow">KEEP THE GOOD WORK GOING</span><h2>On the bench</h2></div>
                <button className="text-button" onClick={() => selectNavigation('Maintenance')} type="button">All maintenance <ArrowRight size={14} /></button>
              </div>
              <div className="task-list">
                {visibleTasks.length === 0 && (
                  <div className="all-done"><span><Check size={18} /></span><strong>All done for now.</strong><p>Every tool is ready for its next project.</p></div>
                )}
                {visibleTasks.map((task, index) => {
                  const Icon = task.icon
                  return (
                    <motion.article className="task-row" key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}>
                      <span className={`task-icon ${task.color}`}><Icon size={17} strokeWidth={1.8} /></span>
                      <div className="task-main"><strong>{task.action}</strong><span>{task.tool}</span></div>
                      <span className={`task-due ${task.state === 'Overdue' ? 'due-overdue' : ''}`}>{task.due}</span>
                      <button className="task-done" aria-label={`Log service: ${task.action}`} onClick={() => openService(task.id)} type="button"><Check size={15} /><span>Log it</span></button>
                    </motion.article>
                  )
                })}
              </div>
              <div className="panel-footer">
                <span><span className="footer-status-dot" /> {tasks.length} small things. Big peace of mind.</span>
                <button onClick={() => setModal('service')} type="button"><Plus size={14} /> Log a service</button>
              </div>
            </section>

            <section className="panel stock-panel" id="stock">
              <GlassSurface active={theme === 'dark'} />
              <div className="panel-heading">
                <div><span className="section-eyebrow">BEFORE YOU RUN OUT</span><h2>On the shelf</h2></div>
                <button className="panel-more" aria-label="More stock options" onClick={() => setToast('Stock management is ready for your next build.')} type="button"><MoreHorizontal size={20} /></button>
              </div>
              <div className="stock-item">
                <span className="stock-image filament"><span /></span>
                <div className="stock-info"><strong>PLA filament</strong><span>Prusa MK4S <span className="stock-bullet">·</span> 1 kg spools</span></div>
                <div className="stock-quantity"><strong>0.3 <small>kg</small></strong><span>of 2 kg</span></div>
              </div>
              <div className="stock-progress"><span className="progress-filament" /></div>
              <div className="stock-status"><span className="status-pill status-low"><span /> Running low</span><button type="button" onClick={() => setToast('Added PLA filament to your restock list.')}>Add to list <ArrowUpRight size={13} /></button></div>
              <div className="stock-divider" />
              <div className="stock-item">
                <span className="stock-image filter"><LifeBuoy size={19} strokeWidth={1.5} /></span>
                <div className="stock-info"><strong>HEPA filter</strong><span>Shop vac <span className="stock-bullet">·</span> 1 filter</span></div>
                <div className="stock-quantity"><strong>1 <small>left</small></strong><span>of 3</span></div>
              </div>
              <div className="stock-progress"><span className="progress-filter" /></div>
              <div className="stock-status"><span className="status-pill status-soon"><span /> Almost out</span><button type="button" onClick={() => setToast('Added HEPA filter to your restock list.')}>Add to list <ArrowUpRight size={13} /></button></div>
              <button className="stock-all" type="button" onClick={() => setToast('You have 8 parts and materials in your workshop.')}>See all 8 parts & materials <ArrowRight size={14} /></button>
            </section>
          </div>

          <section className="panel tools-panel" id="tools">
            <GlassSurface active={theme === 'dark'} />
            <div className="panel-heading tools-heading">
              <div><span className="section-eyebrow">GOOD COMPANY</span><h2>Tools you love</h2></div>
              <div className="tools-actions"><span className="tool-count">{filteredTools.length} of {tools.length} tools</span><button className="filter-button" type="button" onClick={() => setToast('Showing tools from your whole workshop.')}><Filter size={14} /> Filter</button><button className="icon-button tools-arrow" aria-label="See all tools" onClick={() => selectNavigation('My tools')} type="button"><ArrowRight size={16} /></button></div>
            </div>
            {filteredTools.length === 0 ? (
              <div className="empty-search"><Search size={19} /><strong>No tools found</strong><span>Try another name, category, or location.</span></div>
            ) : (
              <div className="tool-grid">
                {filteredTools.map((tool, index) => (
                  <motion.button className="tool-card" key={tool.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * index }} onClick={() => setProfileRoute(tool.id)} type="button">
                    <div className={`tool-photo tool-photo-${tool.color}`}>
                      <ToolIllustration type={tool.illustration} />
                      <span className={`tool-status ${tool.status === 'Due soon' ? 'tool-status-due' : ''}`}><span />{tool.status === 'Good' ? 'In good shape' : tool.status}</span>
                      <span className="tool-card-more"><MoreHorizontal size={16} /></span>
                    </div>
                    <span className="tool-card-copy"><span><strong>{tool.name}</strong><small>{tool.model}</small></span><ArrowUpRight size={16} /></span>
                  </motion.button>
                ))}
                <button className="add-tool-card" onClick={() => setModal('tool')} type="button">
                  <span className="add-tool-icon"><Plus size={18} /></span><strong>Make room for one more</strong><small>Add a tool to your workshop</small><span className="add-tool-link">Add a tool <ArrowRight size={14} /></span>
                </button>
              </div>
            )}
          </section>

          <footer className="page-footer"><span>MADE FOR THE THINGS YOU MAKE <span className="footer-heart">✳</span></span><span>BENCHLOG <span className="footer-version">· YOUR WORKSHOP, REMEMBERED</span></span></footer>
        </div>
      </main>

      <AnimatePresence>
        {profileTool && (
          <motion.div
            className="modal-backdrop profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileRoute(null) }}
          >
            <motion.section
              aria-labelledby="profile-title"
              aria-modal="true"
              className="profile-modal"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              role="dialog"
            >
              <header className="profile-modal-heading">
                <div className={`profile-illustration tool-photo-${profileTool.color}`}><ToolIllustration type={profileTool.illustration} /></div>
                <div className="profile-title-block">
                  <span className="section-eyebrow">{profileTool.category.toUpperCase()} <span>·</span> {profileTool.id}</span>
                  <h2 id="profile-title">{profileTool.name}</h2>
                  <p>{profileTool.model}</p>
                </div>
                <button className="icon-button profile-close" aria-label="Close tool profile" onClick={() => setProfileRoute(null)} type="button"><X size={18} /></button>
              </header>

              <div className="profile-content">
                <div className="profile-main-column">
                  <div className="profile-facts">
                    <div><span>LOCATION</span><strong>{profileTool.location}</strong></div>
                    <div><span>CONDITION</span><strong className={`profile-condition ${profileTool.status === 'Good' ? '' : 'condition-due'}`}><i />{profileTool.status === 'Good' ? 'In good shape' : profileTool.status}</strong></div>
                    <div><span>PROFILE ID</span><strong className="profile-id">{profileTool.id}</strong></div>
                  </div>

                  <section className="profile-maintenance">
                    <div className="profile-section-heading">
                      <div><span className="section-eyebrow">KEEP IT RUNNING</span><h3>Maintenance</h3></div>
                      <span className="profile-task-count">{profileTasks.length} due</span>
                    </div>
                    {profileTasks.length > 0 ? profileTasks.map((task) => {
                      const Icon = task.icon
                      return (
                        <div className="profile-task" key={task.id}>
                          <span className={`task-icon ${task.color}`}><Icon size={16} /></span>
                          <div><strong>{task.action}</strong><span>{task.due}</span></div>
                          <button className="profile-log-button" onClick={() => { setProfileRoute(null); openService(task.id) }} type="button">Log service</button>
                        </div>
                      )
                    }) : (
                      <div className="profile-empty"><Check size={16} /><span>No maintenance is due right now.</span></div>
                    )}
                  </section>

                  <section className="profile-history">
                    <div className="profile-section-heading">
                      <div><span className="section-eyebrow">A RECORD OF GOOD CARE</span><h3>Service history</h3></div>
                      <span className="profile-task-count">{profileServiceLogs.length} logged</span>
                    </div>
                    {profileServiceLogs.length > 0 ? (
                      <div className="profile-history-list">
                        {profileServiceLogs.slice(0, 4).map((log) => (
                          <article className="profile-history-item" key={log.id}>
                            <span className="profile-history-icon"><History size={14} /></span>
                            <div>
                              <strong>{log.action}</strong>
                              <time dateTime={log.completedAt}>{formatServiceDate(log.completedAt)}</time>
                              {log.note && <p>{log.note}</p>}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="profile-empty"><History size={15} /><span>Completed service and notes will show up here.</span></div>
                    )}
                  </section>

                  <section className="profile-documents">
                    <div className="profile-section-heading">
                      <div><span className="section-eyebrow">ON HAND WHEN YOU NEED IT</span><h3>Documents</h3></div>
                    </div>
                    <button className="profile-document-row" onClick={() => setToast('Attach a manual when document storage is connected.')} type="button">
                      <span><FileText size={16} /></span><div><strong>Keep the manual close</strong><small>Add a PDF, photo, or useful link</small></div><Plus size={15} />
                    </button>
                  </section>
                </div>

                <aside className="profile-qr-column">
                  <div className="qr-print-label">
                    <div className="qr-heading"><span><QrCode size={16} /> BENCHLOG TOOL TAG</span><span className="qr-tag-id">{profileTool.id}</span></div>
                    <div className="qr-code"><QRCodeSVG value={profileUrl} size={160} level="M" marginSize={2} /></div>
                    <strong className="qr-tool-name">{profileTool.name}</strong>
                    <span className="qr-instruction">SCAN TO OPEN THIS TOOL PROFILE</span>
                    <span className="qr-link">{profileUrl}</span>
                  </div>
                  <p className="qr-note">This QR opens this profile in this browser. Add it to the deployed app to scan it from another device.</p>
                  <div className="qr-actions">
                    <button className="add-button" onClick={() => window.print()} type="button"><Printer size={15} /> Print tool tag</button>
                    <button className="cancel-button" onClick={copyProfileLink} type="button"><Copy size={14} /> Copy link</button>
                  </div>
                  <a className="profile-open-link" href={profileUrl} target="_blank" rel="noreferrer">Open profile link <ExternalLink size={13} /></a>
                </aside>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}>
            <motion.div className="modal-card" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}>
              <div className="modal-heading"><div><span className="section-eyebrow">{modal === 'tool' ? 'MAKE IT PART OF THE WORKSHOP' : 'A LITTLE CARE GOES A LONG WAY'}</span><h2>{modal === 'tool' ? 'Add a tool' : 'Log a service'}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)} type="button"><X size={18} /></button></div>
              {modal === 'tool' ? (
                <form className="modal-form" onSubmit={addTool}>
                  <label>Tool name<input autoFocus name="name" placeholder="e.g. Bandsaw" required /></label>
                  <label>Category<select name="category" defaultValue="Woodworking"><option>Woodworking</option><option>3D printing</option><option>Metalworking</option><option>Electronics</option><option>Other</option></select></label>
                  <label>Make & model<input name="model" placeholder="e.g. Laguna · 14|BX" /></label>
                  <label>Where does it live?<input name="location" placeholder="e.g. East wall" /></label>
                  <div className="modal-actions"><button className="cancel-button" onClick={() => setModal(null)} type="button">Not now</button><button className="add-button" type="submit"><Plus size={15} /> Add to workshop</button></div>
                </form>
              ) : (
                <form className="service-form" onSubmit={(event) => {
                  event.preventDefault()
                  if (selectedTask === null) {
                    setToast('Pick a task to add it to your service history.')
                    return
                  }
                  completeService(selectedTask, serviceNote)
                }}>
                  <label>What did you work on?<select value={selectedTask ?? ''} onChange={(event) => setSelectedTask(Number(event.target.value) || null)}><option value="">Pick a maintenance task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.tool} — {task.action}</option>)}</select></label>
                  <label>A note for next time <span className="optional-label">OPTIONAL</span><textarea value={serviceNote} onChange={(event) => setServiceNote(event.target.value)} placeholder="Anything worth remembering?" rows={3} /></label>
                  <div className="service-date"><CalendarDays size={15} /><span>Service date</span><strong>Today, {shortDate}</strong></div>
                  <div className="modal-actions"><button className="cancel-button" onClick={() => setModal(null)} type="button">Not now</button><button className="add-button" type="submit"><Check size={15} /> Save service</button></div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <motion.div className="toast-message" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span><Check size={14} /></span>{toast}</motion.div>}
      </AnimatePresence>
    </div>
  )
}

export default App
