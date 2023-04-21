const fs = require('fs');
const express = require('express');
const { google } = require('googleapis');

// Create an Express app
const app = express();

// Set up OAuth2 client
const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const { client_secret, client_id, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id, client_secret, redirect_uris[0]
);

// Define the login route
app.get('/login', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
  });
  res.redirect(authUrl); // Redirect the user to the authorization URL
});

// Handle the OAuth2 redirect URI
app.get('/oauth2callback', (req, res) => {
  const code = req.query.code;
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error getting access token:', err);
      res.status(500).send('Error getting access token');
      return;
    }
    oAuth2Client.setCredentials(token);
    // Redirect to the home route after successful authorization
    res.redirect('/home');
  });
});

// Define the home route
app.get('/home', (req, res) => {
  listMessages()
    .then(messages => {
      // Log the retrieved messages to the console
      console.log('Email Messages:');
      messages.forEach(message => {
        getMessage(message.id)
          .then(message => {
            console.log('- ' + message.labelIds + ': ' + message.payload.headers.find(header => header.name === 'Subject').value);
          })
          .catch(err => {
            console.error('Error getting message:', err);
          });
      });
    })
    .then(() => {
      res.send('Email messages printed in console.'); // Send a response to the client
    })
    .catch(err => {
      console.error('Error listing messages:', err);
      res.status(500).send('Error listing messages');
    });
});

// Function to list messages
function listMessages() {
  return new Promise((resolve, reject) => {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    gmail.users.messages.list({ userId: 'me' }, (err, res) => {
      if (err) reject(err);
      resolve(res.data.messages);
    });
  });
}

// Function to get message
function getMessage(messageId) {
  return new Promise((resolve, reject) => {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    gmail.users.messages.get({ userId: 'me', id: messageId }, (err, res) => {
      if (err) reject(err);
      resolve(res.data);
    });
  });
}

// Start the Express app
app.listen(3000, () => {
  console.log('App listening on http://localhost:3000');
});