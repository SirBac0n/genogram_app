export type Sex = 'male' | 'female' | 'unknown'

export type ConditionCategory = 'medical' | 'psychological' | 'substance' | 'other'

export interface ConditionTag {
  id: string
  label: string
  category: ConditionCategory
}

export interface Person {
  id: string
  firstName: string
  lastName: string
  sex: Sex
  birthDate?: string
  deathDate?: string
  notes?: string
  conditions: ConditionTag[]
  isProband?: boolean
  x: number
  y: number
}

export type UnionType = 'married' | 'partnered' | 'separated' | 'divorced' | 'affair'

export type RelationshipQuality = 'distant' | 'cutoff' | 'conflict' | 'enmeshed' | 'abuse'

export type ChildLinkType = 'biological' | 'adopted' | 'foster'

export interface ChildLink {
  childId: string
  type: ChildLinkType
  quality?: RelationshipQuality
  notes?: string
}

export interface Union {
  id: string
  partnerIds: string[]
  type: UnionType
  quality?: RelationshipQuality
  notes?: string
  children: ChildLink[]
}

export interface SiblingLink {
  id: string
  personAId: string
  personBId: string
  quality?: RelationshipQuality
  notes?: string
}

export interface Genogram {
  title: string
  people: Person[]
  unions: Union[]
  siblingLinks: SiblingLink[]
}

export type SelectionKind = 'person' | 'union' | 'child-link' | 'sibling-link' | null

export interface Selection {
  kind: SelectionKind
  id: string | null
  /** Only used when kind is 'child-link': the specific child within the union identified by `id`. */
  childId?: string | null
}
