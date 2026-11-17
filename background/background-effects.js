// 背景渐变遮罩
(function () {
  'use strict';

  var CSS = '.bg-fx-mask{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;' +
    'background:' +
    'linear-gradient(90deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.30) 60%, rgba(0,0,0,0.16) 100%),' +
    'linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.26) 50%, rgba(0,0,0,0.16) 100%);}';

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  var mask = document.createElement('div');
  mask.className = 'bg-fx-mask';
  document.body.appendChild(mask);
})();
