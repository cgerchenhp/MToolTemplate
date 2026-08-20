import { useContext } from 'react'
import {
  NotificationContext,
  type NotifyFn,
} from '../components/ui/NotificationContext'

/** Access the application's toast notification API. */
export function useNotify(): NotifyFn {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotify must be used inside <NotificationProvider>')
  }
  return context
}
