class Page {
  static lastPage = null;
  static currentPage = null;
  static target = null;
  sectionContainer;
  isRendered = false;
  viewName = null;
  canvasEntry = null;
  canvas = null;
  constructor(ID, worker = null, pixelRatio = 1) {
    this.name = ID;
    this.worker = worker;
    if (this.worker !== null && this.worker !== undefined) {
      this.isRendered = true;
      this.viewName = this.name.replace("SectionContainer", "View");
      let canvasEntryID = this.name.replace("SectionContainer", "CanvasEntry");
      this.canvasEntry = document.getElementById(canvasEntryID);
      let canvasID = this.name.replace("SectionContainer", "Canvas");
      this.canvas = document.getElementById(canvasID);
      this.pixelRatio = pixelRatio;
    }
    this.previousPage = Page.lastPage;
    this.sectionContainer = document.getElementById(ID);
    this.nextPage = null;
    if (this.previousPage) this.previousPage.nextPage = this;
    Page.lastPage = this;
    if (Page.current === null) Page.current = this;
  }
}

class PageManager {
  currentPage;

  constructor() {
    this.currentPage = null;
  }
}

export { PageManager, Page };
