import type { ChangeEvent } from 'react'
import type { Mode } from './Canvas'

interface ToolbarProps {
  mode: Mode
  setMode: (mode: Mode) => void
  title: string
  setTitle: (t: string) => void
  onDeleteSelected: () => void
  hasSelection: boolean
  onExport: () => void
  onImportFile: (file: File) => void
  onReset: () => void
}

const buttonBase: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
}

export function Toolbar({
  mode,
  setMode,
  title,
  setTitle,
  onDeleteSelected,
  hasSelection,
  onExport,
  onImportFile,
  onReset,
}: ToolbarProps) {
  function modeButton(m: Mode, label: string) {
    const active = mode === m
    return (
      <button
        style={{ ...buttonBase, background: active ? '#2563eb' : '#fff', color: active ? '#fff' : '#1f1f1f', borderColor: active ? '#2563eb' : '#ccc' }}
        onClick={() => setMode(m)}
      >
        {label}
      </button>
    )
  }

  function handleImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onImportFile(file)
    e.target.value = ''
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid #ddd',
        flexWrap: 'wrap',
        background: '#fafafa',
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ fontSize: 15, fontWeight: 600, border: '1px solid transparent', padding: '4px 6px', minWidth: 160 }}
        onFocus={(e) => (e.target.style.borderColor = '#ccc')}
        onBlur={(e) => (e.target.style.borderColor = 'transparent')}
      />
      <div style={{ width: 1, height: 24, background: '#ddd' }} />
      {modeButton('select', 'Select / Move')}
      {modeButton('add-male', '+ Male')}
      {modeButton('add-female', '+ Female')}
      {modeButton('add-unknown', '+ Unknown')}
      {modeButton('link-partner', 'Link Partners')}
      {modeButton('link-child', 'Link Parent → Child')}
      {modeButton('link-sibling', 'Link Siblings')}
      <div style={{ width: 1, height: 24, background: '#ddd' }} />
      <button style={buttonBase} disabled={!hasSelection} onClick={onDeleteSelected}>
        Delete Selected
      </button>
      <div style={{ flex: 1 }} />
      <button style={buttonBase} onClick={onExport}>Export JSON</button>
      <label style={{ ...buttonBase, display: 'inline-block' }}>
        Import JSON
        <input type="file" accept="application/json" onChange={handleImportChange} style={{ display: 'none' }} />
      </label>
      <button style={buttonBase} onClick={onReset}>New / Clear</button>
    </div>
  )
}
