import { useCallback, useEffect, useReducer, useRef } from 'react'
import { makeId } from '../utils/id'
import { loadGenogram, saveGenogram } from '../utils/storage'
import type {
  ChildLinkType,
  ConditionCategory,
  ConditionTag,
  Genogram,
  Person,
  RelationshipQuality,
  Sex,
  SiblingLink,
  Union,
  UnionType,
} from '../types'

function emptyGenogram(): Genogram {
  return { title: 'Untitled Genogram', people: [], unions: [], siblingLinks: [] }
}

type Action =
  | { type: 'ADD_PERSON'; sex: Sex; x: number; y: number }
  | { type: 'UPDATE_PERSON'; id: string; patch: Partial<Person> }
  | { type: 'MOVE_PERSON'; id: string; x: number; y: number }
  | { type: 'DELETE_PERSON'; id: string }
  | { type: 'ADD_CONDITION'; personId: string; label: string; category: ConditionCategory }
  | { type: 'REMOVE_CONDITION'; personId: string; conditionId: string }
  | { type: 'SET_PROBAND'; personId: string }
  | { type: 'ADD_UNION'; partnerAId: string; partnerBId: string }
  | { type: 'UPDATE_UNION_TYPE'; id: string; unionType: UnionType }
  | { type: 'UPDATE_UNION_QUALITY'; id: string; quality: RelationshipQuality | undefined }
  | { type: 'UPDATE_UNION_NOTES'; id: string; notes: string }
  | { type: 'DELETE_UNION'; id: string }
  | { type: 'ADD_CHILD_TO_UNION'; unionId: string; childId: string; linkType: ChildLinkType }
  | { type: 'REMOVE_CHILD_FROM_UNION'; unionId: string; childId: string }
  | { type: 'UPDATE_CHILD_LINK_TYPE'; unionId: string; childId: string; linkType: ChildLinkType }
  | { type: 'UPDATE_CHILD_LINK_QUALITY'; unionId: string; childId: string; quality: RelationshipQuality | undefined }
  | { type: 'UPDATE_CHILD_LINK_NOTES'; unionId: string; childId: string; notes: string }
  | { type: 'LINK_PARENT_CHILD'; parentId: string; childId: string; linkType: ChildLinkType }
  | { type: 'ADD_SIBLING_LINK'; personAId: string; personBId: string }
  | { type: 'UPDATE_SIBLING_LINK_QUALITY'; id: string; quality: RelationshipQuality | undefined }
  | { type: 'UPDATE_SIBLING_LINK_NOTES'; id: string; notes: string }
  | { type: 'DELETE_SIBLING_LINK'; id: string }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'LOAD'; data: Genogram }
  | { type: 'RESET' }

