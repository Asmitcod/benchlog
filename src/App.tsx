import { AnimatePresence, motion } from 'motion/react'
import { Glass } from 'glisse'
import 'glisse/styles.css'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Anvil,
  Axe,
  Bell,
  Box,
  Briefcase,
  Boxes,
  Cable,
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
  File,
  Flashlight,
  Glasses,
  Grip,
  Hammer,
  History,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Minus,
  MoreHorizontal,
  Plus,
  Printer,
  PocketKnife,
  PencilRuler,
  Ruler,
  RulerDimensionLine,
  QrCode,
  Screw,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Nut,
  Wrench as WrenchIcon,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import AccountDialog from './components/AccountDialog'
import { supabaseClient } from './lib/supabase'
import { useAuthSession } from './lib/useAuthSession'

type Tool = {
  id: string
  name: string
  category: string
  model: string
  location: string
  status: 'Good' | 'Due soon' | 'Overdue'
  illustration:
    | 'saw' | 'printer' | 'drill'
    | 'hammer' | 'screw' | 'wrench' | 'cable' | 'ruler' | 'pocket-knife'
    | 'ruler-dimension-line' | 'nut' | 'grip' | 'scissors' | 'file'
    | 'pencil-ruler' | 'anvil' | 'axe' | 'flashlight' | 'glasses' | 'briefcase' | 'boxes'
  color: string
}

type ServiceTask = {
  id: number
  tool: string
  action: string
  due: string
  state: 'Overdue' | 'Today' | 'Tomorrow' | 'This week'
  recurrence?: MaintenanceRecurrence
  icon: typeof Wrench
  color: string
}

type MaintenanceRecurrence = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

function isMaintenanceRecurrence(value: string): value is MaintenanceRecurrence {
  return value === 'none' || value === 'weekly' || value === 'monthly' || value === 'quarterly' || value === 'yearly'
}

type CustomMaintenanceTask = {
  id: number
  tool: string
  action: string
  dueAt: string
  recurrence?: MaintenanceRecurrence
}

type ServiceLog = {
  id: string
  taskId: number | null
  tool: string
  action: string
  note: string
  completedAt: string
}

type StockItem = {
  id: string
  name: string
  location: string
  quantity: number
  capacity: number
  minimum: number
  unit: string
  step: number
  onRestockList: boolean
}

type WorkshopSnapshot = {
  tools: Tool[]
  stockItems: StockItem[]
  customMaintenanceTasks: CustomMaintenanceTask[]
  completedTaskIds: number[]
  serviceLogs: ServiceLog[]
}

type LocalSnapshotBackup = {
  savedAt: string
  snapshot: WorkshopSnapshot
}

type SyncStatus = 'local' | 'loading' | 'synced' | 'error'

const legacySampleTaskIds = new Set([1, 2, 3, 4])
const initialStock: StockItem[] = []

function isStockItem(value: unknown): value is StockItem {
  if (typeof value !== 'object' || value === null) return false
  return (
    'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string' &&
    'location' in value && typeof value.location === 'string' &&
    'quantity' in value && typeof value.quantity === 'number' && Number.isFinite(value.quantity) && value.quantity >= 0 &&
    'capacity' in value && typeof value.capacity === 'number' && Number.isFinite(value.capacity) && value.capacity > 0 &&
    'minimum' in value && typeof value.minimum === 'number' && Number.isFinite(value.minimum) && value.minimum >= 0 &&
    'unit' in value && typeof value.unit === 'string' && value.unit.trim().length > 0 &&
    'step' in value && typeof value.step === 'number' && Number.isFinite(value.step) && value.step > 0 &&
    'onRestockList' in value && typeof value.onRestockList === 'boolean'
  )
}

function readStockItems(): StockItem[] {
  const saved = localStorage.getItem('benchlog.stock')
  if (!saved) return initialStock
  try {
    const value: unknown = JSON.parse(saved)
    if (Array.isArray(value) && value.every(isStockItem)) return value.filter((item) => !isBundledSampleStock(item))
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    console.error('Saved workshop stock could not be read; starting with empty stock.', error)
    return initialStock
  }
  console.error('Saved workshop stock was invalid; starting with empty stock.')
  return initialStock
}

const initialTools: Tool[] = [
  { id: 'TL-001', name: 'Hammer', category: 'Woodworking', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'hammer', color: 'blue' },
  { id: 'TL-002', name: 'Screwdriver set', category: 'Other', model: 'Flathead and Phillips', location: 'Workshop', status: 'Good', illustration: 'screw', color: 'blue' },
  { id: 'TL-003', name: 'Adjustable wrench', category: 'Metalworking', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'wrench', color: 'blue' },
  { id: 'TL-004', name: 'Pliers', category: 'Other', model: 'Combination pliers', location: 'Workshop', status: 'Good', illustration: 'cable', color: 'blue' },
  { id: 'TL-005', name: 'Tape measure', category: 'Woodworking', model: '5 m / 16 ft', location: 'Workshop', status: 'Good', illustration: 'ruler', color: 'blue' },
  { id: 'TL-006', name: 'Utility knife', category: 'Other', model: 'Retractable blade', location: 'Workshop', status: 'Good', illustration: 'pocket-knife', color: 'blue' },
  { id: 'TL-007', name: 'Cordless drill', category: 'Woodworking', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'drill', color: 'blue' },
  { id: 'TL-008', name: 'Hand saw', category: 'Woodworking', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'saw', color: 'sand' },
  { id: 'TL-009', name: 'Spirit level', category: 'Other', model: '45 cm / 18 in', location: 'Workshop', status: 'Good', illustration: 'ruler-dimension-line', color: 'blue' },
  { id: 'TL-010', name: 'Socket set', category: 'Metalworking', model: 'Metric set', location: 'Workshop', status: 'Good', illustration: 'nut', color: 'blue' },
  { id: 'TL-011', name: 'Hex key set', category: 'Other', model: 'Metric set', location: 'Workshop', status: 'Good', illustration: 'grip', color: 'blue' },
  { id: 'TL-012', name: 'Clamps', category: 'Woodworking', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'anvil', color: 'blue' },
  { id: 'TL-013', name: 'Scissors', category: 'Other', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'scissors', color: 'blue' },
  { id: 'TL-014', name: 'Metal file', category: 'Metalworking', model: 'Flat file', location: 'Workshop', status: 'Good', illustration: 'file', color: 'blue' },
  { id: 'TL-015', name: 'Wood chisel set', category: 'Woodworking', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'pencil-ruler', color: 'blue' },
  { id: 'TL-016', name: 'Rubber mallet', category: 'Woodworking', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'axe', color: 'blue' },
  { id: 'TL-017', name: 'Combination wrench set', category: 'Metalworking', model: 'Metric set', location: 'Workshop', status: 'Good', illustration: 'briefcase', color: 'blue' },
  { id: 'TL-018', name: 'Flashlight', category: 'Other', model: 'Handheld', location: 'Workshop', status: 'Good', illustration: 'flashlight', color: 'blue' },
  { id: 'TL-019', name: 'Safety glasses', category: 'Other', model: 'Protective eyewear', location: 'Workshop', status: 'Good', illustration: 'glasses', color: 'blue' },
  { id: 'TL-020', name: 'Toolbox', category: 'Other', model: 'General purpose', location: 'Workshop', status: 'Good', illustration: 'boxes', color: 'blue' },
]

