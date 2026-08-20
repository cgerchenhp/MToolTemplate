import { useContext } from 'react'
import { DragContext } from '../lib/dragContext'

/** Whether a file is currently being dragged over the application window. */
export function useDragActive(): boolean {
  return useContext(DragContext)
}
