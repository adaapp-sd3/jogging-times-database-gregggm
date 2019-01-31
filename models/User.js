var db = require('../database')

// get the queries ready - note the ? placeholders
var insertUser = db.prepare(
  'INSERT INTO user (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
)
var removeUser = db.prepare('DELETE FROM user WHERE id = ?')
var selectUserById = db.prepare('SELECT * FROM user WHERE id = ?')
var selectUserByEmail = db.prepare('SELECT * FROM user WHERE email = ?')
var selectAll = db.prepare('SELECT * FROM user')
var followUser = db.prepare('INSERT INTO followers (user_id, follower_id) VALUES (?, ?)')
var selectFollowers = db.prepare('SELECT * FROM followers JOIN user ON followers.follower_id = user.id WHERE user_id = ?')
var selectFollowed = db.prepare('SELECT * FROM followers JOIN user ON followers.user_id = user.id WHERE follower_id = ?')
var usersFollowedTotalDistanceRanking = db.prepare('SELECT name,SUM(distance)AS totalDistance FROM jog_times LEFT JOIN followers ON jog_times.user_id=followers.user_id JOIN USER ON user.id=jog_times.user_id WHERE follower_id = ? OR jog_times.user_id = ? GROUP BY user.id ORDER BY totalDistance DESC')
var usersFollowedTotalDurationRanking = db.prepare('SELECT name,SUM(duration)AS totalDuration FROM jog_times LEFT JOIN followers ON jog_times.user_id=followers.user_id JOIN USER ON user.id=jog_times.user_id WHERE follower_id = ? OR jog_times.user_id = ? GROUP BY user.id ORDER BY totalDuration DESC')
var usersFollowedAverageSpeedRanking = db.prepare('SELECT name,SUM(distance)/SUM(duration) AS averageSpeed FROM jog_times LEFT JOIN followers ON jog_times.user_id=followers.user_id JOIN USER ON user.id=jog_times.user_id WHERE follower_id = ? OR jog_times.user_id = ? GROUP BY user.id ORDER BY averageSpeed DESC')

class User {
  static insert(id, name, email, passwordHash) {
    // run the insert query
    var info = insertUser.run(id, name, email, passwordHash)

    // check what the newly inserted row id is
    var userId = info.lastInsertRowid

    return userId
  }

  static findById(id) {
    var row = selectUserById.get(id)

    if (row) {
      return new User(row)
    } else {
      return null
    }
  }

  static findByEmail(email) {
    var row = selectUserByEmail.get(email)

    if (row) {
      return new User(row)
    } else {
      return null
    }
	}
	
	static remove(id) {
		var info = removeUser.run(id)

		return info
	}

	static findAll() {
		const rows = selectAll.all()

		if (rows) {
			return rows.map(row => new User(row))
		} else {
			return null
		}
	}

  constructor(databaseRow) {
    this.id = databaseRow.id
    this.name = databaseRow.name
    this.email = databaseRow.email
    this.passwordHash = databaseRow.password_hash
	}

	followUser(userId) {
		const info = followUser.run(userId, this.id)

		return info
	}

	findFollowers() {
		const rows = selectFollowers.all(this.id)

		if (rows) {
			return rows.map(row => new User(row))
		} else {
			return null
		}
	}

	findFollowed() {
		const rows = selectFollowed.all(this.id)

		if (rows) {
			return rows.map(row => new User(row))
		} else {
			return null
		}
	}

	getRankings() {
		const rankings = {}

		rankings.distance = usersFollowedTotalDistanceRanking.all(this.id, this.id)
		rankings.duration = usersFollowedTotalDurationRanking.all(this.id, this.id)
		rankings.speed = usersFollowedAverageSpeedRanking.all(this.id, this.id)

		return rankings
	}
}

module.exports = User
