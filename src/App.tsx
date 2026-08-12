import { useState } from 'react'
import { Canvas, type Mode } from './components/Canvas'
import { Toolbar } from './components/Toolbar'
import { DetailPanel } from './components/DetailPanel'
import { useGenogramStore } from './state/useGenogramStore'
import { useIsMobile } from './hooks/useIsMobile'
import { downloadGenogram, readGenogramFile } from './utils/storage'
import type { Selection } from './types'

export default function App() {
  const store = useGenogramStore()
  const { state } = store
  const isMobile = useIsMobile()
  const [mode, setMode] = useState<Mode>('select')
  const [selection, setSelection] = useState<Selection>({ kind: null, id: null })

  function handleDeleteSelected() {
    if (selection.kind === 'person' && selection.id) store.deletePerson(selection.id)
    if (selection.kind === 'union' && selection.id) store.deleteUnion(selection.id)
    if (selection.kind === 'child-link' && selection.id && selection.childId) {
      store.removeChildFromUnion(selection.id, selection.childId)
    }
    if (selection.kind === 'sibling-link' && selection.id) store.deleteSiblingLink(selection.id)
    setSelection({ kind: null, id: null })
  }

  function handleImportFile(file: File) {
    readGenogramFile(file)
      .then((data) => {
        store.load(data)
        setSelection({ kind: null, id: null })
      })
      .catch((err) => alert(`Could not import file: ${err.message ?? err}`))
  }

  function handleReset() {
    if (state.people.length === 0 || confirm('Clear the current genogram? This cannot be undone.')) {
      store.reset()
      setSelection({ kind: null, id: null })
    }
  }

  const closeDetail = () => setSelection({ kind: null, id: null })

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <Toolbar
        mode={mode}
        setMode={(m) => setMode(m)}
        title={state.title}
        setTitle={store.setTitle}
        onDeleteSelected={handleDeleteSelected}
        hasSelection={selection.kind !== null}
        onExport={() => downloadGenogram(state)}
        onImportFile={handleImportFile}
        onReset={handleReset}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            store={store}
            mode={mode}
            onModeConsumed={() => setMode('select')}
            selection={selection}
            onSelect={setSelection}
          />
          {state.people.length === 0 && (
            <div style={hintStyle}>
              Use the toolbar to add your first person, then use "Link Partners" and "Link Parent → Child" to build out the tree.
            </div>
          )}
        </div>
        {!isMobile && <DetailPanel store={store} selection={selection} onSelect={setSelection} />}
      </div>
      {isMobile && selection.kind !== null && (
        <>
          <div style={backdropStyle} onClick={closeDetail} />
          <DetailPanel store={store} selection={selection} onSelect={setSelection} isMobile onClose={closeDetail} />
        </>
      )}
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  zIndex: 40,
}

const hintStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  maxWidth: 320,
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 13,
  color: '#444',
  pointerEvents: 'none',
}
