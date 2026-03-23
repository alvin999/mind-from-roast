/**
 * Timer Web Worker
 * 負責在背景執行計時器，避開瀏覽器對主執行緒的節流
 */

let timerId = null;
let timeLeft = 0;

self.onmessage = function(e) {
    const { action, value } = e.data;

    switch (action) {
        case 'start':
            timeLeft = value;
            if (timerId) clearInterval(timerId);
            
            timerId = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    self.postMessage({ type: 'tick', timeLeft: timeLeft });
                } else {
                    clearInterval(timerId);
                    timerId = null;
                    self.postMessage({ type: 'finish' });
                }
            }, 1000);
            break;

        case 'pause':
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
            break;

        case 'reset':
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
            timeLeft = value;
            break;
    }
};
