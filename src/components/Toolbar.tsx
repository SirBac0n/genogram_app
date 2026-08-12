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
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 14px',
  minHeight: 40,
  fontSize: 13,
  fontFamily: 'inherit',
  lineHeight: 'normal',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  appearance: 'none',
  WebkitAppearance: 'none',
  touchAction: 'manipulation',
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
    <div style={{ borderBottom: '1px solid #ddd', background: '#fafafa' }}>
      <div style={{ padding: '8px 12px 4px' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            fontSize: 16,
            fontWeight: 600,
            border: '1px solid transparent',
            padding: '6px 8px',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#ccc')}
          onBlur={(e) => (e.target.style.borderColor = 'transparent')}
        />
      </div>
      <div
        className="toolbar-scroll"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px 10px',
          overflowX: 'auto',
        }}
      >
        {modeButton('select', 'Select / Move')}
        {modeButton('add-male', '+ Male')}
        {modeButton('add-female', '+ Female')}
        {modeButton('add-unknown', '+ Unknown')}
        {modeButton('link-partner', 'Link Partners')}
        {modeButton('link-child', 'Link Parent → Child')}
        {modeButton('link-sibling', 'Link Siblings')}
        <div style={{ width: 1, height: 24, background: '#ddd', flexShrink: 0 }} />
        <button style={buttonBase} disabled={!hasSelection} onClick={onDeleteSelected}>
          Delete Selected
        </button>
        <div style={{ width: 1, height: 24, background: '#ddd', flexShrink: 0 }} />
        <button style={buttonBase} onClick={onExport}>Export JSON</button>
        <label style={buttonBase}>
          Import JSON
          <input type="file" accept="application/json" onChange={handleImportChange} style={{ display: 'none' }} />
        </label>
        <button style={buttonBase} onClick={onReset}>New / Clear</button>
      </div>
    </div>
  )
}
