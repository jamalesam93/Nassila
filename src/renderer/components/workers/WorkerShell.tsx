import OuroborosLoopWorkspace from '../loop/OuroborosLoopWorkspace'
import { useShellStore } from '../../stores/shell-store'
import RaqimWorkspace from './RaqimWorkspace'

export default function WorkerShell() {
  const appSurface = useShellStore((s) => s.appSurface)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {appSurface === 'loop' ? <OuroborosLoopWorkspace /> : null}
      {appSurface === 'bibliography' ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <RaqimWorkspace />
        </div>
      ) : null}
    </div>
  )
}
