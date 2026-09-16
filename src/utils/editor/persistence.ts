import { EDITOR_SCHEMA_VERSION, PersistedEditorProject } from './types'

const DB_NAME = 'Zia-PDFEditor'
const DB_VERSION = 1
const STORE_NAME = 'projects'
const ACTIVE_KEY = 'active'

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const waitForTransaction = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve()
  transaction.onerror = () => reject(transaction.error)
  transaction.onabort = () => reject(transaction.error)
})

export const saveEditorProject = async (record: PersistedEditorProject) => {
  const db = await openDb()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).put(record, ACTIVE_KEY)
  await waitForTransaction(transaction)
  db.close()
}

export const loadEditorProject = async (): Promise<PersistedEditorProject | null> => {
  const db = await openDb()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const request = transaction.objectStore(STORE_NAME).get(ACTIVE_KEY)
  const record = await new Promise<PersistedEditorProject | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  if (!record) return null
  if (record.project.schemaVersion !== EDITOR_SCHEMA_VERSION) {
    throw new Error('This draft was created by a newer version of ZIA PDF.')
  }
  return record
}

export const clearEditorProject = async () => {
  const db = await openDb()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).delete(ACTIVE_KEY)
  await waitForTransaction(transaction)
  db.close()
}

