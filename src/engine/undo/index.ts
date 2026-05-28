import type { CslItem, UndoableAction, ActionType } from '../types'

let idCounter = 0
function nextId(): string {
  return `action-${Date.now()}-${++idCounter}`
}

export class UndoManager {
  private undoStack: UndoableAction[] = []
  private redoStack: UndoableAction[] = []
  private maxHistory: number

  constructor(maxHistory = 200) {
    this.maxHistory = maxHistory
  }

  record(
    type: ActionType,
    label: string,
    before: CslItem[],
    after: CslItem[]
  ): UndoableAction {
    const action: UndoableAction = {
      id: nextId(),
      type,
      label,
      timestamp: Date.now(),
      before: structuredClone(before),
      after: structuredClone(after)
    }
    this.undoStack.push(action)
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift()
    }
    this.redoStack = []
    return action
  }

  undo(): UndoableAction | null {
    const action = this.undoStack.pop()
    if (!action) return null
    this.redoStack.push(action)
    return action
  }

  redo(): UndoableAction | null {
    const action = this.redoStack.pop()
    if (!action) return null
    this.undoStack.push(action)
    return action
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  getUndoStack(): readonly UndoableAction[] {
    return this.undoStack
  }

  getRedoStack(): readonly UndoableAction[] {
    return this.redoStack
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
