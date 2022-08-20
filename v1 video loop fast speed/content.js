var enabled = false;
var coutn = 0;
const interval = setInterval(function() {
      if(!enabled){
        hotifiy();
      
      }
      coutn++;
     
}, 5000);

function hotifiy() {
  var v = document.querySelector("video");
if (v) {
    v.play();
	v.muted = true;
	v.playbackRate = 4.0;
  if (v.hasAttribute("loop")) {
 
  } else {
    v.setAttribute("loop", "");
    var a = document.querySelector("input#autoplay-checkbox");
    if (a) {
      a.checked = false;
    }
     enabled = true;
    
  }
  chrome.runtime.sendMessage({enabled: enabled});
}
}
