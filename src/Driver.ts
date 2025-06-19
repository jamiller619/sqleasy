import sqlite from 'sqlite3'
import { Sql } from 'sql-template-tag'
import DatabaseStream from './DatabaseStream.ts'

/**
 * Driver provides async and streaming methods for interacting with a SQLite database.
 * Supports both sql-template-tag and raw SQL as strings with parameters.
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

  async [Symbol.asyncDispose]() {
    await this.close()
  }

  /**
   * Streams the results of a SQLite query as an async iterable.
   *
   * @template R The expected row type.
   * @param {Sql|string} sql - The SQL statement or sql-template-tag object.
   * @param {...unknown} values - Optional values for parameterized queries.
   * @returns {AsyncIterable<R>} An async iterable yielding rows of type R.
   */
  stream<R>(sql: Sql): DatabaseStream<R>
  stream<R>(sql: string, ...values: unknown[]): DatabaseStream<R>
  stream<R>(sql: unknown, ...values: unknown[]): DatabaseStream<R> {
    const query = parseArgs(sql, ...values)

    return new DatabaseStream<R>(this.#db, query.text, ...query.values)
  }

  /**
   * Executes a SQLite statement and resolves with the last inserted row ID.
   *
   * @param {Sql|string} sql - The SQL statement or sql-template-tag object.
   * @param {...unknown} values - Optional values for parameterized queries.
   * @returns {Promise<number>} Promise resolving to the last inserted row ID.
   */
  run(sql: Sql): Promise<number>
  run(sql: string, ...values: unknown[]): Promise<number>
  run(sql: unknown, ...values: unknown[]): Promise<number> {
    const query = parseArgs(sql, ...values)
    return new Promise<number>((resolve, reject) => {
      this.#db.run(query.text, query.values, function (err) {
        if (err) reject(err)
        else resolve(this.lastID)
      })
    })
  }

  /**
   * Executes a SQLite statement without returning any result.
   *
   * @param {string} sql - The SQL statement to execute.
   * @param {...unknown} args - Should be empty; throws if not.
   * @returns {Promise<void>} Promise resolving when execution is complete.
   * @throws {TypeError} If extra arguments are provided.
   */
  exec(sql: string, ...args: unknown[]): Promise<void> {
    if (args.at(0) != null) {
      throw new TypeError('')
    }
    return new Promise<void>((resolve, reject) => {
      this.#db.exec(sql, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /**
   * Fetches a single row from the database.
   *
   * @template R
   * @param {Sql|string} sql - The SQL statement or sql-template-tag object.
   * @param {...unknown} values - Optional values for parameterized queries.
   * @returns {Promise<R | undefined>} Promise resolving to the row or undefined.
   */
  one<R>(sql: Sql): Promise<R | undefined>
  one<R>(sql: string, ...values: unknown[]): Promise<R | undefined>
  one<R>(sql: unknown, ...values: unknown[]): Promise<R | undefined> {
    const query = parseArgs(sql, ...values)
    return new Promise((resolve, reject) => {
      this.#db.get<R>(query.text, query.values, (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }

  /**
   * Fetches all rows from the database.
   *
   * @template R
   * @param {Sql|string} sql - The SQL statement or sql-template-tag object.
   * @param {...unknown} values - Optional values for parameterized queries.
   * @returns {Promise<R[]>} Promise resolving to an array of rows.
   */
  many<R>(sql: Sql): Promise<R[]>
  many<R>(sql: string, ...values: unknown[]): Promise<R[]>
  many<R>(sql: unknown, ...values: unknown[]): Promise<R[]> {
    const query = parseArgs(sql, ...values)
    return new Promise<R[]>((resolve, reject) => {
      this.#db.all(query.text, query.values, (err, rows) => {
        if (err) reject(err)
        else resolve((rows ?? []) as R[])
      })
    })
  }

  /**
   * Closes the database connection.
   * @returns {Promise<void>} Promise resolving when the database connection is closed.
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#db.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

/**
 * Parses SQL arguments for Driver methods, supporting both sql-template-tag and raw SQL.
 *
 * @param {Sql|string|unknown} sql - The SQL statement or sql-template-tag object.
 * @param {...unknown} values - Optional values for parameterized queries.
 * @returns {Sql} The parsed SQL object with text and values.
 * @throws {Error} If parameters are invalid.
 */
function parseArgs(
  sql: Sql | string | unknown,
  ...values: unknown[]
): { text: string; values: unknown[] } {
  if (typeof sql === 'string') {
    return {
      text: sql,
      values,
    }
  } else if (isSqlType(sql)) {
    const { text, values } = sql

    return {
      text,
      values: values || [],
    }
  }

  throw new Error('Invalid parameters')
}

function isSqlType(sql: unknown): sql is { text: string; values?: unknown[] } {
  if (sql == null) return false

  if (
    typeof sql === 'object' &&
    'text' in sql &&
    typeof sql.text === 'string'
  ) {
    return true
  }

  return false
}