function reducer(state: Genogram, action: Action): Genogram {
  switch (action.type) {
    case 'ADD_PERSON': {
      const person: Person = {
        id: makeId('p'),
        firstName: 'New',
        lastName: '',
        sex: action.sex,
        conditions: [],
        x: action.x,
        y: action.y,
      }
      return { ...state, people: [...state.people, person] }
    }
    case 'UPDATE_PERSON': {
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      }
    }
    case 'MOVE_PERSON': {
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.id ? { ...p, x: action.x, y: action.y } : p)),
      }
    }
    case 'DELETE_PERSON': {
      const people = state.people.filter((p) => p.id !== action.id)
      const unions = state.unions
        .map((u) => ({
          ...u,
          partnerIds: u.partnerIds.filter((id) => id !== action.id),
          children: u.children.filter((c) => c.childId !== action.id),
        }))
        // A union only remains meaningful if it still links two partners,
        // or it's a single-parent union that still has children attached.
        .filter((u) => u.partnerIds.length >= 2 || (u.partnerIds.length === 1 && u.children.length > 0))
      const siblingLinks = state.siblingLinks.filter(
        (l) => l.personAId !== action.id && l.personBId !== action.id,
      )
      return { ...state, people, unions, siblingLinks }
    }
    case 'ADD_CONDITION': {
      const tag: ConditionTag = { id: makeId('c'), label: action.label, category: action.category }
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.personId ? { ...p, conditions: [...p.conditions, tag] } : p,
        ),
      }
    }
    case 'REMOVE_CONDITION': {
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.personId
            ? { ...p, conditions: p.conditions.filter((c) => c.id !== action.conditionId) }
            : p,
        ),
      }
    }
    case 'SET_PROBAND': {
      return {
        ...state,
        people: state.people.map((p) => ({ ...p, isProband: p.id === action.personId })),
      }
    }
    case 'ADD_UNION': {
      const existing = state.unions.find(
        (u) =>
          u.partnerIds.includes(action.partnerAId) && u.partnerIds.includes(action.partnerBId),
      )
      if (existing) return state
      const union: Union = {
        id: makeId('u'),
        partnerIds: [action.partnerAId, action.partnerBId],
        type: 'married',
        children: [],
      }
      return { ...state, unions: [...state.unions, union] }
    }
    case 'UPDATE_UNION_TYPE': {
      return {
        ...state,
        unions: state.unions.map((u) => (u.id === action.id ? { ...u, type: action.unionType } : u)),
      }
    }
    case 'UPDATE_UNION_QUALITY': {
      return {
        ...state,
        unions: state.unions.map((u) => (u.id === action.id ? { ...u, quality: action.quality } : u)),
      }
    }
    case 'UPDATE_UNION_NOTES': {
      return {
        ...state,
        unions: state.unions.map((u) => (u.id === action.id ? { ...u, notes: action.notes } : u)),
      }
    }
    case 'DELETE_UNION': {
      return { ...state, unions: state.unions.filter((u) => u.id !== action.id) }
    }
    case 'ADD_CHILD_TO_UNION': {
      return {
        ...state,
        unions: state.unions.map((u) => {
          if (u.id !== action.unionId) return u
          if (u.children.some((c) => c.childId === action.childId)) return u
          return { ...u, children: [...u.children, { childId: action.childId, type: action.linkType }] }
        }),
      }
    }
    case 'REMOVE_CHILD_FROM_UNION': {
      return {
        ...state,
        unions: state.unions.map((u) =>
          u.id === action.unionId
            ? { ...u, children: u.children.filter((c) => c.childId !== action.childId) }
            : u,
        ),
      }
    }
    case 'UPDATE_CHILD_LINK_TYPE': {
      return {
        ...state,
        unions: state.unions.map((u) =>
          u.id === action.unionId
            ? {
                ...u,
                children: u.children.map((c) =>
                  c.childId === action.childId ? { ...c, type: action.linkType } : c,
                ),
              }
            : u,
        ),
      }
    }
    case 'UPDATE_CHILD_LINK_QUALITY': {
      return {
        ...state,
        unions: state.unions.map((u) =>
          u.id === action.unionId
            ? {
                ...u,
                children: u.children.map((c) =>
                  c.childId === action.childId ? { ...c, quality: action.quality } : c,
                ),
              }
            : u,
        ),
      }
    }
    case 'UPDATE_CHILD_LINK_NOTES': {
      return {
        ...state,
        unions: state.unions.map((u) =>
          u.id === action.unionId
            ? {
                ...u,
                children: u.children.map((c) =>
                  c.childId === action.childId ? { ...c, notes: action.notes } : c,
                ),
              }
            : u,
        ),
      }
    }
    case 'LINK_PARENT_CHILD': {
      if (action.parentId === action.childId) return state
      const existing = state.unions.find((u) => u.partnerIds.includes(action.parentId))
      if (existing) {
        if (existing.children.some((c) => c.childId === action.childId)) return state
        return {
          ...state,
          unions: state.unions.map((u) =>
            u.id === existing.id
              ? { ...u, children: [...u.children, { childId: action.childId, type: action.linkType }] }
              : u,
          ),
        }
      }
      const union: Union = {
        id: makeId('u'),
        partnerIds: [action.parentId],
        type: 'married',
        children: [{ childId: action.childId, type: action.linkType }],
      }
      return { ...state, unions: [...state.unions, union] }
    }
    case 'ADD_SIBLING_LINK': {
      if (action.personAId === action.personBId) return state
      const existing = state.siblingLinks.find(
        (l) =>
          (l.personAId === action.personAId && l.personBId === action.personBId) ||
          (l.personAId === action.personBId && l.personBId === action.personAId),
      )
      if (existing) return state
      const link: SiblingLink = { id: makeId('s'), personAId: action.personAId, personBId: action.personBId }
      return { ...state, siblingLinks: [...state.siblingLinks, link] }
    }
    case 'UPDATE_SIBLING_LINK_QUALITY': {
      return {
        ...state,
        siblingLinks: state.siblingLinks.map((l) => (l.id === action.id ? { ...l, quality: action.quality } : l)),
      }
    }
    case 'UPDATE_SIBLING_LINK_NOTES': {
      return {
        ...state,
        siblingLinks: state.siblingLinks.map((l) => (l.id === action.id ? { ...l, notes: action.notes } : l)),
      }
    }
    case 'DELETE_SIBLING_LINK': {
      return { ...state, siblingLinks: state.siblingLinks.filter((l) => l.id !== action.id) }
    }
    case 'SET_TITLE': {
      return { ...state, title: action.title }
    }
    case 'LOAD': {
      return action.data
    }
    case 'RESET': {
      return emptyGenogram()
    }
    default:
      return state
  }
}

