require('dotenv').config({ path: '.env' })
const path = require('path')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const Nexmo = require('nexmo')
const request = require('request');


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const TO_NUMBER = process.env.TO_NUMBER
const NEXMO_NUMBER = process.env.NEXMO_NUMBER
const BASE_URL = process.env.BASE_URL

const NEXMO_API_KEY = process.env.NEXMO_API_KEY
const NEXMO_API_SECRET = process.env.NEXMO_API_SECRET
const NEXMO_APPLICATION_ID = process.env.NEXMO_APPLICATION_ID
const NEXMO_APPLICATION_PRIVATE_KEY_PATH = process.env.NEXMO_APPLICATION_PRIVATE_KEY_PATH

const nexmo = new Nexmo({
  apiKey: NEXMO_API_KEY,
  apiSecret: NEXMO_API_SECRET,
  applicationId: NEXMO_APPLICATION_ID,
  privateKey: NEXMO_APPLICATION_PRIVATE_KEY_PATH
},{debug:true})

// Serve contents of public folder in the /audio path
app.use('/audio', express.static(path.join(__dirname, 'public')))

const answer_url = BASE_URL + '/audio/answer.json'
//const answer_url = BASE_URL + '/webhooks/answer'
const audio_url = BASE_URL + '/audio/music.mp3'
const event_url = BASE_URL + '/webhooks/events'

const makeOutboundCall = (req, res) => {
  console.log('Making the outbound call...');
  //console.log(req.query.n);
  res.end("Ok");
  console.log(TO_NUMBER);
  nexmo.calls.create({
    to: [{
      type: 'phone',
      number: TO_NUMBER
    }],
    from: {
      type: 'phone',
      number: NEXMO_NUMBER
    },
    ncco: [
      {
        action: "stream",
        streamUrl: [
          "https://5822b039.ngrok.io/audio/Info1.mp3"
        ]
      }
    ]
    //answer_url: [answer_url],
    //event_url: [event_url]
  })
}

const AUDIO_URL = 'https://nexmo-community.github.io/ncco-examples/assets/voice_api_audio_streaming.mp3';


const start_stream = (call_uuid) => {
  const nexmo = new Nexmo({
    apiKey: NEXMO_API_KEY,
    apiSecret: NEXMO_API_SECRET,
    applicationId: NEXMO_APPLICATION_ID,
    privateKey: NEXMO_APPLICATION_PRIVATE_KEY_PATH
  });
  console.log(`streaming ${audio_url} into ${call_uuid}`)
  nexmo.calls.stream.start(call_uuid, { stream_url: [AUDIO_URL], loop: 0 }, (err, res) => {
    if (err) {
      console.log("Error found");
      console.error(err)
    }
    else {
      console.log(res)
    }
  })
}

const stop_stream = (call_uuid) => {
  nexmo.calls.stream.stop(call_uuid, (err, res) => {
    if (err) {
      console.error(err)
    }
    else {
      console.log("Response found");
      console.log(res)
    }
  })
}

app.get('/call', makeOutboundCall)

app.post('/webhooks/events', (req, res) => {
  if (req.body.status == 'answered') {
    
    const call_uuid = req.body.uuid
    console.log(call_uuid)
    // Play audio into call
    start_stream(call_uuid)

    // Disconnect the call after 20 secs
    setTimeout(() => {
      //stop_stream(call_uuid)
      nexmo.calls.update(call_uuid, { action: 'hangup' }, (req, res) => {
        console.log("Disconnecting...")
      });
    }, 5000)
  }
  res.status(200).end()
})

app.post("/our", (req, res) => console.log(`Hello Julien \n\n\n\\n\n\n\\n\n${req.body}`));

app.get('/webhooks/answer', (req, res) => {

  const ncco = [{
    action: "talk",
    text: "Welcome to a Voice API I V R.",
    voiceName: "Chipmunk",
    bargeIn: false,
  },
  {
    action: "talk",
    text: "Press 1, for maybe, and 2, for not sure, followed by the hash key.",
    voiceName: "Chipmunk",
    bargeIn: true,
  },
  {
    action: "input",
    maxDigits: 1,
    timeOut: 20,
    submitOnHash: true,
    eventUrl: [`https://5822b039.ngrok.io/webhooks/play`]
}]

  res.json(ncco)
})


app.post('/webhooks/play', (req, res) => {
  const uuid = req.body.uuid;
  nexmo.calls.stream.start(uuid, { stream_url: [AUDIO_URL], loop: 0 }, (err, res) => {
    if (err) {
      console.log("Error found");
      console.error(err)
    }
    else {
      console.log(res)
    }
  })

  setTimeout(() => {
    //stop_stream(call_uuid)
    nexmo.calls.update(uuid, { action: 'hangup' }, (req, res) => {
      console.log("Disconnecting...")
    });
  }, 15000)
})

// app.post('/webhooks/events', (req, res) => {
//   console.log(req.body)
//   res.send(200);
// })

app.post('/webhooks/dtmf', (req, res) => {
  console.log(req.body);
  let number = req.body.dtmf || 42;
  let message = "";
  console.log(number);
  request(`http://numbersapi.com/${number}`, (error, response, body) => {
    if (error) {
      message = "The Numbers API has thrown an error."
    } else {
      message = body
    }
    console.log(message);
    const ncco = [{
      action: 'talk',
      bargeIn: true,
      voiceName: 'Chipmunk',
      text: `<speak><s>${message}</s> <s>Enter another number if you want to continue or just hang up the call if you've had enough.</s></speak>`
    },
    {
      action: 'input',
      maxDigits: 1,
      timeOut: 10,
      submitOnHash: true,
      eventUrl: [`https://5822b039.ngrok.io/webhooks/events`]
    }]

    res.json(ncco)
  })
})


// Serve app on port 3000
app.listen(3000)

