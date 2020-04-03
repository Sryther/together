module.exports = function(options, imports, register) {
    var mongoose = imports.db;
    var findOrCreate = require('mongoose-findorcreate');
    var ensure = require('connect-ensure-login');
    var router = require('express').Router();

    var userSchema = mongoose.Schema({
        id: String,
        username: String,
        displayName: String,
        gender: String,
        profileUrl: String,
        provider: String,
        verified: Boolean,
        bio: String,
        image: String
    });
    userSchema.plugin(findOrCreate);

    var User = mongoose.model('User', userSchema);

    var users = {
        all: function(callback) {
            User.find({}, function(err, users) {
                if (err) return callback(err);
                callback(null, users);
            });
        },
        get: function(id, callback) {
            User.findOne({
                id: id
            }, function(err, user) {
                if (err) return callback(err);
                callback(null, user);
            });
        },
        create: function(user) {
            var newUser = new User({
                fullname: user.fullname,
                email: user.email,
                country: user.country,
                city: user.city,
                last_seen: Date.now()
            });

            newUser.save(function(err) {
                if (err) return console.error(err);
                return true;
            });
        },
        update: function(user) {
            User.findOne({
                id: req.params.id
            }, function(err, u) {
                if (!err) {
                    if (u === null) {
                        u = new User(user);
                    }
                    u.save(function(err) {
                        if (err) return console.error(err);
                        return true;
                    });
                }
            });
        }
    };

    router.get('/profile', ensure.ensureLoggedIn('/auth/signin'), function(req, res) {
        res.render('app/user/profile', {
            user: req.user
        });
    });

    router.get('/:id', ensure.ensureLoggedIn('/auth/signin'), function(req, res) {
        users.get(req.params.id, function(err, u) {
            res.render('app/user/profile', {
                user: u
            });
        });
    });

    register(null, {
        "users": {
            controller: users,
            model: User,
            router: router
        }
    });
};