export function useGenogramStore() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadGenogram() ?? emptyGenogram())
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    saveGenogram(state)
  }, [state])

  const addPerson = useCallback((sex: Sex, x: number, y: number) => dispatch({ type: 'ADD_PERSON', sex, x, y }), [])
  const updatePerson = useCallback((id: string, patch: Partial<Person>) => dispatch({ type: 'UPDATE_PERSON', id, patch }), [])
  const movePerson = useCallback((id: string, x: number, y: number) => dispatch({ type: 'MOVE_PERSON', id, x, y }), [])
  const deletePerson = useCallback((id: string) => dispatch({ type: 'DELETE_PERSON', id }), [])
  const addCondition = useCallback(
    (personId: string, label: string, category: ConditionCategory) =>
      dispatch({ type: 'ADD_CONDITION', personId, label, category }),
    [],
  )
  const removeCondition = useCallback(
    (personId: string, conditionId: string) => dispatch({ type: 'REMOVE_CONDITION', personId, conditionId }),
    [],
  )
  const setProband = useCallback((personId: string) => dispatch({ type: 'SET_PROBAND', personId }), [])
  const addUnion = useCallback(
    (partnerAId: string, partnerBId: string) => dispatch({ type: 'ADD_UNION', partnerAId, partnerBId }),
    [],
  )
  const updateUnionType = useCallback(
    (id: string, unionType: UnionType) => dispatch({ type: 'UPDATE_UNION_TYPE', id, unionType }),
    [],
  )
  const updateUnionQuality = useCallback(
    (id: string, quality: RelationshipQuality | undefined) => dispatch({ type: 'UPDATE_UNION_QUALITY', id, quality }),
    [],
  )
  const updateUnionNotes = useCallback(
    (id: string, notes: string) => dispatch({ type: 'UPDATE_UNION_NOTES', id, notes }),
    [],
  )
  const deleteUnion = useCallback((id: string) => dispatch({ type: 'DELETE_UNION', id }), [])
  const addChildToUnion = useCallback(
    (unionId: string, childId: string, linkType: ChildLinkType) =>
      dispatch({ type: 'ADD_CHILD_TO_UNION', unionId, childId, linkType }),
    [],
  )
  const removeChildFromUnion = useCallback(
    (unionId: string, childId: string) => dispatch({ type: 'REMOVE_CHILD_FROM_UNION', unionId, childId }),
    [],
  )
  const updateChildLinkType = useCallback(
    (unionId: string, childId: string, linkType: ChildLinkType) =>
      dispatch({ type: 'UPDATE_CHILD_LINK_TYPE', unionId, childId, linkType }),
    [],
  )
  const updateChildLinkQuality = useCallback(
    (unionId: string, childId: string, quality: RelationshipQuality | undefined) =>
      dispatch({ type: 'UPDATE_CHILD_LINK_QUALITY', unionId, childId, quality }),
    [],
  )
  const updateChildLinkNotes = useCallback(
    (unionId: string, childId: string, notes: string) =>
      dispatch({ type: 'UPDATE_CHILD_LINK_NOTES', unionId, childId, notes }),
    [],
  )
  const linkParentChild = useCallback(
    (parentId: string, childId: string, linkType: ChildLinkType) =>
      dispatch({ type: 'LINK_PARENT_CHILD', parentId, childId, linkType }),
    [],
  )
  const addSiblingLink = useCallback(
    (personAId: string, personBId: string) => dispatch({ type: 'ADD_SIBLING_LINK', personAId, personBId }),
    [],
  )
  const updateSiblingLinkQuality = useCallback(
    (id: string, quality: RelationshipQuality | undefined) =>
      dispatch({ type: 'UPDATE_SIBLING_LINK_QUALITY', id, quality }),
    [],
  )
  const updateSiblingLinkNotes = useCallback(
    (id: string, notes: string) => dispatch({ type: 'UPDATE_SIBLING_LINK_NOTES', id, notes }),
    [],
  )
  const deleteSiblingLink = useCallback((id: string) => dispatch({ type: 'DELETE_SIBLING_LINK', id }), [])
  const setTitle = useCallback((title: string) => dispatch({ type: 'SET_TITLE', title }), [])
  const load = useCallback((data: Genogram) => dispatch({ type: 'LOAD', data }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    state,
    addPerson,
    updatePerson,
    movePerson,
    deletePerson,
    addCondition,
    removeCondition,
    setProband,
    addUnion,
    updateUnionType,
    updateUnionQuality,
    updateUnionNotes,
    deleteUnion,
    addChildToUnion,
    removeChildFromUnion,
    updateChildLinkType,
    updateChildLinkQuality,
    updateChildLinkNotes,
    linkParentChild,
    addSiblingLink,
    updateSiblingLinkQuality,
    updateSiblingLinkNotes,
    deleteSiblingLink,
    setTitle,
    load,
    reset,
  }
}
