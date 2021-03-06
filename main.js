var Botkit = require('botkit');
var controller = Botkit.slackbot();
var os = require('os');
var request = require('request');
var prettyjson = require('prettyjson')
var token = ''

var headers = {
  'Authorization': process.env.DAOCLOUD_TOKEN
}

var channel = process.env.SLACK_CHANNEL_ID

var bot = controller.spawn({
  token: process.env.SLACK_TOKEN
})
bot.startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }
  bot.say({text: 'Hi! I\'m Daocloud Bot! ', channel: channel})
});

controller.hears(['hello','hi'],'direct_message,direct_mention,mention',function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    },function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(',err);
        }
    });


    controller.storage.users.get(message.user,function(err, user) {
        if (user && user.name) {
            bot.reply(message,'Hello ' + user.name + '!!');
        } else {
            bot.reply(message,'Hello.');
        }
    });
});

controller.hears(['call me (.*)'],'direct_message,direct_mention,mention',function(bot, message) {
    var matches = message.text.match(/call me (.*)/i);
    var name = matches[1];
    controller.storage.users.get(message.user,function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user,function(err, id) {
            bot.reply(message,'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['what is my name','who am i'],'direct_message,direct_mention,mention',function(bot, message) {

    controller.storage.users.get(message.user,function(err, user) {
        if (user && user.name) {
            bot.reply(message,'Your name is ' + user.name);
        } else {
            bot.reply(message,'I don\'t know yet!');
        }
    });
});


controller.hears(['shutdown'],'direct_message,direct_mention,mention',function(bot, message) {

    bot.startConversation(message,function(err, convo) {
        convo.ask('Are you sure you want me to shutdown?',[
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    },3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});


controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot, message) {

    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());

    bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + ' on ' + hostname + '.');

});

controller.hears(['list apps'], 'direct_message,direct_mention,mention', function(bot, message) {
  request({url: 'https://openapi.daocloud.io/v1/apps', headers: headers}, function (error, response, body) {
      //if (!error && response.statusCode == 200) {

        var json = JSON.parse(body)
        var str = ''
        var i;
        for (i = 0; i < json['app'].length; i++) {
          var app = json['app'][i];
          str += app['name']
          str += ' ' + app['state']
          str += ' ' + app['release_name']
          str += ' ' + app['last_operated_at']
          str += '\n'
        }
        console.log(JSON.stringify(json))
        bot.reply(message, str)
      //}
  })
})
controller.hears(['list build-flows'], 'direct_message,direct_mention,mention', function(bot, message) {
  request({url: 'https://openapi.daocloud.io/v1/build-flows', headers: headers}, function (error, response, body) {
        var json = JSON.parse(body)
        var i;
        var buildflows = json['build_flows']
        var str = '';
        for (i = 0; i < buildflows.length; i++) {
          var buildflow = buildflows[i]
          str += buildflow['name']
          str += ' ' + buildflow['status']
          str += ' ' + buildflow['repo']
          str += '\n'
        }
        console.log(JSON.stringify(json))
        bot.reply(message, str)
  })
})
function getAppIdByName(name, callback) {
  request({url: 'https://openapi.daocloud.io/v1/apps', headers: headers}, function (error, response, body) {
        var json = JSON.parse(body)
        var i;
        for (i = 0; i < json['app'].length; i++) {
          var app = json['app'][i];
          console.log(app['name'])
          if (app['name'] == name) {
            callback(app['id'])
          }
        }
        console.log(JSON.stringify(json))
  })
}
controller.hears(['app info (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
  var matches = message.text.match(/app info (.*)/i);
  var name = matches[1];
  console.log(name)
  getAppIdByName(name, function(id) {
    console.log(id)
    request({url: 'https://openapi.daocloud.io/v1/apps/'+id, headers: headers}, function (error, response, body) {
          json = JSON.parse(body)
          var str = prettyjson.render(json, {'noColor': true, 'defaultIndentation': 4})
          bot.reply(message, str)
    })
  })
})

controller.hears(['app redeploy (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
  var matches = message.text.match(/app redeploy (\S*) (\S*)/i);
  var name = matches[1];
  console.log(name)
  getAppIdByName(name, function(id) {
    var release_name = matches[2];
    console.log(id);
    console.log(release_name);
    request.post({url: 'https://openapi.daocloud.io/v1/apps/'+id+'/actions/redeploy', headers: headers, json:{'release_name': release_name}}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log(body)
          var str = prettyjson.render(body, {'noColor': true, 'defaultIndentation': 4})
          bot.reply(message, str)
        } else {
          bot.reply(message, 'error')
        }
    })
  })
})

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
app.post('/', function (req, res) {
  console.log(req.body);
  var str = prettyjson.render(req.body, {'noColor': true, 'defaultIndentation': 4})
  bot.say({text: str, channel: channel})
  res.send('POST request to the homepage');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
})
