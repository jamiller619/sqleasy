import { Readable } from 'node:stream'
import { Sql } from 'sql-template-tag'
import * as sqlite from 'sqlite3'

/**
 * DatabaseStream streams the results of a prepared SQLite statement as a Node.js readable stream.
 *
 * @template T The expected row type for each result.
 *
 * @example
 * import DatabaseStream from './DatabaseStream'
 * import sql from 'sql-template-tag'
 * import sqlite from 'sqlite3'
 *
 * const db = new sqlite.Database(':memory:')
 * db.serialize(async () => {
 *   db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)')
 *   db.run('INSERT INTO test (name) VALUES (?)', ['Alice'])
 *
 *   const stream = new DatabaseStream<{ id: number, name: string }>(sql`SELECT * FROM test`, db)
 *
 *   for await (const row of stream) {
 *     console.log(row)
 *   }
 *
 *   await db.close()
 * })
 */
export default class DatabaseStream<T> extends Readable {
  /**
   * The underlying sqlite3 Statement instance.
   * @private
   */
  #stmt: sqlite.Statement
  #currentRow = 0

  /**
   * Creates a new DatabaseStream instance.
   * @param {Sql} sql - The SQL statement to prepare and execute.
   * @param {sqlite.Database} db - The sqlite3 Database instance.
   */
  constructor(db: sqlite.Database, sql: Sql | string, ...values: unknown[]) {
    super({ objectMode: true })

    const query = typeof sql === 'string' ? { text: sql, values } : sql

    this.#stmt = db.prepare(query.text, query.values)
    this.on('end', () => this.#stmt.finalize())
  }

  /**
   * Reads the next row from the statement and pushes it to the stream.
   * Emits 'error' on query error, or pushes the result (or null if no more rows).
   * @override
   */
  override _read() {
    this.#stmt.get<T>((err, result) => {
      if (err) {
        this.emit('error', err)
        this.destroy(err)

        return
      }

      if (!result) {
        this.push(null)

        return
      }

      this.#currentRow += 1
      this.push(result)
    })
  }

  // Helper method to get row count (optional)
  getProcessedRowCount(): number {
    return this.#currentRow
  }
}
