import sqlite from 'sqlite3'
import Driver from './Driver.ts'

export type { Driver }

/**
 * Initializes a SQLite database and optionally applies a schema.
 *
 * @param {string} fileName - The path to the SQLite database file.
 * @param {string} [schema] - Optional SQL schema to initialize the database with.
 * @returns {Promise<() => Driver>} Promise resolving to a function that returns a Driver instance connected to the database.
 */
export default async function sqleasy(
  fileName: string,
  schema?: string,
): Promise<() => Driver> {
  const db = await new Promise<sqlite.Database>((resolve, reject) => {
    sqlite.cached.Database(fileName, function (err) {
      if (err) reject(err)

      if (schema) {
        this.exec(schema, (err) => {
          if (err) reject(err)

          resolve(this)
        })
      } else {
        resolve(this)
      }
    })
  })

  /**
   * Returns a new Driver instance connected to the initialized database.
   * @returns {Driver}
   */
  return function connect(): Driver {
    return new Driver(db)
  }
}
