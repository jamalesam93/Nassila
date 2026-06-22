import InputPanel from '../InputPanel'
import OutputPanel from '../OutputPanel'
import BibliographyDrawer from '../shell/BibliographyDrawer'

/** Raqim — references import / parse / verify / export workflow. */
export default function RaqimWorkspace() {
  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden border-e border-border">
          <InputPanel />
        </div>
        <div className="flex-1 overflow-hidden">
          <OutputPanel />
        </div>
      </div>
      <BibliographyDrawer />
    </div>
  )
}
