import { useState } from 'react'
import type { ChildLinkType, ConditionCategory, Genogram, RelationshipQuality, Selection, Sex, UnionType } from '../types'
import type { useGenogramStore } from '../state/useGenogramStore'

interface DetailPanelProps {
  store: ReturnType<typeof useGenogramStore>
  selection: Selection
  onSelect: (selection: Selection) => void
  isMobile?: boolean
  onClose?: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 7px',
  fontSize: 13,
  border: '1px solid #ccc',
  borderRadius: 4,
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: '#666', marginBottom: 3, display: 'block', marginTop: 10 }

export function DetailPanel({ store, selection, onSelect, isMobile = false, onClose = () => {} }: DetailPanelProps) {
  const { state } = store
  const [newConditionLabel, setNewConditionLabel] = useState('')
  const [newConditionCategory, setNewConditionCategory] = useState<ConditionCategory>('medical')

  if (selection.kind === 'person' && selection.id) {
    const person = state.people.find((p) => p.id === selection.id)
    if (!person) return <EmptyPanel isMobile={isMobile} onClose={onClose} />
    const relatedUnions = state.unions.filter((u) => u.partnerIds.includes(person.id))
    const parentUnions = state.unions.filter((u) => u.children.some((c) => c.childId === person.id))
    const siblingLinksForPerson = state.siblingLinks.filter(
      (l) => l.personAId === person.id || l.personBId === person.id,
    )

    return (
      <PanelShell isMobile={isMobile} onClose={onClose}>
        <h3 style={{ margin: '0 0 4px' }}>Person</h3>
        <label style={labelStyle}>First name</label>
        <input style={inputStyle} value={person.firstName} onChange={(e) => store.updatePerson(person.id, { firstName: e.target.value })} />
        <label style={labelStyle}>Last name</label>
        <input style={inputStyle} value={person.lastName} onChange={(e) => store.updatePerson(person.id, { lastName: e.target.value })} />
        <label style={labelStyle}>Sex</label>
        <select style={inputStyle} value={person.sex} onChange={(e) => store.updatePerson(person.id, { sex: e.target.value as Sex })}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="unknown">Unknown</option>
        </select>
        <label style={labelStyle}>Birth date</label>
        <input type="date" style={inputStyle} value={person.birthDate ?? ''} onChange={(e) => store.updatePerson(person.id, { birthDate: e.target.value || undefined })} />
        <label style={labelStyle}>Death date</label>
        <input type="date" style={inputStyle} value={person.deathDate ?? ''} onChange={(e) => store.updatePerson(person.id, { deathDate: e.target.value || undefined })} />
        <label style={labelStyle}>Notes</label>
        <textarea style={{ ...inputStyle, minHeight: 60 }} value={person.notes ?? ''} onChange={(e) => store.updatePerson(person.id, { notes: e.target.value })} />

        <div style={{ marginTop: 10 }}>
          <button
            style={{ ...smallButtonStyle, background: person.isProband ? '#2563eb' : '#fff', color: person.isProband ? '#fff' : '#1f1f1f' }}
            onClick={() => store.setProband(person.id)}
          >
            {person.isProband ? 'Proband (index person)' : 'Mark as Proband'}
          </button>
        </div>

        <label style={labelStyle}>Conditions / markers</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {person.conditions.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: categoryColor(c.category), display: 'inline-block' }} />
              <span style={{ flex: 1 }}>{c.label} <em style={{ color: '#999' }}>({c.category})</em></span>
              <button style={xButtonStyle} onClick={() => store.removeCondition(person.id, c.id)}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="e.g. Depression"
            value={newConditionLabel}
            onChange={(e) => setNewConditionLabel(e.target.value)}
          />
          <select style={{ ...inputStyle, width: 100 }} value={newConditionCategory} onChange={(e) => setNewConditionCategory(e.target.value as ConditionCategory)}>
            <option value="medical">Medical</option>
            <option value="psychological">Psych</option>
            <option value="substance">Substance</option>
            <option value="other">Other</option>
          </select>
          <button
            style={smallButtonStyle}
            onClick={() => {
              if (!newConditionLabel.trim()) return
              store.addCondition(person.id, newConditionLabel.trim(), newConditionCategory)
              setNewConditionLabel('')
            }}
          >
            Add
          </button>
        </div>

        {relatedUnions.length > 0 && (
          <>
            <label style={labelStyle}>Partners</label>
            {relatedUnions.map((u) => (
              <div key={u.id} style={{ fontSize: 12, marginBottom: 6, padding: 6, border: '1px solid #eee', borderRadius: 4 }}>
                <button style={linkButtonStyle} onClick={() => onSelect({ kind: 'union', id: u.id })}>
                  {u.partnerIds.filter((id) => id !== person.id).map((id) => personName(state, id)).join(', ') || '—'}
                  {' '}({u.type}){u.quality ? ` · ${QUALITY_LABELS[u.quality]}` : ''}
                </button>
                {u.children.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    Children:
                    {u.children.map((c) => (
                      <span key={c.childId} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
                        <button style={linkButtonStyle} onClick={() => onSelect({ kind: 'child-link', id: u.id, childId: c.childId })}>
                          {personName(state, c.childId)}{c.quality ? ` · ${QUALITY_LABELS[c.quality]}` : ''}
                        </button>
                        <button style={xButtonStyle} onClick={() => store.removeChildFromUnion(u.id, c.childId)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {parentUnions.length > 0 && (
          <>
            <label style={labelStyle}>Parents</label>
            {parentUnions.map((u) => {
              const link = u.children.find((c) => c.childId === person.id)
              if (!link) return null
              return (
                <div key={u.id} style={{ fontSize: 12, marginBottom: 4 }}>
                  <button style={linkButtonStyle} onClick={() => onSelect({ kind: 'child-link', id: u.id, childId: person.id })}>
                    {u.partnerIds.map((id) => personName(state, id)).join(' & ') || 'Unknown'}
                    {' '}({link.type}){link.quality ? ` · ${QUALITY_LABELS[link.quality]}` : ''}
                  </button>
                </div>
              )
            })}
          </>
        )}

        {siblingLinksForPerson.length > 0 && (
          <>
            <label style={labelStyle}>Siblings</label>
            {siblingLinksForPerson.map((l) => {
              const otherId = l.personAId === person.id ? l.personBId : l.personAId
              return (
                <div key={l.id} style={{ fontSize: 12, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button style={linkButtonStyle} onClick={() => onSelect({ kind: 'sibling-link', id: l.id })}>
                    {personName(state, otherId)}{l.quality ? ` · ${QUALITY_LABELS[l.quality]}` : ''}
                  </button>
                  <button style={xButtonStyle} onClick={() => store.deleteSiblingLink(l.id)}>×</button>
                </div>
              )
            })}
          </>
        )}
      </PanelShell>
    )
  }

  if (selection.kind === 'union' && selection.id) {
    const union = state.unions.find((u) => u.id === selection.id)
    if (!union) return <EmptyPanel isMobile={isMobile} onClose={onClose} />
    return (
      <PanelShell isMobile={isMobile} onClose={onClose}>
        <h3 style={{ margin: '0 0 4px' }}>Relationship</h3>
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          {union.partnerIds.map((id) => personName(state, id)).join(' & ')}
        </div>
        <label style={labelStyle}>Type</label>
        <select style={inputStyle} value={union.type} onChange={(e) => store.updateUnionType(union.id, e.target.value as UnionType)}>
          <option value="married">Married</option>
          <option value="partnered">Partnered / Cohabiting</option>
          <option value="separated">Separated</option>
          <option value="divorced">Divorced</option>
          <option value="affair">Affair</option>
        </select>

        {union.partnerIds.length === 2 && (
          <>
            <label style={labelStyle}>Relationship quality</label>
            <select
              style={inputStyle}
              value={union.quality ?? ''}
              onChange={(e) => store.updateUnionQuality(union.id, (e.target.value || undefined) as RelationshipQuality | undefined)}
            >
              <option value="">None</option>
              <option value="distant">Distant / Poor</option>
              <option value="cutoff">Cutoff / Estranged</option>
              <option value="conflict">Conflict</option>
              <option value="enmeshed">Enmeshed</option>
              <option value="abuse">Abuse</option>
            </select>
          </>
        )}

        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60 }}
          value={union.notes ?? ''}
          onChange={(e) => store.updateUnionNotes(union.id, e.target.value)}
        />

        {union.children.length > 0 && (
          <>
            <label style={labelStyle}>Children</label>
            {union.children.map((c) => (
              <div key={c.childId} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <button
                  style={linkButtonStyle}
                  onClick={() => onSelect({ kind: 'child-link', id: union.id, childId: c.childId })}
                >
                  {personName(state, c.childId)} ({c.type}){c.quality ? ` · ${QUALITY_LABELS[c.quality]}` : ''}
                </button>
                <button style={xButtonStyle} onClick={() => store.removeChildFromUnion(union.id, c.childId)}>×</button>
              </div>
            ))}
          </>
        )}

        <button
          style={{ ...dangerButtonStyle, marginTop: 14 }}
          onClick={() => {
            if (
              union.children.length === 0 ||
              confirm(
                `Delete this relationship? ${union.children.length} ${union.children.length === 1 ? 'child link' : 'child links'} to this union will also be removed.`,
              )
            ) {
              store.deleteUnion(union.id)
              onSelect({ kind: null, id: null })
              if (isMobile) onClose()
            }
          }}
        >
          Delete This Relationship
        </button>
      </PanelShell>
    )
  }

  if (selection.kind === 'child-link' && selection.id && selection.childId) {
    const union = state.unions.find((u) => u.id === selection.id)
    const link = union?.children.find((c) => c.childId === selection.childId)
    if (!union || !link) return <EmptyPanel isMobile={isMobile} onClose={onClose} />
    const parentNames = union.partnerIds.map((id) => personName(state, id)).join(' & ') || 'Unknown parent'

    return (
      <PanelShell isMobile={isMobile} onClose={onClose}>
        <button style={linkButtonStyle} onClick={() => onSelect({ kind: 'union', id: union.id })}>
          ← Back to relationship
        </button>
        <h3 style={{ margin: '10px 0 4px' }}>Parent–Child Relationship</h3>
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          {parentNames} → {personName(state, link.childId)}
        </div>
        <label style={labelStyle}>Link type</label>
        <select
          style={inputStyle}
          value={link.type}
          onChange={(e) => store.updateChildLinkType(union.id, link.childId, e.target.value as ChildLinkType)}
        >
          <option value="biological">Biological</option>
          <option value="adopted">Adopted</option>
          <option value="foster">Foster</option>
        </select>

        <label style={labelStyle}>Relationship quality</label>
        <select
          style={inputStyle}
          value={link.quality ?? ''}
          onChange={(e) =>
            store.updateChildLinkQuality(union.id, link.childId, (e.target.value || undefined) as RelationshipQuality | undefined)
          }
        >
          <option value="">None</option>
          <option value="distant">Distant / Poor</option>
          <option value="cutoff">Cutoff / Estranged</option>
          <option value="conflict">Conflict</option>
          <option value="enmeshed">Enmeshed</option>
          <option value="abuse">Abuse</option>
        </select>

        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60 }}
          value={link.notes ?? ''}
          onChange={(e) => store.updateChildLinkNotes(union.id, link.childId, e.target.value)}
        />

        <button
          style={{ ...dangerButtonStyle, marginTop: 14 }}
          onClick={() => {
            store.removeChildFromUnion(union.id, link.childId)
            onSelect({ kind: 'union', id: union.id })
          }}
        >
          Remove This Parent–Child Link
        </button>
      </PanelShell>
    )
  }

  if (selection.kind === 'sibling-link' && selection.id) {
    const link = state.siblingLinks.find((l) => l.id === selection.id)
    if (!link) return <EmptyPanel isMobile={isMobile} onClose={onClose} />

    return (
      <PanelShell isMobile={isMobile} onClose={onClose}>
        <h3 style={{ margin: '0 0 4px' }}>Sibling Relationship</h3>
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          {personName(state, link.personAId)} & {personName(state, link.personBId)}
        </div>

        <label style={labelStyle}>Relationship quality</label>
        <select
          style={inputStyle}
          value={link.quality ?? ''}
          onChange={(e) =>
            store.updateSiblingLinkQuality(link.id, (e.target.value || undefined) as RelationshipQuality | undefined)
          }
        >
          <option value="">None</option>
          <option value="distant">Distant / Poor</option>
          <option value="cutoff">Cutoff / Estranged</option>
          <option value="conflict">Conflict</option>
          <option value="enmeshed">Enmeshed</option>
          <option value="abuse">Abuse</option>
        </select>

        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60 }}
          value={link.notes ?? ''}
          onChange={(e) => store.updateSiblingLinkNotes(link.id, e.target.value)}
        />

        <button
          style={{ ...dangerButtonStyle, marginTop: 14 }}
          onClick={() => {
            store.deleteSiblingLink(link.id)
            onSelect({ kind: null, id: null })
            if (isMobile) onClose()
          }}
        >
          Delete This Sibling Link
        </button>
      </PanelShell>
    )
  }

  return <EmptyPanel isMobile={isMobile} onClose={onClose} />
}

const QUALITY_LABELS: Record<RelationshipQuality, string> = {
  distant: 'Distant / Poor',
  cutoff: 'Cutoff / Estranged',
  conflict: 'Conflict',
  enmeshed: 'Enmeshed',
  abuse: 'Abuse',
}

function personName(state: Genogram, id: string): string {
  const p = state.people.find((p) => p.id === id)
  return p ? `${p.firstName} ${p.lastName}`.trim() || 'Unnamed' : 'Unknown'
}

function categoryColor(category: ConditionCategory): string {
  return { medical: '#d64545', psychological: '#4a6fd6', substance: '#c9962c', other: '#6b6b6b' }[category]
}

function EmptyPanel({ isMobile, onClose }: { isMobile: boolean; onClose: () => void }) {
  return (
    <PanelShell isMobile={isMobile} onClose={onClose}>
      <p style={{ fontSize: 13, color: '#777' }}>
        Select a person or relationship line to view and edit details. Use the toolbar to add people and create links.
      </p>
    </PanelShell>
  )
}

function PanelShell({ isMobile, onClose, children }: { isMobile: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isMobile) {
    return <div style={panelStyle}>{children}</div>
  }
  return (
    <div style={mobilePanelStyle}>
      <div style={dragHandleStyle} />
      <button style={mobileCloseButtonStyle} onClick={onClose} aria-label="Close">
        ✕
      </button>
      {children}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  width: 280,
  borderLeft: '1px solid #ddd',
  padding: 14,
  overflowY: 'auto',
  background: '#fff',
  boxSizing: 'border-box',
}

const mobilePanelStyle: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  maxHeight: '75vh',
  overflowY: 'auto',
  background: '#fff',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: '10px 16px 24px',
  boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
  zIndex: 50,
  boxSizing: 'border-box',
}

const dragHandleStyle: React.CSSProperties = {
  width: 40,
  height: 4,
  borderRadius: 2,
  background: '#ddd',
  margin: '0 auto 8px',
}

const mobileCloseButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 12,
  border: 'none',
  background: 'transparent',
  fontSize: 20,
  lineHeight: 1,
  padding: 8,
  cursor: 'pointer',
  color: '#666',
  touchAction: 'manipulation',
}

const smallButtonStyle: React.CSSProperties = {
  padding: '8px 10px',
  minHeight: 36,
  fontSize: 12,
  border: '1px solid #ccc',
  borderRadius: 5,
  cursor: 'pointer',
  touchAction: 'manipulation',
}

const dangerButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  minHeight: 36,
  fontSize: 12,
  fontWeight: 600,
  border: '1px solid #e0aeae',
  borderRadius: 5,
  background: '#fdf2f2',
  color: '#b02a2a',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

const linkButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#2563eb',
  fontSize: 12,
  padding: '4px 0',
  textAlign: 'left',
  touchAction: 'manipulation',
}

const xButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#999',
  fontSize: 15,
  lineHeight: 1,
  padding: 8,
  margin: -8,
  touchAction: 'manipulation',
}
