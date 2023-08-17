import { ElementProxyReceiver } from "./ElementProxyReceiver.js";
class ProxyManager {
  constructor() {
    this.targets = {};
    this.handleEvent = this.handleEvent.bind(this);
  }
  //   makeProxy(data) {
  //     const { id } = data;
  //     const proxy = new ElementProxyReceiver();
  //     this.targets[id] = proxy;
  //   }
  makeProxy(data) {
    const { id } = data;
    const proxy = new ElementProxyReceiver();
    this.targets[id] = proxy;
  }
  getProxy(id) {
    return this.targets[id];
  }
  handleEvent(data) {
    this.targets[data.id].handleEvent(data.data);
  }
}

export { ProxyManager };
