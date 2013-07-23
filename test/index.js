var DOMAIN = "193.147.51.35";


window.addEventListener('load', function(event)
{
  function addToChat(msg, color)
  {
    // Sanitize the input
    msg = msg.replace(/</g, '&lt;');

    if(color)
      msg = '<span style="color: '+color+'; padding-left: 15px">'+msg+'</span>';
    else
      msg = '<strong style="padding-left: 15px">'+msg+'</strong>';

    var messages = document.getElementById('messages');
        messages.innerHTML += msg + '<br>';
        messages.scrollTop = 10000;
  }


  function onerror(error)
  {
    console.error(error)
  }

  var pc;


  function initUI(nsss)
  {
//    var selfView   = document.getElementById('selfView');
//    var remoteView = document.getElementById('remoteView');


    // Chat input
    var chatinput = document.getElementById('chatinput')

    chatinput.addEventListener('keydown', function(event)
    {
      var key = event.which || event.keyCode;
      if(key === 13)
      {
        var text = chatinput.value;

        nsss.call('message', undefined, text);
        addToChat(text);

        chatinput.value = "";
      }
    }, false)


    // Call button
    var callbutton = document.getElementById('callbutton')

    callbutton.addEventListener('click', function(event)
    {
      var peerUID = document.getElementById('peerUID').value;

      pc = new webkitRTCPeerConnection(
      {
        iceServers: [{url: 'stun:'+'stun.l.google.com:19302'}]
      });
      pc.createOffer(function(offer)
      {
        console.log(offer)

        nsss.call('offer', peerUID, offer.sdp, function(error, answer)
        {
          console.log(answer)
        });
      },
      onerror)




/*      var eventHandlers =
      {
        'progress': function(event)
        {
          console.log('call is in progress');
        },
        'failed': function(event)
        {
          console.log('call failed with cause: '+ event.data.cause);
        },
        'ended': function(event)
        {
          console.log('call ended with cause: '+ event.data.cause);
        },
        'started': function(event)
        {
          var rtcSession = event.sender;

          console.log('call started');

          // Attach local stream to selfView
          var localStreams = rtcSession.getLocalStreams();
          if(localStreams.length)
            selfView.src = URL.createObjectURL(localStreams[0]);

          // Attach remote stream to remoteView
          var remoteStreams = rtcSession.getRemoteStreams();
          if(remoteStreams.length)
            remoteView.src = URL.createObjectURL(remoteStreams[0]);
        }
      };

      var options =
      {
        eventHandlers: eventHandlers,
        mediaConstraints: {'audio': true, 'video': false}
      };

      ws.call('sip:'+peer+'@'+DOMAIN, options);
*/    });
  };


  /**
   * UUID generator
   */
  var UUIDv4 = function b(a)
  {
    return a ? (a ^ Math.random() * 16 >> a / 4).toString(16)
             : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, b);
  };

  var uid = UUIDv4();

  document.getElementById('uid').innerHTML = uid

  var ws = new WebSocket('ws://'+DOMAIN+':8080')
  ws.addEventListener('close', function(event)
  {
    console.warn('close: '+event.code)
  });

  var nsss = new NSSS(ws, uid,
  {
    message: function(text)
    {
      addToChat(text, "#0000FF");
    },

    offer: function(offer, callback)
    {
      var pc = new webkitRTCPeerConnection(
      {
        iceServers: [{url: 'stun:'+'stun.l.google.com:19302'}]
      });

      pc.setRemoteDescription(new RTCSessionDescription(
      {
        sdp:  offer,
        type: 'offer'
      }),
      function()
      {
        pc.createAnswer(function(answer)
        {
          console.log(answer)

          pc.setLocalDescription(new RTCSessionDescription(
          {
            sdp: answer.sdp,
            type: 'answer'
          }),
          function()
          {
            callback(null, null, 'answer', answer.sdp, function(error, answer)
            {
              console.log(answer)
            });
          },
          function(error)
          {
            callback(error)
          });
        },
        function(error)
        {
          callback(error)
        })
      })
    },

    answer: function(answer, callback)
    {
      pc.setRemoteDescription(new RTCSessionDescription(
      {
        sdp:  answer,
        type: 'answer'
      }),
      function()
      {
        console.info("Received answer")
        callback()
      },
      function(error)
      {
        callback(error)
      });
    }
  })
  nsss.addEventListener('open', function(event)
  {
    initUI(nsss);
  });

})