const starterIllustrations = new Map(initialTools.map((tool) => [`${tool.id}:${tool.name}`, tool.illustration]))

function applyStarterToolIllustrations(tools: Tool[]) {
  return tools.map((tool) => {
    const illustration = starterIllustrations.get(`${tool.id}:${tool.name}`)
    return illustration ? { ...tool, illustration } : tool
  })
}

function isBundledSampleStock(item: StockItem) {
  return (item.id === 'PLA-001' && item.name === 'PLA filament' && item.location === 'Prusa MK4S · 1 kg spools') ||
    (item.id === 'HEPA-001' && item.name === 'HEPA filter' && item.location === 'Shop vac · 1 filter')
}

function isBundledSampleTool(tool: Tool) {
  return (tool.id === 'TL-001' && tool.name === 'Table saw' && tool.model === 'SawStop · PCS31230') ||
    (tool.id === 'TL-002' && tool.name === 'Prusa MK4S' && tool.model === 'Prusa Research · MK4S') ||
    (tool.id === 'TL-003' && tool.name === 'Drill press' && tool.model === 'WEN · 4214T')
}

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
    (value.illustration === 'saw' || value.illustration === 'printer' || value.illustration === 'drill' ||
      value.illustration === 'hammer' || value.illustration === 'screw' || value.illustration === 'wrench' ||
      value.illustration === 'cable' || value.illustration === 'ruler' || value.illustration === 'pocket-knife' ||
      value.illustration === 'ruler-dimension-line' || value.illustration === 'nut' || value.illustration === 'grip' ||
      value.illustration === 'scissors' || value.illustration === 'file' || value.illustration === 'pencil-ruler' ||
      value.illustration === 'anvil' || value.illustration === 'axe' || value.illustration === 'flashlight' ||
      value.illustration === 'glasses' || value.illustration === 'briefcase' || value.illustration === 'boxes') &&
    'color' in value &&
    typeof value.color === 'string'
  )
}

