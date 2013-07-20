/**
 * Client of the NSSS (Not So SimpleSignaling) protocol
 * @constructor
 * @param {Object} configuration Configuration of the connection
 */
function NSSS(socket, uid, room)
{
  var self = this;

  var requestID = 0;

  /**
   * UUID generator
   */
  var UUIDv4 = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)};

  uid = uid || UUIDv4();

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

      self.dispatchEvent(event);
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


  /**
   * Compose and send message
   * @param message Data to be send
   * @param {String|undefined} uid Identifier of the remote peer. If null,
   * message is send by broadcast to all connected peers
   */
  this.call = function(type, to)
  {
    var message =
    {
      type: type,
      to:   to,
      id:   requestID++
    };

    var args = Array.prototype.slice.call(arguments, 2);
    if(args)
      message.args = args

    send(message);
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