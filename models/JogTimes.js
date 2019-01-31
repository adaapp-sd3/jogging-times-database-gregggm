const db = require('../database')

// get the queries ready - note the ? placeholders
const insert = db.prepare(
  'INSERT INTO jog_times (user_id, start_time, distance, duration) VALUES (?, ?, ?, ?)'
)
const selectById = db.prepare('SELECT * FROM jog_times WHERE id = ? AND user_id = ?')
const selectByUserId = db.prepare('SELECT * FROM jog_times WHERE user_id = ?')
const updateJog = db.prepare('UPDATE jog_times SET start_time = ?, distance = ?, duration = ? WHERE id = ?')
const deleteJog = db.prepare('DELETE FROM jog_times WHERE id = ?')
const selectByUsersFollowed = db.prepare('SELECT * FROM jog_times JOIN followers ON jog_times.user_id = followers.user_id JOIN user ON user.id = jog_times.user_id WHERE follower_id = ? ORDER BY jog_times.start_time DESC')

class JogTimes {
  static insert(user_id, start_time, distance, duration) {
    // run the insert query
    const info = insert.run(user_id, start_time, distance, duration)

    // check what the newly inserted row id is
    const userId = info.lastInsertRowid

    return userId
	}

	static delete(id) {
		deleteJog.run(id)
	}

	static update(startTime, distance, duration, id) {
		const info = updateJog.run(startTime, distance, duration, id)

		const userId = info.lastInsertRowid
		return userId
	}

	static findJogWithId(id, userId) {
		const row = selectById.get(id, userId)
		if (row) {
			return new JogTimes(row)
		}
		return null
	}

	static findByUserId(userId) {
		const jogTimes = selectByUserId.all(userId)
		if (jogTimes) {
			return jogTimes.map((item) => new JogTimes(item))
		}
		return null
	}

	static findJogsFromFollowedUsers(userId) {
		const rows = selectByUsersFollowed.all(userId)
		if (rows) {
			return rows.map((item) => new JogTimes(item))
		}
		return null
	}

  constructor(databaseRow) {
    this.id = databaseRow.id
    this.userId = databaseRow.user_id
    this.startTime = databaseRow.start_time
		this.distance = databaseRow.distance
		this.duration = databaseRow.duration
		this.avgSpeed = (databaseRow.distance / databaseRow.duration).toFixed(2)
		this.userName = databaseRow.name || null
  }
}

module.exports = JogTimes
