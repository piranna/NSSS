#!/usr/bin/env node


// Try to use CLIM (Console.Log IMproved) if available
try
{
  require("clim")(console, true);
}
catch(error){}


// SSL Certificates
var fs = require('fs');

var options = {key:  fs.readFileSync('certs/privatekey.pem').toString(),
			   cert: fs.readFileSync('certs/certificate.pem').toString(),
			   ca:  [fs.readFileSync('certs/certrequest.csr').toString()]};

// Get AppFog port, or set 8080 as default one (dotCloud mandatory)
var port = process.env.VMC_APP_PORT || 8080;

// HTTP server
function requestListener(req, res)
{
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('This is a SimpleSignaling handshake server. You can get a copy ');
  res.write('of the source code at ');
  res.end  ('<a href="http://github.com/piranna/SimpleSignaling">GitHub</a>');
}

var server = require('http').createServer(requestListener);
//var server = require('https').createServer(options, requestListener);
server.listen(port);

// Handshake server
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({server: server});

// Maximum number of connection to manage simultaneously before start closing
var MAX_PENDING_SOCKETS = 64;
var MAX_SOCKETS = 1024;

//Array to store connections (we want to remove them later on insertion order)
wss.pending_sockets = [];
wss.sockets = [];


/**
 * Find a socket on the sockets list based on its uid
 * @param {Array} sockets Array of sockets
 * @param {String} uid Identifier of the socket
 * @returns {Socket|undefined}
 */
function find(sockets, uid)
{
  for(var i=0, socket; socket = sockets[i]; i++)
    if(socket.uid == uid)
      return socket;
}


wss.on('connection', function(socket)
{
  function error(msg, ack)
  {
    var response =
    {
      error: msg,
    }

    if(ack)
      response.ack = ack;

    socket.send(JSON.stringify(response));
    console.warn(msg);
  };


  function register(uid, id)
  {
    var soc = find(wss.sockets, uid);

    // UID already registered
    if(soc)
      error("UID already registered: "+uid, id);

    // UID not registered previously, register it
    else if(uid)
    {
      // Close the oldest sockets if we are managing too much
      // (we earn some memory)
      if(MAX_SOCKETS)
        while(wss.sockets.length >= MAX_SOCKETS)
          wss.sockets[0].close();

      // Set the socket UID
      socket.uid = uid;

      // Start managing the new socket
      var index = wss.pending_sockets.indexOf(socket);

      wss.pending_sockets.splice(index, 1);
      wss.sockets.push(socket);

      if(id)
        socket.send(JSON.stringify({ack: id}));

      console.info("Registered UID: "+uid);
    }

    // UID not specified, raise error
    else
      error("UID not specified", id);
  }


  // Message received
  socket.onmessage = function(event)
  {
    var message = JSON.parse(event.data);

    console.log(message);

    var method = message.method;
    var to     = message.to;

    delete message.to;
    message.from = socket.uid;

    // Request (or combined request-response) message
    if(method)
    {
      var id = message.id;

      // Registration
      if(method == 'register')
        register(to, id);

      // Normal message, forward it
      else
      {
        // UID defined, try to send message to the peer
        if(to)
        {
          var soc = find(wss.sockets, to);

          // UID found, forward message
          if(soc)
             soc.send(JSON.stringify(message));

          // Trying to send a message to a non-connected peer, raise error
          else
            error("UID not found: "+to, id);
        }

        // UID not defined, send by broadcast
        else
          for(var i=0, soc; soc=wss.sockets[i]; i++)
            if(soc != socket)
               soc.send(JSON.stringify(message));
      };
    }

    // Response
    else
    {
      var ack = message.ack;

      if(ack)
      {
        // UID defined, try to send message to the peer
        if(to)
        {
          var soc = find(wss.sockets, to);

          // UID found, forward message
          if(soc)
             soc.send(JSON.stringify(message));

          // Trying to send a message to a non-connected peer, raise error
          else
            error("UID not found: "+to, ack);
        }
        else
          error("UID not specified", ack);
      }
      else
        error("Message ID not specified");
    };
  };

  /**
   * Remove the socket from the list of sockets and pending_sockets
   */
  socket.onclose = function()
  {
    var index = wss.pending_sockets.indexOf(socket);
    wss.pending_sockets.splice(index, 1);

    var index = wss.sockets.indexOf(socket);
    wss.sockets.splice(index, 1);
  };


  // Close the oldest pending sockets if we are managing too much (we earn
  // memory)
  while(wss.pending_sockets.length >= MAX_PENDING_SOCKETS)
    wss.pending_sockets[0].close();

  // Set the new socket as pending
  wss.pending_sockets.push(socket);
});