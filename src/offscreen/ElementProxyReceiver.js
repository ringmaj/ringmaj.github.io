import { EventDispatcher } from "https://unpkg.com/three@0.151.3/build/three.module.js";
function noop() {}
class ElementProxyReceiver extends EventDispatcher {
  style = {
    touchAction: null,
  };

  ownerDocument = this;

  constructor() {
    super();
  }
  get clientWidth() {
    return this.width;
  }
  get clientHeight() {
    return this.height;
  }
  getBoundingClientRect() {
    return {
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      right: this.left + this.width,
      bottom: this.top + this.height,
    };
  }
  handleEvent(data) {
    if (data.type === "size") {
      this.left = data.left;
      this.top = data.top;
      this.width = data.width;
      this.height = data.height;
      return;
    }
    data.preventDefault = noop;
    data.stopPropagation = noop;
    this.dispatchEvent(data);
  }
  focus() {
    // no-op
  }

  setPointerCapture(data) {
    // no-op
  }
  releasePointerCapture(data) {
    // no-op
  }
}

export { ElementProxyReceiver };
