/**
 * Client of the NSSS (Not So SimpleSignaling) protocol
 * @constructor
 * @param {Object} configuration Configuration of the connection
 */
function NSSS(socket, uid, room, methods)
{
  if(typeof room == 'object')
  {
    methods = room;
    room = undefined;
  }

  EventTarget.call(this);

  socket.jsonrpc = "2.1";

  var self = this;

  var timeout = 5000;
  var handlers = {};
  var requestID = 1;

  /**
   * UUID generator
   */
  var UUIDv4 = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)};

  uid = uid || UUIDv4();

  function send(data)
  {
    socket.send(JSON.stringify(data));
  }

  function registerCB(request, cb)
  {
    var id = request.id = requestID++;

    handlers[id] = cb;

    setTimeout(function()
    {
      var handler = handlers[id];
      if(handler)
         handler.call(self, new Error('Timed Out'));

      delete handlers[id];
    }, timeout);
  }

  function initRequest(request, params)
  {
    var cb = (params.length && typeof params[params.length - 1] == 'function')
           ? params.pop()
           : null;

    if(params)
      request.params = params;
    if(cb)
      registerCB(request, cb);
  }

  socket.onopen = function()
  {
    // Message received
    socket.onmessage = function(event)
    {
      event = JSON.parse(event.data);

      console.debug(event);

      function result(err, res, method)
      {
        var params = Array.prototype.slice.call(arguments, 3);

        // requests without an id are notifications, to which responses are
        // supressed
        if(event.id)
        {
          var response =
          {
            jsonrpc: socket.jsonrpc,
            to:      event.from,
            ack:     event.id
          };

          if(err)
            response.error = new Error(err);

          else if(res)
            response.result = res;

          // Combined request inside response
          if(method)
          {
            response.method = method;

            initRequest(response, params);
          }

          // Send response
          send(response);
        }

        // Response was not required but we want to send a request,
        // do a normal call (a new dialog)
        else if(method)
          self.call.apply(self, [method, event.from].concat(params));
      }

      // ACK
      var ack = event.ack;
      if(ack)
      {
        var handler = handlers[ack];
        if(handler)
           handler.call(self, event.error, event.result);

        delete handlers[ack];
      }

      // RPC
      var method = methods[event.method];
      if(typeof method == 'function')
      {
        // push result function as the last argument
        var params = [event.from].concat(event.params || [], [result]);

        // invoke the method
        try
        {
          method.apply(methods, params);
        }
        catch(err)
        {
          result(err);
        }
      }
      else
        result(new Error('Method Not Found'));
    };

    // Send our UID
    var request =
    {
      jsonrpc: socket.jsonrpc,
      method:  'register',
      to:      uid
    };
    send(request);

    // Set signaling as open
    var event = new Event('open');

    self.dispatchEvent(event);
  };
  socket.onerror = function(event)
  {
    self.dispatchEvent(event);
  };


  /**
   * Compose and send message
   * @param message Data to be send
   * @param {String|undefined} uid Identifier of the remote peer. If null,
   * message is send by broadcast to all connected peers
   */
  this.call = function(method, to)
  {
    var request =
    {
      jsonrpc: socket.jsonrpc,
      method:  method,
      to:      to
    };

    initRequest(request, Array.prototype.slice.call(arguments, 2));

    send(request);
  };


  /**
   * Get the current UID
   * @returns {String}
   */
  this.__defineGetter__('uid', function()
  {
    return uid;
  });

  /**
   * Get the broadcast room
   * @returns {String}
   */
  this.__defineGetter__('room', function()
  {
    return room;
  });
}