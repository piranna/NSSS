/**
 * Client of the NSSS (Not So SimpleSignaling) protocol
 * @constructor
 * @param {Object} configuration Configuration of the connection
 */
function NSSS(socket, uid, room)
{
  var self = this;

  /**
   * UUID generator
   */
  var UUIDv4 = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)};


  uid  = uid  || UUIDv4();
  room = room || '');

  var requestID = 0;


  function send(data)
  {
    socket.send(JSON.stringify(data));
  }


  socket.onopen = function()
  {
    // Message received
    socket.onmessage = function(event)
    {
      event = JSON.parse(event.data);

      var event2 = new Event(event.method);

      self.dispatchEvent(event2);
    };

    // Send our UID
    send({dest: uid});

    // Set signaling as open
    var event = new Event('open');

    self.dispatchEvent(event);
  };
  socket.onerror = function(event)
  {
    self.dispatchEvent(event);
  };


  function createNotification(method, params)
  {
    var notification =
    {
      jsonrpc: "3.0",
      method:  method
    };

    if(params)
    {
      if(params.length == 1 && params[0] instanceof object)
        params = params[0];

      notification.params = params
    }

    return notification
  }

  function createRequest(method, params)
  {
    var request = createNotification(method, params)

    request.id = requestID++

    return request
  }


  /**
   * Compose and send message
   * @param message Data to be send
   * @param {String|undefined} uid Identifier of the remote peer. If null,
   * message is send by broadcast to all connected peers
   */
  this.call = function(method, dest)
  {
    var request = createRequest(method, Array.prototype.slice.call(arguments, 2)

    request.dest = dest;

    send(request);
  };

  /**
   * Compose and send message
   * @param message Data to be send
   * @param {String|undefined} uid Identifier of the remote peer. If null,
   * message is send by broadcast to all connected peers
   */
  this.callBroadcast = function(method, room)
  {
    var request = createRequest(method, Array.prototype.slice.call(arguments, 2)

    if(room != undefined
    && room != null
    && room != '')
      request.room = room

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
