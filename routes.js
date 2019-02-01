var express = require('express')
var bcrypt = require('bcryptjs')
var uuidv1 = require('uuid/v1');

var User = require('./models/User')
const JogTimes = require('./models/JogTimes')

var routes = new express.Router()

var saltRounds = 10

function formatDateForHTML(date) {
	const dateObj = new Date(date)
	console.log(dateObj.toLocaleString())
  return dateObj.toLocaleString('en-GB', {
		day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute:'2-digit'
	})
}

// main page
routes.get('/', function(req, res) {
  if (req.cookies.userId) {
    // if we've got a user id, assume we're logged in and redirect to the app:
    res.redirect('/times')
  } else {
    // otherwise, redirect to login
    res.redirect('/sign-in')
  }
})

// show the create account page
routes.get('/create-account', function(req, res) {
  res.render('create-account.html')
})

// handle create account forms:
routes.post('/create-account', function(req, res) {
	var form = req.body
	
	const uuid = uuidv1()

	try {
		// validate passwords match
		if (form.password != form.passwordConfirm) {
			throw new Error('Passwords did not match')
		}

		// validate email address
		var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		if (re.test(String(form.email).toLowerCase()) != true) {
			throw new Error('Email was not valid')
		}



		// hash the password - we dont want to store it directly
		var passwordHash = bcrypt.hashSync(form.password, saltRounds)

		// create the user
		User.insert(uuid, form.name, form.email, passwordHash)

		// set the userId as a cookie
		res.cookie('userId', uuid)

		// redirect to the logged in page
		res.redirect('/times')
	} 
	catch (error) {
		console.error(error.message)
		res.render('create-account.html', {
			errorMessage: error.message
		})
	}
})

// show the sign-in page
routes.get('/sign-in', function(req, res) {
  res.render('sign-in.html')
})

routes.post('/sign-in', function(req, res) {
  var form = req.body

  // find the user that's trying to log in
  var user = User.findByEmail(form.email)

  // if the user exists...
  if (user) {
    console.log({ form, user })
    if (bcrypt.compareSync(form.password, user.passwordHash)) {
      // the hashes match! set the log in cookie
      res.cookie('userId', user.id)
      // redirect to main app:
      res.redirect('/times')
    } else {
      // if the username and password don't match, say so
      res.render('sign-in.html', {
        errorMessage: 'Email address and password do not match'
      })
    }
  } else {
    // if the user doesnt exist, say so
    res.render('sign-in.html', {
      errorMessage: 'No user with that email exists'
    })
  }
})

// handle signing out
routes.get('/sign-out', function(req, res) {
  // clear the user id cookie
  res.clearCookie('userId')

  // redirect to the login screen
  res.redirect('/sign-in')
})

// list all job times
routes.get('/times', function(req, res) {
	var loggedInUser = User.findById(req.cookies.userId)
	if (loggedInUser === null) {
		res.redirect('/sign-in')
		return
	}

	const usersJogTimes = JogTimes.findByUserId(req.cookies.userId)
	const formattedJogs = usersJogTimes.map(jog => ({ ...jog, startTime: formatDateForHTML(jog.startTime) }))

  var totalDistance = usersJogTimes.reduce((acc, curr) => acc + curr.distance, 0)
  var totalTime = usersJogTimes.reduce((acc, curr) => acc + curr.duration, 0)
  var avgSpeed = totalDistance / totalTime

  res.render('list-times.html', {
    user: loggedInUser,
    stats: {
      totalDistance: totalDistance.toFixed(2),
      totalTime: totalTime.toFixed(2),
      avgSpeed: avgSpeed.toFixed(2)
    },

    times: formattedJogs
  })
})

// show the create time form
routes.get('/times/new', function(req, res) {
  // this is hugely insecure. why?
	var loggedInUser = User.findById(req.cookies.userId)
	
  res.render('create-time.html', {
    user: loggedInUser
  })
})

// handle the create time form
routes.post('/times/new', function(req, res) {
  const { startTime, distance, duration } = req.body

	JogTimes.insert(req.cookies.userId, startTime, distance, duration)

  res.redirect('/times')
})

// show the edit time form for a specific time
routes.get('/times/:id', function(req, res) {
  var timeId = req.params.id
	console.log('get time', timeId)
	const loggedInUser = User.findById(req.cookies.userId)
	const jog = JogTimes.findJogWithId(timeId, loggedInUser.id)

	if (jog === null) {
		res.redirect('/times')
	} else {
		res.render('edit-time.html', {
			user: loggedInUser,
			time: jog
		})
	}
})

// handle the edit time form
routes.post('/times/:id', function(req, res) {
  var timeId = req.params.id
  const { startTime, distance, duration } = req.body
	
	JogTimes.update(startTime, distance, duration, timeId)

  res.redirect('/times')
})

// handle deleting the time
routes.get('/times/:id/delete', function(req, res) {
  var timeId = req.params.id

	JogTimes.delete(timeId)

  res.redirect('/times')
})

// show my account page
routes.get('/account', function(req, res) {
	var loggedInUser = User.findById(req.cookies.userId)
	if (loggedInUser === null) {
		res.redirect('/sign-in')
		return
	}

	const allUsers = User.findAll()
	const followers = loggedInUser.findFollowers()
	const followed = loggedInUser.findFollowed()

	res.render('my-account.html', {
		user: loggedInUser,
		allUsers,
		followers,
		followed
	})
})

// follow friend
routes.post('/follow', function(req, res) {
	const loggedInUser = User.findById(req.cookies.userId)

	if (req.body.follow_user_id != loggedInUser.id) {
		try {
			const info = loggedInUser.followUser(req.body.follow_user_id)
			console.log(info)
		} catch(error) {
			console.error(error.message)
		}
	}

	res.redirect('back')
})

// delete account
routes.get('/account/delete', function(req, res) {
	const info = User.remove(req.cookies.userId)
	console.log(info)

  res.clearCookie('userId')
  res.redirect('/sign-in')
})

// show the feed
routes.get('/feed', function(req, res) {
	var loggedInUser = User.findById(req.cookies.userId)
	if (loggedInUser === null) {
		res.redirect('/sign-in')
		return
	}

	const followedUsersJogs = JogTimes.findJogsFromFollowedUsers(loggedInUser.id)
	const formattedJogs = followedUsersJogs.map(jog => ({ ...jog, startTime: formatDateForHTML(jog.startTime) }))
	const rankings = loggedInUser.getRankings()

	res.render('feed.html', {
		user: loggedInUser,
		followedUsersJogs: formattedJogs,
		totalDistanceRanking: rankings.distance,
		totalDurationRanking: rankings.duration,
		averageSpeedRanking: rankings.speed
	})
})

module.exports = routes
