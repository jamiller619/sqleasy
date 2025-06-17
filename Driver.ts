import type { Sql } from 'sql-template-tag'
import sqlite from 'sqlite3'

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
   * Executes a SQL statement and resolves with the last inserted row ID.
   * @param {Sql} sql - The SQL statement to execute.
   * @returns {Promise<number>} Promise resolving to the last inserted row ID.
   */
  run(sql: Sql): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.#db.run(sql.text, sql.values, function (err) {
        if (err) reject(err)
        else resolve(this.lastID)
      })
    })
  }

  /**
   * Executes a SQL statement without returning any result.
   * @param {Sql} sql - The SQL statement to execute.
   * @returns {Promise<void>} Promise resolving when execution is complete.
   */
  exec(sql: Sql): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.#db.exec(sql.text, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /**
   * Fetches a single row from the database.
   * @template R
   * @param {Sql} sql - The SQL statement to execute.
   * @returns {Promise<R | undefined>} Promise resolving to the row or undefined.
   */
  get<R>(sql: Sql): Promise<R | undefined> {
    return new Promise<R | undefined>((resolve, reject) => {
      this.#db.get(sql.text, sql.values, (err, row) => {
        if (err) reject(err)
        else resolve(row as R | undefined)
      })
    })
  }

  /**
   * Fetches all rows from the database.
   * @template R
   * @param {Sql} sql - The SQL statement to execute.
   * @returns {Promise<R[]>} Promise resolving to an array of rows.
   */
  all<R>(sql: Sql): Promise<R[]> {
    return new Promise<R[]>((resolve, reject) => {
      this.#db.all(sql.text, sql.values, (err, rows) => {
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
