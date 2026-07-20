import type { NassilaProjectV1 } from '../../shared/nassila-project'
import {
  createEmptyNassilaProject,
  parseNassilaProject,
  serializeNassilaProject,
  PROJECT_PROMPT_CONTRACT_VERSION
} from '../../shared/nassila-project'
import { useCitationStore } from '../stores/citation-store'
import { useManuscriptAuditStore } from '../stores/manuscript-audit-store'
import { useOuroborosLoopStore } from '../stores/ouroboros-loop-store'

export function snapshotNassilaProject(): NassilaProjectV1 {
  const audit = useManuscriptAuditStore.getState()
  const citations = useCitationStore.getState().citations
  const sources = useOuroborosLoopStore.getState().sourceArtifactsByBibKey
  const project = createEmptyNassilaProject()
  project.savedAt = new Date().toISOString()
  project.manuscript = {
    text: audit.rawManuscriptText,
    sourceFormat: audit.manuscriptSourceFormat
  }
  project.bibliography = { citations }
  project.sources = { artifactsByBibKey: { ...sources } }
  project.audit = {
    report: audit.report,
    userActionsByBibKey: { ...audit.userActionsByBibKey },
    referenceSource: audit.auditReferenceSource,
    selectedTemplateId: audit.selectedTemplateId,
    templateStrict: audit.templateStrict,
    llmEnabled: audit.llmEnabled,
    llmPresetId: audit.llmPresetId,
    llmBaseUrl: audit.llmBaseUrl,
    llmModel: audit.llmModel,
    promptContractVersion: PROJECT_PROMPT_CONTRACT_VERSION
  }
  return project
}

export function applyNassilaProject(project: NassilaProjectV1): void {
  useCitationStore.getState().setCitations(project.bibliography.citations, undefined, 'Open project')
  useManuscriptAuditStore.setState({
    rawManuscriptText: project.manuscript.text,
    manuscriptSourceFormat: project.manuscript.sourceFormat,
    report: project.audit.report,
    userActionsByBibKey: { ...project.audit.userActionsByBibKey },
    auditReferenceSource: project.audit.referenceSource,
    selectedTemplateId: project.audit.selectedTemplateId,
    templateStrict: project.audit.templateStrict,
    llmEnabled: project.audit.llmEnabled,
    llmPresetId: project.audit.llmPresetId || useManuscriptAuditStore.getState().llmPresetId,
    llmBaseUrl: project.audit.llmBaseUrl || useManuscriptAuditStore.getState().llmBaseUrl,
    llmModel: project.audit.llmModel || useManuscriptAuditStore.getState().llmModel,
    step: 'idle',
    error: null,
    auditProgress: null,
    importProgress: null,
    activeRunId: null,
    activeBibKeyFilter: null,
    auditItemStages: {},
    auditFindingSlots: []
  })
  useOuroborosLoopStore.setState({
    sourceArtifactsByBibKey: { ...project.sources.artifactsByBibKey },
    selectedBibKey: null
  })
}

export function clearFullSession(): void {
  useCitationStore.getState().clearCitations()
  useManuscriptAuditStore.getState().clear()
  useOuroborosLoopStore.setState({ sourceArtifactsByBibKey: {}, selectedBibKey: null })
}

export function sessionIsDirty(): boolean {
  const audit = useManuscriptAuditStore.getState()
  const citations = useCitationStore.getState().citations
  const sources = useOuroborosLoopStore.getState().sourceArtifactsByBibKey
  return (
    audit.rawManuscriptText.trim().length > 0 ||
    citations.length > 0 ||
    audit.report !== null ||
    Object.keys(sources).length > 0
  )
}

export { serializeNassilaProject, parseNassilaProject }
