import { Db, MongoClient } from 'mongodb'

let client: MongoClient | null = null
let database: Db | null = null

export async function connectMongoDB(uri: string): Promise<void> {
  if (client && database) {
    return
  }

  client = new MongoClient(uri)
  await client.connect()

  database = client.db()

  console.log('[MongoDB] Conectado')
}

export function getDatabase(): Db {
  if (!database) {
    throw new Error('MongoDB nao inicializado')
  }

  return database
}

export async function closeMongoDB(): Promise<void> {
  if (!client) {
    return
  }

  await client.close()

  client = null
  database = null

  console.log('[MongoDB] Conexao fechada')
}
