import type { Sql } from 'sql-template-tag'
import sqlite from 'sqlite3'
import DatabaseStream from './DatabaseStream.ts'

/**
 * Driver class for executing SQL statements using sqlite3.
 * This class wraps the sqlite3 Database instance and provides methods
 * to run SQL commands asynchronously.
 */
export default class Driver {
  /**
   * The underlying sqlite3 Database instance.
   * @private
   */
  #db: sqlite.Database

  /**
   * Creates a new Driver instance.
   * @param {sqlite.Database} db - The sqlite3 Database instance to use.
   */
  constructor(db: sqlite.Database) {
    this.#db = db
  }

  /**
   * Streams the results of an SQL query as a Node.js readable stream.
   *
   * @template R The expected row type.
   * @param {Sql|string} sql - The SQL statement to execute.
   * @param {...unknown} values - If the `sql` parameter is a string, this will be used as values.
   * @returns {NodeJS.ReadableStream} A readable stream emitting rows of type T.
   */
  stream<R>(sql: Sql | string, ...values: unknown[]): AsyncIterable<R> {
    const query = typeof sql === 'string' ? { text: sql, values } : sql

    return new DatabaseStream<R>(this.#db, query.text, ...query.values)
  }

  /**
   * Executes a SQL statement and resolves with the last inserted row ID.
   * @param {Sql|string} sql - The SQL statement to execute.
   * @param {...unknown} values - If the `sql` parameter is a string, this will be used as values.
   * @returns {Promise<number>} Promise resolving to the last inserted row ID.
   */
  run(sql: Sql | string, ...values: unknown[]): Promise<number> {
    const query = typeof sql === 'string' ? { text: sql, values } : sql

    return new Promise<number>((resolve, reject) => {
      this.#db.run(query.text, query.values, function (err) {
        if (err) reject(err)
        else resolve(this.lastID)
      })
    })
  }

  /**
   * Executes a SQL statement without returning any result.
   * @param {string} sql - The SQL statement to execute.
   * @returns {Promise<void>} Promise resolving when execution is complete.
   */
  exec(sql: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.#db.exec(sql, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /**
   * Fetches a single row from the database.
   * @template R
   * @param {Sql|string} sql - The SQL statement to execute.
   * @param {...unknown} values - If the `sql` parameter is a string, this will be used as values.
   * @returns {Promise<R | undefined>} Promise resolving to the row or undefined.
   */
  one<R>(sql: Sql | string, ...values: unknown[]): Promise<R | undefined> {
    const query = typeof sql === 'string' ? { text: sql, values } : sql

    return new Promise<R | undefined>((resolve, reject) => {
      this.#db.get(query.text, query.values, (err, row) => {
        if (err) reject(err)
        else resolve(row as R | undefined)
      })
    })
  }

  /**
   * Fetches all rows from the database.
   * @template R
   * @param {Sql|string} sql - The SQL statement to execute.
   * @param {...unknown} values - If the `sql` parameter is a string, this will be used as values.
   * @returns {Promise<R[]>} Promise resolving to an array of rows.
   */
  many<R>(sql: Sql | string, ...values: unknown[]): Promise<R[]> {
    const query = typeof sql === 'string' ? { text: sql, values } : sql

    return new Promise<R[]>((resolve, reject) => {
      this.#db.all(query.text, query.values, (err, rows) => {
        if (err) reject(err)
        else resolve((rows ?? []) as R[])
      })
    })
  }

  /**
   * Closes the database connection.
   * @throws {Error} If the database connection cannot be closed.
   * @returns {Promise<void>} Promise resolving when the database connection is closed.
   */
  close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.#db.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
