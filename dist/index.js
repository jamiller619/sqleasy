// src/index.ts
import sqlite from "sqlite3";

// src/DatabaseStream.ts
import { Readable } from "node:stream";
var DatabaseStream = class extends Readable {
  /**
   * The underlying sqlite3 Statement instance.
   * @private
   */
  #stmt;
  /**
   * Creates a new DatabaseStream instance.
   * @param {Sql} sql - The SQL statement to prepare and execute.
   * @param {sqlite.Database} db - The sqlite3 Database instance.
   */
  constructor(db, sql, ...values) {
    super({ objectMode: true });
    const query = typeof sql === "string" ? { text: sql, values } : sql;
    this.#stmt = db.prepare(query.text, query.values);
    this.on("end", () => this.#stmt.finalize());
  }
  /**
   * Reads the next row from the statement and pushes it to the stream.
   * Emits 'error' on query error, or pushes the result (or null if no more rows).
   * @override
   */
  _read() {
    this.#stmt.get((err, result) => {
      if (err) {
        this.emit("error", err);
        this.destroy(err);
        return;
      } else {
        this.push(result || null);
      }
    });
  }
};

// src/Driver.ts
var Driver = class {
  /**
   * The underlying sqlite3 Database instance.
   * @private
   */
  #db;
  /**
   * Creates a new Driver instance.
   * @param {sqlite.Database} db - The sqlite3 Database instance to use.
   */
  constructor(db) {
    this.#db = db;
  }
  /**
   * Streams the results of an SQL query as a Node.js readable stream.
   *
   * @template R The expected row type.
   * @param {Sql|string} sql - The SQL statement to execute.
   * @param {...unknown} values - If the `sql` parameter is a string, this will be used as values.
   * @returns {NodeJS.ReadableStream} A readable stream emitting rows of type T.
   */
  stream(sql, ...values) {
    const query = typeof sql === "string" ? { text: sql, values } : sql;
    return new DatabaseStream(this.#db, query.text, ...query.values);
  }
  /**
   * Executes a SQL statement and resolves with the last inserted row ID.
   * @param {Sql|string} sql - The SQL statement to execute.
   * @param {...unknown} values - If the `sql` parameter is a string, this will be used as values.
   * @returns {Promise<number>} Promise resolving to the last inserted row ID.
   */
  run(sql, ...values) {
    const query = typeof sql === "string" ? { text: sql, values } : sql;
    return new Promise((resolve, reject) => {
      this.#db.run(query.text, query.values, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }
  /**
   * Executes a SQL statement without returning any result.
   * @param {string} sql - The SQL statement to execute.
   * @returns {Promise<void>} Promise resolving when execution is complete.
   */
  exec(sql) {
    return new Promise((resolve, reject) => {
      this.#db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  /**
   * Fetches a single row from the database.
   * @template R
   * @param {Sql|string} sql - The SQL statement to execute.
   * @param {...unknown} values - If the `sql` parameter is a string, this will be used as values.
   * @returns {Promise<R | undefined>} Promise resolving to the row or undefined.
   */
  one(sql, ...values) {
    const query = typeof sql === "string" ? { text: sql, values } : sql;
    return new Promise((resolve, reject) => {
      this.#db.get(query.text, query.values, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  /**
   * Fetches all rows from the database.
   * @template R
   * @param {Sql|string} sql - The SQL statement to execute.
   * @param {...unknown} values - If the `sql` parameter is a string, this will be used as values.
   * @returns {Promise<R[]>} Promise resolving to an array of rows.
   */
  many(sql, ...values) {
    const query = typeof sql === "string" ? { text: sql, values } : sql;
    return new Promise((resolve, reject) => {
      this.#db.all(query.text, query.values, (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      });
    });
  }
  /**
   * Closes the database connection.
   * @throws {Error} If the database connection cannot be closed.
   * @returns {Promise<void>} Promise resolving when the database connection is closed.
   */
  close() {
    return new Promise((resolve, reject) => {
      this.#db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// src/index.ts
async function sqleasy(fileName, schema) {
  const db = await new Promise((resolve, reject) => {
    sqlite.cached.Database(fileName, function(err) {
      if (err) reject(err);
      if (schema) {
        this.exec(schema, (err2) => {
          if (err2) reject(err2);
          resolve(this);
        });
      } else {
        resolve(this);
      }
    });
  });
  return function connect() {
    return new Driver(db);
  };
}
export {
  sqleasy as default
};
