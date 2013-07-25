var DOMAIN = "193.147.51.35";


window.addEventListener('load', function(event)
{
  var pc = null;
  var nsss = null;
  var localStream = null;

  var sdpConstraints =
  {
    'mandatory':
    {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
    }
  };

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
    console.error(error);
  }

  function createPeerConnection(peerUID)
  {
    var pc = new webkitRTCPeerConnection(
    {
      iceServers: [{url: 'stun:'+'stun.l.google.com:19302'}]
    });

    pc.addStream(localStream);

    pc.onicecandidate = function(event)
    {
      if(event.candidate)
        nsss.call('candidate', peerUID, event.candidate, function(error)
        {
          if(error)
            console.error(error);

          else
            console.log("Sended candidate: " + event.candidate);
        });
    };

    return pc;
  }

  function enableVideo(pc)
  {
    var selfView   = document.getElementById('selfView');
    var remoteView = document.getElementById('remoteView');

    // Attach local stream to selfView
    var localStreams = pc.getLocalStreams();
    if(localStreams.length)
    {
      console.info("Changing selfView from local webcam to transmited stream");
      selfView.src = URL.createObjectURL(localStreams[0]);
    }

    // Attach remote stream to remoteView
    var remoteStreams = pc.getRemoteStreams();
    if(remoteStreams.length)
      remoteView.src = URL.createObjectURL(remoteStreams[0]);
  }

  function initUI(nsss)
  {
    // Chat input
    var chatinput = document.getElementById('chatinput');

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
    }, false);


    // Call button
    var callbutton = document.getElementById('callbutton');

    callbutton.addEventListener('click', function(event)
    {
      if(!localStream)
      {
        alert("Camera was not allowed");
        return
      }

      var peerUID = document.getElementById('peerUID').value;

      pc = createPeerConnection(peerUID);
      pc.createOffer(function(offer)
      {
        console.log(offer);

        // Set the peer local description
        pc.setLocalDescription(offer,
        function()
        {
          nsss.call('offer', peerUID, offer.sdp, function(error)
          {
            if(error)
              console.error(error);
          });
        },
        onerror);
      },
      onerror,
      sdpConstraints);
    });
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

  document.getElementById('uid').innerHTML = uid;

  var ws = new WebSocket('ws://'+DOMAIN+':8080');
  ws.addEventListener('close', function(event)
  {
    console.warn('close: '+event.code);
  });

  nsss = new NSSS(ws, uid,
  {
    message: function(from, text)
    {
      addToChat("["+from+"] "+text, "#0000FF");
    },

    offer: function(from, offer, callback)
    {
      function onerror(error)
      {
        console.error(error);
        callback(error);
      }

      pc = createPeerConnection(from);
      pc.setRemoteDescription(new RTCSessionDescription(
      {
        sdp:  offer,
        type: 'offer'
      }),
      function()
      {
        pc.createAnswer(function(answer)
        {
          console.log(answer);

          // Set the peer local description
          pc.setLocalDescription(answer,
          function()
          {
            callback(null, null, 'answer', answer.sdp, function(error)
            {
              if(error)
                console.error(error);

              else
                enableVideo(pc);
            });
          },
          onerror);
        },
        onerror,
        sdpConstraints);
      });
    },

    answer: function(from, answer, callback)
    {
      if(pc)
        pc.setRemoteDescription(new RTCSessionDescription(
        {
          sdp:  answer,
          type: 'answer'
        }),
        function()
        {
          console.info("Received answer");
          enableVideo(pc);
          callback();
        },
        function(error)
        {
          console.error(error);
          callback(error);
        });

      else
        console.error("Answer received and PeerConnection is not initialized");
    },

    candidate: function(from, candidate, callback)
    {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
      callback();
    }
  });
  nsss.addEventListener('open', function(event)
  {
    initUI(nsss);
  });

  // Camera
  navigator.webkitGetUserMedia({'audio': true, 'video': true},
  function(stream)
  {
    console.log('User has granted access to local media.');

    var selfView = document.getElementById('selfView');
    selfView.src = URL.createObjectURL(stream);

    localStream = stream;
  },
  function(error)
  {
    console.error(error);
  });
});