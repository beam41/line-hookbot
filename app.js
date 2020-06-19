const express = require('express')
const line = require('@line/bot-sdk');
const fs = require('fs')
require('dotenv').config()

const app = express()
app.use(express.json());

let groupList
try {
    groupList = new Set(JSON.parse(fs.readFileSync('./data.json')))
}
catch {
    groupList = new Set()
}

const client = new line.Client({
    channelAccessToken: process.env.LINE_TOKEN
});

app.post('/line-webhook', function (req, res) {
    if (req.query.key === process.env.SECRET) {
        console.log('New hook from line')
        if (req.body.events) {
            req.body.events.filter(val => val.type === 'join').forEach(v => {
                groupList.add(v.source.groupId)
                client.pushMessage(v.source.groupId,
                    [
                        {
                            type: 'text',
                            text: "Hello! This group id is"
                        },
                        {
                            type: 'text',
                            text: v.source.groupId
                        },
                        {
                            type: 'text',
                            text: `Please save so you don't have to re-add me again after server restart. (I don't have persistent storage 😢)`
                        }
                    ]
                )
            })
            req.body.events.filter(val => val.type === 'leave').forEach(v => {
                groupList.remove(v.source.groupId)
            })
            fs.writeFileSync('./data.json', JSON.stringify([...groupList]))
        }
        res.sendStatus(200)
    } else {
        res.sendStatus(401)
    }
})

app.post('/new-message', function (req, res) {
    if (req.query.key === process.env.SECRET) {
        // I tried multicast but doen't work
        groupList.forEach(group => {
            client.pushMessage(group, {
                type: 'text',
                text: req.body.text
            })
        })

        res.sendStatus(200)
    } else {
        res.sendStatus(401)
    }
})

app.patch('/manual-add-group', function (req, res) {
    if (req.query.key === process.env.SECRET) {
        if (req.body.groupId) {
            groupList.add(req.body.groupId)
            fs.writeFileSync('./data.json', JSON.stringify([...groupList]))
            return res.sendStatus(202)
        }
        res.sendStatus(400)
    } else {
        res.sendStatus(401)
    }
})

app.get('/test', function (req, res) {
    if (req.query.key === process.env.SECRET) {
        res.send([...groupList])
    } else {
        res.sendStatus(401)
    }
})

const port = process.env.PORT || 3000

app.listen(port, () => console.log(`Line webhook is listening at http://localhost:${port}`))