function readSavedTools(): Tool[] {
  const saved = localStorage.getItem('benchlog.tools')
  if (!saved) return initialTools
  try {
    const value: unknown = JSON.parse(saved)
    if (Array.isArray(value) && value.every(isTool)) {
      const savedTools = applyStarterToolIllustrations(value.filter((tool) => !isBundledSampleTool(tool)))
      return savedTools.length > 0 ? savedTools : initialTools
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    console.error('Saved workshop tools could not be read; starting with an empty workshop.', error)
    return initialTools
  }
  console.error('Saved workshop tools were invalid; starting with an empty workshop.')
  return initialTools
}

function readCompletedTaskIds(): number[] {
  const saved = localStorage.getItem('benchlog.completed-tasks')
  if (!saved) return []
  try {
    const value: unknown = JSON.parse(saved)
    if (Array.isArray(value) && value.every((id): id is number => Number.isInteger(id))) {
      return value.filter((id) => !legacySampleTaskIds.has(id))
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    console.error('Saved maintenance history could not be read; starting with an empty history.', error)
    return []
  }
  console.error('Saved maintenance history was invalid; starting with an empty history.')
  return []
}

function isCustomMaintenanceTask(value: unknown): value is CustomMaintenanceTask {
  if (typeof value !== 'object' || value === null) return false
  return (
    'id' in value && typeof value.id === 'number' && Number.isInteger(value.id) &&
    'tool' in value && typeof value.tool === 'string' &&
    'action' in value && typeof value.action === 'string' &&
    'dueAt' in value && typeof value.dueAt === 'string' &&
    isValidLocalDate(value.dueAt) &&
    (!('recurrence' in value) || value.recurrence === 'none' || value.recurrence === 'weekly' ||
      value.recurrence === 'monthly' || value.recurrence === 'quarterly' || value.recurrence === 'yearly')
  )
}

function readCustomMaintenanceTasks(): CustomMaintenanceTask[] {
  const saved = localStorage.getItem('benchlog.custom-maintenance')
  if (!saved) return []
  try {
    const value: unknown = JSON.parse(saved)
    if (Array.isArray(value) && value.every(isCustomMaintenanceTask)) return value
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    console.error('Saved custom maintenance tasks could not be read; starting with an empty list.', error)
    return []
  }
  console.error('Saved custom maintenance tasks were invalid; starting with an empty list.')
  return []
}

function isServiceLog(value: unknown): value is ServiceLog {
  if (typeof value !== 'object' || value === null) return false
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'taskId' in value &&
    (value.taskId === null || (typeof value.taskId === 'number' && Number.isInteger(value.taskId))) &&
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
    if (Array.isArray(value) && value.every(isServiceLog)) {
      return value.filter((log) => log.taskId === null || !legacySampleTaskIds.has(log.taskId))
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    console.error('Saved service history could not be read; starting with an empty history.', error)
    return []
  }
  console.error('Saved service history was invalid; starting with an empty history.')
  return []
}

function isWorkshopSnapshot(value: unknown): value is WorkshopSnapshot {
  if (typeof value !== 'object' || value === null) return false
  return (
    'tools' in value && Array.isArray(value.tools) && value.tools.every(isTool) &&
    'stockItems' in value && Array.isArray(value.stockItems) && value.stockItems.every(isStockItem) &&
    'customMaintenanceTasks' in value &&
      Array.isArray(value.customMaintenanceTasks) && value.customMaintenanceTasks.every(isCustomMaintenanceTask) &&
    'completedTaskIds' in value &&
      Array.isArray(value.completedTaskIds) && value.completedTaskIds.every((id) => Number.isInteger(id)) &&
    'serviceLogs' in value && Array.isArray(value.serviceLogs) && value.serviceLogs.every(isServiceLog)
  )
}

function removeBundledSampleData(snapshot: WorkshopSnapshot): WorkshopSnapshot {
  const savedTools = applyStarterToolIllustrations(snapshot.tools.filter((tool) => !isBundledSampleTool(tool)))
  return {
    ...snapshot,
    tools: savedTools.length > 0 ? savedTools : initialTools,
    stockItems: snapshot.stockItems.filter((item) => !isBundledSampleStock(item)),
    completedTaskIds: snapshot.completedTaskIds.filter((id) => !legacySampleTaskIds.has(id)),
    serviceLogs: snapshot.serviceLogs.filter((log) => log.taskId === null || !legacySampleTaskIds.has(log.taskId)),
  }
}

function isLocalSnapshotBackup(value: unknown): value is LocalSnapshotBackup {
  if (typeof value !== 'object' || value === null) return false
  return (
    'savedAt' in value && typeof value.savedAt === 'string' &&
    'snapshot' in value && isWorkshopSnapshot(value.snapshot)
  )
}

function serializeSnapshot(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(serializeSnapshot).join(',')}]`
  }

  if (typeof value === 'object' && value !== null) {
    const properties = Object.entries(value)
      .filter(([, propertyValue]) => propertyValue !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    return `{${properties.map(([key, propertyValue]) =>
      `${JSON.stringify(key)}:${serializeSnapshot(propertyValue)}`).join(',')}}`
  }

  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new Error('Workshop data could not be serialized.')
  return serialized
}

function saveSnapshotToLocalStorage(snapshot: WorkshopSnapshot) {
  localStorage.setItem('benchlog.tools', JSON.stringify(snapshot.tools))
  localStorage.setItem('benchlog.stock', JSON.stringify(snapshot.stockItems))
  localStorage.setItem('benchlog.custom-maintenance', JSON.stringify(snapshot.customMaintenanceTasks))
  localStorage.setItem('benchlog.completed-tasks', JSON.stringify(snapshot.completedTaskIds))
  localStorage.setItem('benchlog.service-logs', JSON.stringify(snapshot.serviceLogs))
}

function backupLocalSnapshot(userId: string, snapshot: WorkshopSnapshot) {
  const key = `benchlog.local-backups.${userId}`
  const saved = localStorage.getItem(key)
  let backups: LocalSnapshotBackup[] = []

  if (saved) {
    try {
      const value: unknown = JSON.parse(saved)
      if (Array.isArray(value) && value.every(isLocalSnapshotBackup)) backups = value
      else console.error('A saved local-data backup was invalid; starting a new backup list.')
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      console.error('A saved local-data backup could not be read; starting a new backup list.', error)
    }
  }

  const serializedSnapshot = serializeSnapshot(snapshot)
  if (!backups.some((backup) => serializeSnapshot(backup.snapshot) === serializedSnapshot)) {
    backups.push({ savedAt: new Date().toISOString(), snapshot })
  }
  localStorage.setItem(key, JSON.stringify(backups.slice(-10)))
  return backups.length > 0
}

const DrillScene = lazy(() => import('./DrillScene'))
const today = new Date()
const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
  .format(today)
  .toUpperCase()
const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(today)
const serviceDateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
const dayMilliseconds = 24 * 60 * 60 * 1000

function localDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isValidLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) && localDateValue(date) === value
}

function addMonthsClamped(date: Date, months: number) {
  const result = new Date(date)
  const day = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDay))
  return result
}

function nextDueDate(recurrence: MaintenanceRecurrence, completedAt: Date) {
  const next = new Date(completedAt)
  if (recurrence === 'weekly') next.setDate(next.getDate() + 7)
  if (recurrence === 'monthly') return localDateValue(addMonthsClamped(next, 1))
  if (recurrence === 'quarterly') return localDateValue(addMonthsClamped(next, 3))
  if (recurrence === 'yearly') return localDateValue(addMonthsClamped(next, 12))
  return localDateValue(next)
}

function getTaskDue(dueAt: string): Pick<ServiceTask, 'due' | 'state'> {
  const dueDate = new Date(`${dueAt}T00:00:00`)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.round((dueDate.getTime() - todayDate.getTime()) / dayMilliseconds)
  if (daysUntilDue < 0) {
    const daysOverdue = Math.abs(daysUntilDue)
    return { due: `${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue`, state: 'Overdue' }
  }
  if (daysUntilDue === 0) return { due: 'Today', state: 'Today' }
  if (daysUntilDue === 1) return { due: 'Tomorrow', state: 'Tomorrow' }
  return { due: `In ${daysUntilDue} days`, state: 'This week' }
}

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

const toolGlyphs: Partial<Record<Tool['illustration'], typeof Hammer>> = {
  hammer: Hammer,
  screw: Screw,
  wrench: WrenchIcon,
  cable: Cable,
  ruler: Ruler,
  'pocket-knife': PocketKnife,
  'ruler-dimension-line': RulerDimensionLine,
  nut: Nut,
  grip: Grip,
  scissors: Scissors,
  file: File,
  'pencil-ruler': PencilRuler,
  anvil: Anvil,
  axe: Axe,
  flashlight: Flashlight,
  glasses: Glasses,
  briefcase: Briefcase,
  boxes: Boxes,
}

function ToolIllustration({ type }: { type: Tool['illustration'] }) {
  const Glyph = toolGlyphs[type]
  if (Glyph) {
    return <span className={`tool-glyph tool-glyph-${type}`} aria-hidden="true"><Glyph size={48} strokeWidth={1.5} /></span>
  }

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
  { label: 'My tools', icon: Hammer },
  { label: 'Maintenance', icon: CalendarDays, alert: true },
  { label: 'Parts & stock', icon: Box, alert: true },
  { label: 'Documents', icon: FileText },
]

function App() {
  const { session, error: authSessionError } = useAuthSession(supabaseClient)
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem('benchlog.theme') === 'light' ? 'light' : 'dark',
  )
  const [activeSection, setActiveSection] = useState('Overview')
  const [tools, setTools] = useState(readSavedTools)
  const [stockItems, setStockItems] = useState(readStockItems)
  const [customMaintenanceTasks, setCustomMaintenanceTasks] = useState(readCustomMaintenanceTasks)
  const [completedTaskIds, setCompletedTaskIds] = useState(readCompletedTaskIds)
  const [serviceLogs, setServiceLogs] = useState(readServiceLogs)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local')
  const [syncError, setSyncError] = useState('')
  const [syncReadyFor, setSyncReadyFor] = useState<string | null>(null)
  const [hasLocalBackup, setHasLocalBackup] = useState(false)
  const [syncRetry, setSyncRetry] = useState(0)
  const [loadRetry, setLoadRetry] = useState(0)
  const syncRequest = useRef(0)
  const lastCloudSnapshot = useRef<string | null>(null)
  const userId = session?.user.id ?? null
  const workshopSnapshot = useMemo<WorkshopSnapshot>(() => ({
    tools,
    stockItems,
    customMaintenanceTasks,
    completedTaskIds,
    serviceLogs,
  }), [completedTaskIds, customMaintenanceTasks, serviceLogs, stockItems, tools])
  const workshopSnapshotRef = useRef(workshopSnapshot)

  useEffect(() => {
    workshopSnapshotRef.current = workshopSnapshot
  }, [workshopSnapshot])

  useEffect(() => {
    const retrySync = () => {
      if (userId && syncReadyFor !== userId) setLoadRetry((retry) => retry + 1)
      else setSyncRetry((retry) => retry + 1)
      setSyncError('')
    }
    window.addEventListener('online', retrySync)
    return () => window.removeEventListener('online', retrySync)
  }, [syncReadyFor, userId])

  useEffect(() => {
    const client = supabaseClient
    if (!client || !userId) {
      setSyncReadyFor(null)
      setSyncStatus('local')
      return
    }

    let active = true
    setSyncReadyFor(null)
    setSyncStatus('loading')
    setSyncError('')

    const applyCloudSnapshot = (value: unknown) => {
      if (!active) return
      if (!isWorkshopSnapshot(value)) {
        throw new Error('The saved cloud workshop data is invalid. Your local data was left unchanged.')
      }

      const localSnapshot = workshopSnapshotRef.current
      const cloudSnapshot = removeBundledSampleData(value)
      const localSerialized = serializeSnapshot(localSnapshot)
      const cloudSerialized = serializeSnapshot(cloudSnapshot)
      setHasLocalBackup(localStorage.getItem(`benchlog.local-backups.${userId}`) !== null)

      if (localSerialized !== cloudSerialized) {
        const backupAvailable = backupLocalSnapshot(userId, localSnapshot)
        saveSnapshotToLocalStorage(cloudSnapshot)
        setTools(cloudSnapshot.tools)
        setStockItems(cloudSnapshot.stockItems)
        setCustomMaintenanceTasks(cloudSnapshot.customMaintenanceTasks)
        setCompletedTaskIds(cloudSnapshot.completedTaskIds)
        setServiceLogs(cloudSnapshot.serviceLogs)
        setHasLocalBackup(backupAvailable)
      }

      lastCloudSnapshot.current = serializeSnapshot(value)
      setSyncReadyFor(userId)
      setSyncStatus('synced')
    }

    const loadCloudSnapshot = async () => {
      const { data, error } = await client
        .from('workshop_snapshots')
        .select('data')
        .eq('owner_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!active) return
      if (data) {
        applyCloudSnapshot(data.data)
        return
      }

      const localSnapshot = workshopSnapshotRef.current
      const { error: insertError } = await client
        .from('workshop_snapshots')
        .insert({ owner_id: userId, data: localSnapshot })
      if (!active) return

      if (insertError?.code === '23505') {
        const { data: existing, error: reloadError } = await client
          .from('workshop_snapshots')
          .select('data')
          .eq('owner_id', userId)
          .single()
        if (reloadError) throw reloadError
        applyCloudSnapshot(existing.data)
        return
      }
      if (insertError) throw insertError

      lastCloudSnapshot.current = serializeSnapshot(localSnapshot)
      setSyncReadyFor(userId)
      setSyncStatus('synced')
    }

    void loadCloudSnapshot().catch((error: unknown) => {
      if (!active) return
      console.error('BenchLog could not load workshop data from the cloud.', error)
      setSyncError(error instanceof Error ? error.message : 'Could not load cloud workshop data.')
      setSyncStatus('error')
    })

    return () => {
      active = false
      syncRequest.current += 1
    }
  }, [loadRetry, userId])

  useEffect(() => {
    const client = supabaseClient
    if (!client || !userId || syncReadyFor !== userId) return

    const serializedSnapshot = serializeSnapshot(workshopSnapshot)
    if (serializedSnapshot === lastCloudSnapshot.current) return

    const requestId = ++syncRequest.current
    setSyncStatus('loading')
    setSyncError('')
    const timeout = window.setTimeout(() => {
      const syncSnapshot = async () => {
        try {
          const { error } = await client
            .from('workshop_snapshots')
            .upsert({
              owner_id: userId,
              data: workshopSnapshot,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'owner_id' })
          if (requestId !== syncRequest.current) return
          if (error) {
            console.error('BenchLog could not sync workshop changes.', error)
            setSyncError(error.message)
            setSyncStatus('error')
            return
          }
          lastCloudSnapshot.current = serializedSnapshot
          setSyncStatus('synced')
        } catch (error: unknown) {
          if (requestId !== syncRequest.current) return
          console.error('BenchLog could not sync workshop changes.', error)
          setSyncError(error instanceof Error ? error.message : 'Could not sync workshop changes.')
          setSyncStatus('error')
        }
      }
      void syncSnapshot()
    }, 500)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [syncRetry, syncReadyFor, userId, workshopSnapshot])

  const tasks = useMemo(() => [
    ...customMaintenanceTasks.map((task): ServiceTask => ({
      ...task,
      ...getTaskDue(task.dueAt),
      recurrence: task.recurrence ?? 'none',
      icon: Wrench,
      color: 'mint',
    })),
  ].filter((task) => !completedTaskIds.includes(task.id)), [completedTaskIds, customMaintenanceTasks])
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<'tool' | 'service' | 'stock' | 'maintenance' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<number | 'manual' | null>(null)
  const [serviceNote, setServiceNote] = useState('')
  const [manualServiceTool, setManualServiceTool] = useState(tools[0]?.name ?? '')
  const [profileToolId, setProfileToolId] = useState(readToolIdFromHash)
  const [showRestockOnly, setShowRestockOnly] = useState(false)
  const [taskDueDate, setTaskDueDate] = useState(() => localDateValue(new Date()))

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    localStorage.setItem('benchlog.tools', JSON.stringify(tools))
  }, [tools])

  useEffect(() => {
    localStorage.setItem('benchlog.stock', JSON.stringify(stockItems))
  }, [stockItems])

  useEffect(() => {
    localStorage.setItem('benchlog.custom-maintenance', JSON.stringify(customMaintenanceTasks))
  }, [customMaintenanceTasks])

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
  const accountEmail = session?.user.email ?? null
  const accountInitials = accountEmail ? accountEmail.slice(0, 2).toUpperCase() : 'L'
  const syncStatusLabel = !accountEmail
    ? 'Local-only data'
    : syncStatus === 'loading'
      ? 'Syncing workshop…'
      : syncStatus === 'error'
        ? 'Sync needs attention'
        : 'Workshop synced'
  const syncStatusDetail = !accountEmail
    ? 'Stored in this browser'
    : syncStatus === 'loading'
      ? 'Saving your latest changes'
      : syncStatus === 'error'
        ? 'Cloud changes could not be saved'
        : 'Available across your devices'
  const profileTasks = profileTool ? tasks.filter((task) => task.tool === profileTool.name) : []
  const profileServiceLogs = profileTool ? serviceLogs.filter((log) => log.tool === profileTool.name) : []
  const latestServiceLog = serviceLogs[0]
  const lowStockCount = stockItems.filter((item) => item.quantity <= item.minimum).length
  const restockCount = stockItems.filter((item) => item.onRestockList).length
  const visibleStock = showRestockOnly ? stockItems.filter((item) => item.onRestockList) : stockItems
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
    setManualServiceTool(tools[0]?.name ?? '')
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

  function downloadLocalBackup() {
    if (!userId) return

    const saved = localStorage.getItem(`benchlog.local-backups.${userId}`)
    if (!saved) {
      setToast('No local workshop backup is available on this device.')
      return
    }

    try {
      const value: unknown = JSON.parse(saved)
      if (!Array.isArray(value) || !value.every(isLocalSnapshotBackup)) {
        console.error('The saved local workshop backup has an invalid format.')
        setToast('The local workshop backup could not be downloaded because its data is invalid.')
        return
      }

      const file = new Blob([JSON.stringify({ backups: value }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = 'benchlog-local-backup.json'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setToast('Your local workshop backup was downloaded.')
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      console.error('The saved local workshop backup could not be read.', error)
      setToast('The local workshop backup could not be read.')
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
    const customTask = customMaintenanceTasks.find((item) => item.id === id)
    const recurrence = customTask?.recurrence
    if (recurrence && recurrence !== 'none') {
      setCustomMaintenanceTasks((items) => items.map((item) => item.id === id
        ? { ...item, dueAt: nextDueDate(recurrence, new Date(completedAt)) }
        : item))
    } else {
      setCompletedTaskIds((items) => items.includes(id) ? items : [...items, id])
    }
    setSelectedTask(null)
    setServiceNote('')
    setModal(null)
    setToast(`${task.tool} service logged.`)
  }

  function logUnscheduledService(tool: string, action: string, note: string) {
    if (!tools.some((item) => item.name === tool) || !action.trim()) {
      setToast('Choose a tool and describe the service before saving.')
      return
    }
    const completedAt = new Date().toISOString()
    setServiceLogs((items) => [{
      id: `manual-${crypto.randomUUID()}`,
      taskId: null,
      tool,
      action: action.trim(),
      note: note.trim(),
      completedAt,
    }, ...items])
    setSelectedTask(null)
    setServiceNote('')
    setModal(null)
    setToast(`${tool} service logged.`)
  }

  function adjustStock(itemId: string, change: number) {
    setStockItems((items) => items.map((item) => item.id === itemId
      ? { ...item, quantity: Math.max(0, Math.round((item.quantity + change) * 10) / 10) }
      : item))
  }

  function toggleRestock(itemId: string) {
    const item = stockItems.find((stockItem) => stockItem.id === itemId)
    if (!item) return
    setStockItems((items) => items.map((stockItem) => stockItem.id === itemId
      ? { ...stockItem, onRestockList: !stockItem.onRestockList }
      : stockItem))
    setToast(item.onRestockList ? `${item.name} removed from your restock list.` : `${item.name} added to your restock list.`)
  }

  function addStockItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name')).trim()
    const quantity = Number(formData.get('quantity'))
    const capacity = Number(formData.get('capacity'))
    const minimum = Number(formData.get('minimum'))
    const unit = String(formData.get('unit')).trim()
    if (!name || !unit || !Number.isFinite(quantity) || !Number.isFinite(capacity) || !Number.isFinite(minimum) ||
      quantity < 0 || capacity <= 0 || minimum < 0 || minimum > capacity) {
      setToast('Enter a name and valid stock amounts. The low-stock threshold must not exceed capacity.')
      return
    }
    const item: StockItem = {
      id: `ST-${crypto.randomUUID()}`,
      name,
      location: String(formData.get('location')).trim() || 'Workshop',
      quantity,
      capacity,
      minimum,
      unit,
      step: unit === 'kg' ? 0.1 : 1,
      onRestockList: false,
    }
    setStockItems((items) => [...items, item])
    setShowRestockOnly(false)
    setModal(null)
    setToast(`${name} added to workshop stock.`)
  }

  function addMaintenanceTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const action = String(formData.get('action')).trim()
    const tool = String(formData.get('tool'))
    const dueAt = String(formData.get('dueAt'))
    const recurrence = String(formData.get('recurrence'))
    if (!action || !tools.some((item) => item.name === tool) ||
      !isValidLocalDate(dueAt) ||
      !isMaintenanceRecurrence(recurrence)) {
      setToast('Enter a task, choose a workshop tool, and set a valid due date.')
      return
    }
    const id = Math.max(
      0,
      ...customMaintenanceTasks.map((task) => task.id),
      ...completedTaskIds,
      ...serviceLogs.flatMap((log) => log.taskId === null ? [] : [log.taskId]),
    ) + 1
    setCustomMaintenanceTasks((items) => [...items, { id, action, tool, dueAt, recurrence }])
    setActiveSection('Maintenance')
    setModal(null)
    setToast(`Maintenance reminder added for ${tool}.`)
  }

  function removeMaintenanceTask(taskId: number) {
    setCustomMaintenanceTasks((items) => items.filter((task) => task.id !== taskId))
    setToast('Maintenance reminder removed.')
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

        <button className="workshop-switcher" type="button" onClick={() => setAccountOpen(true)}>
          <span className="workshop-avatar">{accountInitials}</span>
          <span className="workshop-copy"><strong>{accountEmail ? 'Your workshop' : 'Local workshop'}</strong><small>{accountEmail ?? 'Personal space'}</small></span>
          <ChevronDown size={15} />
        </button>

        <span className="nav-heading">WORKSPACE</span>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon, alert }) => {
            const badgeCount = label === 'My tools'
              ? String(tools.length)
              : label === 'Maintenance'
                ? String(tasks.length)
                : label === 'Parts & stock'
                  ? String(lowStockCount)
                  : undefined
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
            <div><strong>{syncStatusLabel}</strong><span>{syncStatusDetail}</span></div>
            <span aria-label={syncStatus} className={`online-dot sync-dot sync-dot-${syncStatus}`} />
          </div>
          <button className="nav-link quiet-link" type="button" onClick={() => setToast('Settings are coming to your workshop.')}>
            <CircleHelp size={17} /><span>Help & feedback</span><ArrowUpRight size={14} className="quiet-arrow" />
          </button>
          <button className="profile-button" type="button" onClick={() => setAccountOpen(true)}>
            <span className="profile-avatar">{accountInitials}</span>
            <span className="profile-copy"><strong>{accountEmail ?? 'Sign in'}</strong><small>{accountEmail ? 'Account settings' : 'Enable cloud sync'}</small></span>
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
            <button className="icon-button" aria-label={accountEmail ? 'Account settings' : 'Sign in'} onClick={() => setAccountOpen(true)} type="button">
              <UserRound size={17} />
            </button>
            <button className="add-button top-add" onClick={() => setModal('tool')} type="button"><Plus size={16} /> Add a tool</button>
            <AnimatePresence>
              {notificationOpen && (
                <motion.div className="notification-popover" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <strong>You’re all set</strong>
                  <span>{tasks.length === 0 ? 'No maintenance reminders are scheduled yet.' : `${tasks.length} maintenance ${tasks.length === 1 ? 'reminder is' : 'reminders are'} scheduled.`}</span>
                  {tasks.length > 0 && <button type="button" onClick={() => { setNotificationOpen(false); selectNavigation('Maintenance') }}>View maintenance <ArrowRight size={14} /></button>}
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
              <p>{tools.length} {tools.length === 1 ? 'tool' : 'tools'} in your workshop. {tasks.length} {tasks.length === 1 ? 'reminder' : 'reminders'} to keep track of.<br />Add your workshop details to get started.</p>
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
            </div>
            <div className="hero-footer"><span><span className="hero-footer-dot" /> YOUR BENCH, IN GOOD SHAPE</span><span>GOOD WORK STARTS HERE <ArrowDownRight size={13} /></span></div>
          </motion.section>

          <section className="stats-grid" aria-label="Workshop summary">
            <motion.article className="stat-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <GlassSurface active={theme === 'dark'} />
              <span className="stat-label">IN YOUR WORKSHOP <Hammer size={15} /></span>
              <div className="stat-value">{tools.length}<span>tools</span></div>
              <div className="stat-foot"><span className="positive-dot" /> {tools.length === 0 ? 'Add your first tool to begin' : 'Everything where it belongs'} <ArrowUpRight size={13} /></div>
            </motion.article>
            <motion.article className="stat-card stat-card-due" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <GlassSurface active={theme === 'dark'} />
              <span className="stat-label">NEEDS A LITTLE LOVE <Clock3 size={15} /></span>
              <div className="stat-value">{tasks.length}<span>tasks</span></div>
              <div className="stat-foot"><span className="due-dot" /> {tasks.some((task) => task.state === 'Overdue') ? 'One is a little overdue' : tasks.length === 0 ? 'No reminders scheduled' : 'You’re all caught up'} <ArrowUpRight size={13} /></div>
            </motion.article>
            <motion.article className="stat-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <GlassSurface active={theme === 'dark'} />
              <span className="stat-label">PARTS & MATERIALS <Box size={15} /></span>
              <div className="stat-value">{lowStockCount}<span>running low</span></div>
              <div className="stat-foot"><span className="stock-dot" /> {restockCount} on your restock list <ArrowUpRight size={13} /></div>
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
                <div className="maintenance-heading-actions">
                  <button className="text-button" onClick={() => selectNavigation('Maintenance')} type="button">All maintenance <ArrowRight size={14} /></button>
                  <button className="filter-button" onClick={() => { setTaskDueDate(localDateValue(new Date())); setModal('maintenance') }} type="button"><Plus size={14} /> Add reminder</button>
                </div>
              </div>
              <div className="task-list">
                {visibleTasks.length === 0 && (
                  <div className="all-done">
                    <span><Check size={18} /></span>
                    <strong>{tools.length === 0 ? 'Add a tool to get started.' : 'No maintenance reminders yet.'}</strong>
                    <p>{tools.length === 0 ? 'Add a workshop tool before scheduling maintenance.' : 'Your scheduled maintenance will appear here.'}</p>
                    {tools.length > 0 && <button className="text-button" onClick={() => { setTaskDueDate(localDateValue(new Date())); setModal('maintenance') }} type="button"><Plus size={14} /> Add reminder</button>}
                  </div>
                )}
                {visibleTasks.map((task, index) => {
                  const Icon = task.icon
                  return (
                    <motion.article className="task-row" key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}>
                      <span className={`task-icon ${task.color}`}><Icon size={17} strokeWidth={1.8} /></span>
                      <div className="task-main">
                        <strong>{task.action}</strong>
                        <span>{task.tool}{task.recurrence && task.recurrence !== 'none' ? ` · Repeats ${task.recurrence}` : ''}</span>
                      </div>
                      <span className={`task-due ${task.state === 'Overdue' ? 'due-overdue' : ''}`}>{task.due}</span>
                      <button className="task-done" aria-label={`Log service: ${task.action}`} onClick={() => openService(task.id)} type="button"><Check size={15} /><span>Log it</span></button>
                      {customMaintenanceTasks.some((customTask) => customTask.id === task.id) && (
                        <button className="task-remove" aria-label={`Remove reminder: ${task.action}`} onClick={() => removeMaintenanceTask(task.id)} type="button"><Trash2 size={13} /></button>
                      )}
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
              <div className="panel-heading stock-heading">
                <div><span className="section-eyebrow">BEFORE YOU RUN OUT</span><h2>On the shelf</h2></div>
                <div className="stock-heading-actions">
                  <button className="filter-button" aria-label={showRestockOnly ? 'Show all stock' : 'Show restock list'} onClick={() => setShowRestockOnly((show) => !show)} type="button"><Filter size={14} /></button>
                  <button className="filter-button" onClick={() => setModal('stock')} type="button"><Plus size={14} /> Add item</button>
                </div>
              </div>
              {visibleStock.length > 0 ? visibleStock.map((item, index) => {
                const isLow = item.quantity <= item.minimum
                const quantityLabel = item.unit === 'kg' ? item.quantity.toFixed(1) : String(item.quantity)
                const capacityLabel = item.unit === 'kg' ? item.capacity.toFixed(1) : String(item.capacity)
                const progress = Math.min(100, (item.quantity / item.capacity) * 100)
                return (
                  <div className="stock-entry" key={item.id}>
                    {index > 0 && <div className="stock-divider" />}
                    <div className="stock-item">
                      <span className={`stock-image ${item.unit === 'kg' ? 'filament' : 'filter'}`}>
                        {item.unit === 'kg' ? <span /> : item.name.toLowerCase().includes('filter') ? <LifeBuoy size={19} strokeWidth={1.5} /> : <Box size={18} strokeWidth={1.5} />}
                      </span>
                      <div className="stock-info"><strong>{item.name}</strong><span>{item.location}</span></div>
                      <div className="stock-quantity">
                        <strong>{quantityLabel} <small>{item.unit}</small></strong>
                        <span>of {capacityLabel} {item.unit}</span>
                        <div className="stock-controls">
                          <button aria-label={`Use ${item.step} ${item.unit} of ${item.name}`} disabled={item.quantity === 0} onClick={() => adjustStock(item.id, -item.step)} type="button"><Minus size={11} /></button>
                          <button aria-label={`Receive ${item.step} ${item.unit} of ${item.name}`} onClick={() => adjustStock(item.id, item.step)} type="button"><Plus size={11} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="stock-progress"><span className={item.unit === 'kg' ? 'progress-filament' : 'progress-filter'} style={{ width: `${progress}%` }} /></div>
                    <div className="stock-status">
                      <span className={`status-pill ${isLow ? item.quantity === 0 ? 'status-low' : 'status-soon' : 'status-good'}`}><span />{item.quantity === 0 ? 'Out of stock' : isLow ? 'Running low' : 'In good shape'}</span>
                      <button aria-pressed={item.onRestockList} type="button" onClick={() => toggleRestock(item.id)}>{item.onRestockList ? 'On restock list' : 'Add to list'} <ArrowUpRight size={13} /></button>
                    </div>
                  </div>
                )
              }) : (
                <div className="stock-empty"><Check size={16} /><span>{stockItems.length === 0 ? 'No parts or materials added yet.' : 'Your restock list is clear.'}</span></div>
              )}
              <button className="stock-all" type="button" onClick={() => setShowRestockOnly((show) => !show)}>
                {showRestockOnly ? `Show all ${stockItems.length} parts & materials` : `Restock list · ${restockCount} ${restockCount === 1 ? 'item' : 'items'}`} <ArrowRight size={14} />
              </button>
            </section>
          </div>

          <section className="panel tools-panel" id="tools">
            <GlassSurface active={theme === 'dark'} />
            <div className="panel-heading tools-heading">
              <div><span className="section-eyebrow">GOOD COMPANY</span><h2>Tools you love</h2></div>
              <div className="tools-actions"><span className="tool-count">{filteredTools.length} of {tools.length} tools</span><button className="filter-button" type="button" onClick={() => setToast('Showing tools from your whole workshop.')}><Filter size={14} /> Filter</button><button className="icon-button tools-arrow" aria-label="See all tools" onClick={() => selectNavigation('My tools')} type="button"><ArrowRight size={16} /></button></div>
            </div>
            {filteredTools.length === 0 ? (
              <div className="empty-search">
                <Search size={19} />
                <strong>{tools.length === 0 ? 'No tools added yet' : 'No tools found'}</strong>
                <span>{tools.length === 0 ? 'Add your first tool to start building your workshop.' : 'Try another name, category, or location.'}</span>
                {tools.length === 0 && <button className="add-button" onClick={() => setModal('tool')} type="button"><Plus size={15} /> Add a tool</button>}
              </div>
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
                          <div><strong>{task.action}</strong><span>{task.due}{task.recurrence && task.recurrence !== 'none' ? ` · Repeats ${task.recurrence}` : ''}</span></div>
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
              <div className="modal-heading"><div><span className="section-eyebrow">{modal === 'tool' ? 'MAKE IT PART OF THE WORKSHOP' : modal === 'stock' ? 'KEEP THE SHELF IN CHECK' : modal === 'maintenance' ? 'STAY AHEAD OF THE NEXT PROJECT' : 'A LITTLE CARE GOES A LONG WAY'}</span><h2>{modal === 'tool' ? 'Add a tool' : modal === 'stock' ? 'Add stock item' : modal === 'maintenance' ? 'Add maintenance reminder' : 'Log a service'}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)} type="button"><X size={18} /></button></div>
              {modal === 'tool' ? (
                <form className="modal-form" onSubmit={addTool}>
                  <label>Tool name<input autoFocus name="name" placeholder="e.g. Bandsaw" required /></label>
                  <label>Category<select name="category" defaultValue="Woodworking"><option>Woodworking</option><option>3D printing</option><option>Metalworking</option><option>Electronics</option><option>Other</option></select></label>
                  <label>Make & model<input name="model" placeholder="e.g. Laguna · 14|BX" /></label>
                  <label>Where does it live?<input name="location" placeholder="e.g. East wall" /></label>
                  <div className="modal-actions"><button className="cancel-button" onClick={() => setModal(null)} type="button">Not now</button><button className="add-button" type="submit"><Plus size={15} /> Add to workshop</button></div>
                </form>
              ) : modal === 'stock' ? (
                <form className="modal-form" onSubmit={addStockItem}>
                  <label>Item name<input autoFocus name="name" placeholder="e.g. Sandpaper sheets" required /></label>
                  <label>Stored with / location<input name="location" placeholder="e.g. Finishing cabinet" /></label>
                  <div className="stock-form-row">
                    <label>Current quantity<input name="quantity" type="number" min="0" step="any" defaultValue="0" required /></label>
                    <label>Unit<select name="unit" defaultValue="pcs"><option value="pcs">pieces (pcs)</option><option value="kg">kilograms (kg)</option><option value="L">liters (L)</option><option value="m">meters (m)</option></select></label>
                  </div>
                  <div className="stock-form-row">
                    <label>Capacity<input name="capacity" type="number" min="0.01" step="any" defaultValue="1" required /></label>
                    <label>Low-stock threshold<input name="minimum" type="number" min="0" step="any" defaultValue="0" required /></label>
                  </div>
                  <p className="stock-form-hint">We’ll flag this item when its quantity reaches the low-stock threshold.</p>
                  <div className="modal-actions"><button className="cancel-button" onClick={() => setModal(null)} type="button">Not now</button><button className="add-button" type="submit"><Plus size={15} /> Add to stock</button></div>
                </form>
              ) : modal === 'maintenance' ? (
                tools.length > 0 ? (
                  <form className="modal-form" onSubmit={addMaintenanceTask}>
                    <label>What needs doing?<input autoFocus name="action" placeholder="e.g. Clean the dust filter" required /></label>
                    <label>Which tool?
                      <select name="tool" defaultValue="" required>
                        <option value="" disabled>Choose a tool</option>
                        {tools.map((tool) => <option key={tool.id} value={tool.name}>{tool.name}</option>)}
                      </select>
                    </label>
                    <label>Due date<input name="dueAt" type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} required /></label>
                    <label>Repeat
                      <select name="recurrence" defaultValue="none">
                        <option value="none">Does not repeat</option>
                        <option value="weekly">Every week</option>
                        <option value="monthly">Every month</option>
                        <option value="quarterly">Every 3 months</option>
                        <option value="yearly">Every year</option>
                      </select>
                    </label>
                    <div className="modal-actions"><button className="cancel-button" onClick={() => setModal(null)} type="button">Not now</button><button className="add-button" type="submit"><CalendarDays size={15} /> Save reminder</button></div>
                  </form>
                ) : (
                  <div className="form-empty-state">
                    <p>Add a tool to your workshop first. Then you can attach maintenance reminders to it.</p>
                    <button className="add-button" onClick={() => setModal('tool')} type="button"><Plus size={15} /> Add a tool</button>
                  </div>
                )
              ) : (
                tools.length === 0 ? (
                  <div className="form-empty-state">
                    <p>Add a tool to your workshop before logging a service.</p>
                    <button className="add-button" onClick={() => setModal('tool')} type="button"><Plus size={15} /> Add a tool</button>
                  </div>
                ) : <form className="service-form" onSubmit={(event) => {
                  event.preventDefault()
                  if (selectedTask === null) {
                    setToast('Pick a task to add it to your service history.')
                    return
                  }
                  if (selectedTask === 'manual') {
                    const formData = new FormData(event.currentTarget)
                    logUnscheduledService(
                      manualServiceTool,
                      String(formData.get('action') ?? ''),
                      serviceNote,
                    )
                    return
                  }
                  completeService(selectedTask, serviceNote)
                }}>
                  <label>What did you work on?<select value={selectedTask ?? ''} onChange={(event) => {
                    const value = event.target.value
                    setSelectedTask(value === 'manual' ? 'manual' : Number(value) || null)
                  }}><option value="">Pick a maintenance task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.tool} — {task.action}</option>)}<option value="manual">Other service (no reminder)</option></select></label>
                  {selectedTask === 'manual' && (
                    <>
                      <label>Which tool?<select value={manualServiceTool} onChange={(event) => setManualServiceTool(event.target.value)} required><option value="" disabled>Choose a tool</option>{tools.map((tool) => <option key={tool.id} value={tool.name}>{tool.name}</option>)}</select></label>
                      <label>Service performed<input autoFocus name="action" placeholder="e.g. Replaced the drive belt" required /></label>
                    </>
                  )}
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
      {accountOpen && (
        <AccountDialog
          client={supabaseClient}
          hasLocalBackup={hasLocalBackup}
          onDownloadBackup={downloadLocalBackup}
          onClose={() => setAccountOpen(false)}
          onRetrySync={() => {
            if (userId && syncReadyFor !== userId) setLoadRetry((retry) => retry + 1)
            else setSyncRetry((retry) => retry + 1)
            setSyncError('')
          }}
          sessionError={authSessionError}
          syncError={syncError}
          syncStatus={syncStatus}
          user={session?.user ?? null}
        />
      )}
    </div>
  )
}

export default App
