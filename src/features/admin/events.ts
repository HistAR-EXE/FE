export const ADMIN_TRASH_CHANGED_EVENT = 'histar:admin-trash-changed'

export function dispatchAdminTrashChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ADMIN_TRASH_CHANGED_EVENT))
}
