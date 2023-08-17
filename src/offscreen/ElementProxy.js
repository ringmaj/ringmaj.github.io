class ElementProxy {
  static nextProxyId = 0;
  constructor(element, worker, eventHandlers) {
    this.id = ElementProxy.nextProxyId++;
    this.worker = worker;
    const sendEvent = (data) => {
      this.worker.postMessage({
        type: "event",
        id: this.id,
        data,
      });
    };
    // register an id
    worker.postMessage({
      type: "makeProxy",
      id: this.id,
    });
    sendSize();
    for (const [eventName, handler] of Object.entries(eventHandlers)) {
      element.addEventListener(eventName, function (event) {
        handler(event, sendEvent);
      });
    }
    function sendSize() {
      const rect = element.getBoundingClientRect();
      sendEvent({
        type: "size",
        left: rect.left,
        top: rect.top,
        width: element.clientWidth,
        height: element.clientHeight,
      });
    }

    window.addEventListener("resize", sendSize);
  }
}
export { ElementProxy };
