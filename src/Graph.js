import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
// import * as GeometryUtils from "three/addons/utils/GeometryUtils.js";
import { View } from "./View.js";
// import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
// import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
// import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
// import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
// import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
// import { Line } from "three";

if (View.MUTE_LOGS) console.log = function () {};

class Graph {
  static control_points_arr = [];
  static numTimeSteps = 60;
  static startX = 0;
  static endX = 0;
  static distanceStep = 0;
  static graphs_arr = [];
  static degrees = 360;
  static vert_value = 0;
  static x_value = 0;
  static y_value = 0;
  static z_value = 0;

  processY(y_value, vert) {
    this.current_time_circle.position.set(y_value.x, y_value.y, 0);

    if (this.rotation === null) {
      let new_end = this.upperBound - this.lowerBound;
      let new_y = y_value.y - this.lowerBound;
      let percentage = new_y / new_end;
      Graph.vert_value = percentage * 3;
    } else {
      let distance = this.upperBound - this.lowerBound;
      let delta = distance / 2;
      let midPoint = this.upperBound - delta;
      if (y_value.y > midPoint) {
        let new_end = this.upperBound - midPoint;
        let new_y = y_value.y - midPoint;
        let percentage = new_y / new_end;
        let output = percentage * Graph.degrees;
        this.degrees = output;

        // console.log(`DEGREES: ${percentage * Graph.degrees}`);
      } else if (y_value.y < midPoint) {
        let new_end = this.upperBound - midPoint;
        let new_y = y_value.y - midPoint;
        let percentage = new_y / new_end;
        let output = percentage * Graph.degrees - Graph.degrees;
        this.degrees = output;
      }
      //else console.log(`NEGATIVE`);
    }
  }

  play() {
    if (this.timeline_bar.position.x >= Graph.endX) {
      this.timeline_bar.position.x = Graph.startX;
    } else {
      this.timeline_bar.position.x += Graph.distanceStep;
      let t_value = this.getTValue();
      if (t_value) {
        let y_value = this.spline.getPointAt(t_value);
        this.processY(y_value, this.vertData);

        // console.log(`t value: ${t_value}`);
        // console.log(`y: ${y_value.x}`);
      }

      //   console.log(
      //     `timelinebar x: ${this.timeline_bar.position.x + this.x_offset - 10}`
      //   );
      //   console.log(`y val: ${}`)
    }
  }

  updateStyle(ID, selector, value) {
    self.postMessage({
      type: "updateStyle",
      ID: ID,
      selector: selector,
      value: value,
    });
  }

  moveLabels(obj) {
    const vector = obj.position.clone();
    vector.y += 1.5;

    vector.project(this.camera);
    vector.x = Math.round(
      (0.5 + vector.x / 2) * (1440 / this.devicePixelRatio)
    );
    vector.y = Math.round((0.5 - vector.y / 2) * (900 / this.devicePixelRatio));

    let ID = obj.userData.labelID;
    // console.log(ID);
    this.updateStyle(ID, "top", `${vector.y * 2}px`);
    this.updateStyle(ID, "left", `${vector.x * 2}px`);

    // console.log(`pixel ratio: ${this.devicePixelRatio}`);

    // obj.userData.element.style.top = `${vector.y}px`;
    // obj.userData.element.style.left = `${vector.x}px`;
  }

  getTValue() {
    if (
      this.timeline_bar.position.x < this.startX ||
      this.timeline_bar.position.x > this.endX
    )
      return null;

    let xPos = this.timeline_bar.position.x - this.startX;
    let new_start = 0;
    let new_end = this.endX - this.startX;

    return xPos / new_end;
  }

  addTimelineBar() {
    let startPoint, endPoint;
    // startPoint = new THREE.Vector3(-10 + this.x_offset, this.y_offset, 0);
    // endPoint = new THREE.Vector3(-10 + this.x_offset, this.y_offset + 6, 0);
    let verts = [];
    verts.push(0, 0, 0);
    verts.push(0, 5.9, 0);
    const geometry = new LineGeometry();
    geometry.setPositions(verts);
    let matLine = new LineMaterial({
      color: 0x730208,
      linewidth: 0.002,
      alphaToCoverage: false,
    });

    this.timeline_bar = new Line2(geometry, matLine);
    this.timeline_bar.name = "timeline_bar_" + this.name;
    this.timeline_bar.position.set(this.x_offset - 10, this.y_offset - 0.25, 0);
    console.log(`POSITION X START: ${this.x_offset - 10}`);

    // Add current scrubber circle
    const material = new THREE.MeshBasicMaterial({ color: 0x0062ff });
    const current_time_circle = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 32),
      material
    );

    this.current_time_circle = current_time_circle;
    this.current_time_circle.position.copy(this.timeline_bar.position);

    // midpoint line
    let distance = this.upperBound - this.lowerBound;
    let delta = distance / 2;
    let midPoint = this.upperBound - delta;

    verts = [];
    verts.push(28.5, midPoint, 0);
    verts.push(34, midPoint, 0);
    geometry.setPositions(verts);
    matLine = new LineMaterial({
      color: 0x586940,
      linewidth: 0.002,
      alphaToCoverage: false,
    });

    this.midPointLine = new Line2(geometry, matLine);
  }

  createLabel(ID, text) {
    let graphContainerID = "skateSectionContainer";

    self.postMessage({
      type: "createPointLabel",
      labelID: ID,
      labelText: text,
    });
  }

  addControlPoint(splineObj, index) {
    // console.log(`${splineObj.name} IS ADDING A CONTROL POINT TO : ${vP}`);
    // this.controlPointGroup1 = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0x0062ff });
    const control_point = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 32),
      material
    );
    const control_point_outline = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    const pos = splineObj[index];
    control_point.position.set(pos.x, pos.y, 0.001);
    control_point.add(control_point_outline);
    control_point.name = "control_point_" + index;
    control_point_outline.name = "control_point_outline_" + index;

    control_point.userData.splineObj = splineObj;
    control_point.userData.controlIndex = index;
    control_point.userData.isControlPoint = true;
    control_point.userData.lowerBound = this.y_offset;
    control_point.userData.upperBound = this.y_offset + 6;
    this.upperBound = this.y_offset + 6;
    this.lowerBound = this.y_offset;
    control_point.userData.leftBound = this.x_offset - 10;
    control_point.userData.rightBound = this.x_offset + 5.5;
    control_point.userData.Graph = this;

    let text = `p${control_point.userData.controlIndex[1]}`;
    let ID = `${this.name}-${text}`;
    this.createLabel(ID, text);
    control_point.userData.labelID = ID;

    // let graphContainer = document.getElementById("skateSectionContainer");
    // let point_label_elem = document.createElement("p");
    // point_label_elem.setAttribute("class", "point-label");
    // point_label_elem.innerHTML = `p${control_point.userData.controlIndex[1]}`;
    // graphContainer.appendChild(point_label_elem);
    // control_point.userData.element = point_label_elem;
    control_point.userData.leftBound = this.x_offset - 10;

    if (this.previousControlPoint) {
      control_point.userData.previousControlPoint = this.previousControlPoint;
      this.previousControlPoint.userData.nextControlPoint = control_point;
    }

    this.previousControlPoint = control_point;

    console.log(control_point);
    // console.log(splineObj["v0"]);

    this.moveLabels(control_point);
    Graph.control_points_arr.push(control_point);
  }
  updateGeometry() {
    let positions = [];
    this.points = [];
    const colors = [];
    let x_offset = this.x_offset;
    let y_offset = this.y_offset;
    const divisions = 250;
    const point = new THREE.Vector3();
    const color = new THREE.Color();

    for (let i = 0, l = divisions; i < l; i++) {
      const t = i / l;

      this.spline.getPoint(t, point);
      if (i === 0) this.startX = point.x;
      else this.endX = point.x;
      positions.push(point.x, point.y, point.z);
      this.points.push(point.x, point.y, point.z);

      color.setHSL(t, 1.0, 0.5, THREE.SRGBColorSpace);
      colors.push(color.r, color.r, color.r);
    }
    console.log(`number of points generated: ${positions.length}`);

    let geometry = new LineGeometry();
    geometry.setPositions(positions);
    geometry.setColors(colors);

    this.line.geometry = geometry;
    this.line.computeLineDistances();

    // Update control point lines
    positions = [];
    let z = -0.001;
    positions.push(this.spline.v0.x, this.spline.v0.y, z);
    positions.push(this.spline.v1.x, this.spline.v1.y, z);
    positions.push(this.spline.v2.x, this.spline.v2.y, z);
    geometry = new LineGeometry();
    geometry.setPositions(positions);
    this.controlLine.geometry = geometry;
    this.controlLine.computeLineDistances();

    console.log(`start x: ${this.startX} | end x: ${this.endX}`);
    this.spline.updateArcLengths();
  }
  init() {
    let positions = [];
    const colors = [];
    let x_offset = this.x_offset;
    let y_offset = this.y_offset;

    // const points = GeometryUtils.hilbert3D(
    //   new THREE.Vector3(0, 0, 0),
    //   20.0,
    //   1,
    //   0,
    //   1,
    //   2,
    //   3,
    //   4,
    //   5,
    //   6,
    //   7
    // );

    // const spline = new THREE.CatmullRomCurve3(points);
    this.spline = new THREE.QuadraticBezierCurve(
      new THREE.Vector2(-10 + x_offset, 0 + y_offset),
      //   new THREE.Vector2(-3 + x_offset, 2.5 + y_offset),
      new THREE.Vector2(0 + x_offset, 5 + y_offset),
      new THREE.Vector2(5.5 + x_offset, 0 + y_offset)
    );

    this.addControlPoint(this.spline, "v0");
    this.addControlPoint(this.spline, "v1");
    this.addControlPoint(this.spline, "v2");
    console.log(Graph.control_points_arr);

    console.log(this.spline);
    const divisions = 250;
    const point = new THREE.Vector3();
    const color = new THREE.Color();

    for (let i = 0, l = divisions; i < l; i++) {
      const t = i / l;

      this.spline.getPoint(t, point);
      if (i === 0) this.startX = point.x;
      else this.endX = point.x;
      positions.push(point.x, point.y, point.z);
      this.points.push(point.x, point.y, point.z);

      color.setHSL(t, 1.0, 0.5, THREE.SRGBColorSpace);
      colors.push(color.r, color.r, color.r);
    }
    let geometry = new LineGeometry();
    geometry.setPositions(positions);
    geometry.setColors(colors);

    let matLine = new LineMaterial({
      //   color: 0x00ff00,
      color: 0xffa600,
      linewidth: 0.005, // in world units with size attenuation, pixels otherwise
      //   vertexColors: true,

      //resolution:  // to be set by renderer, eventually
      dashed: false,
      alphaToCoverage: false,
    });
    let line = new Line2(geometry, matLine);
    line.computeLineDistances();
    line.scale.set(1, 1, 1);
    line.name = "rotation_line";
    this.line = line;
    console.log(this.line);
    this.line.verticesNeedUpdate = true;

    // Generate control point lines
    positions = [];
    let z = -0.001;
    positions.push(this.spline.v0.x, this.spline.v0.y, z);
    positions.push(this.spline.v1.x, this.spline.v1.y, z);
    positions.push(this.spline.v2.x, this.spline.v2.y, z);

    geometry = new LineGeometry();
    geometry.setPositions(positions);
    geometry.setColors(colors);

    matLine = new LineMaterial({
      //   color: 0x00ff00,
      color: 0xb5988d,
      linewidth: 0.0025, // in world units with size attenuation, pixels otherwise
      //   vertexColors: true,

      //resolution:  // to be set by renderer, eventually
      dashed: true,
      dashSize: 0.4,
      gapSize: 0.2,
      alphaToCoverage: false,
    });
    // matLine = new THREE.LineDashedMaterial({
    //   color: 0xb5988d,
    //   linewidth: 1,
    //   scale: 1,
    //   dashSize: 3,
    //   gapSize: 1,
    // });

    let controlLine = new Line2(geometry, matLine);
    controlLine.computeLineDistances();
    controlLine.scale.set(1, 1, 1);
    controlLine.name = "control_line";
    this.controlLine = controlLine;
    console.log(this.controlLine);
    this.controlLine.verticesNeedUpdate = true;

    this.controlPointGroup1 = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0x0062ff });
    this.control_point_1 = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 32),
      material
    );
    this.control_point_1_outline = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    this.control_point_1.position.copy(
      new THREE.Vector3(0 + x_offset, 8 + y_offset, 0)
    );
    this.control_point_1.add(this.control_point_1_outline);
    this.control_point_1.name = "control_point_1";
    console.log(this.control_point_1);
    this.control_point_1.userData.splineObj = this.spline;
    this.control_point_1.userData.isControlPoint = true;
    console.log(this.spline);
    this.control_point_1_outline.name = "control_point_1_outline";

    this.addTimelineBar();

    // rotations to match user perspective
    if (this.rotation === "x") this.rotationVector = new THREE.Vector3(0, 0, 1);
    else if (this.rotation === "y")
      this.rotationVector = new THREE.Vector3(0, 1, 0);
    else if (this.rotation === "z")
      this.rotationVector = new THREE.Vector3(1, 0, 0);
  }
  constructor(
    name,
    renderer,
    scene,
    camera,
    x_offset,
    y_offset,
    rotation = null
  ) {
    this.name = name;
    this.camera = camera;
    this.scene = scene;
    this.devicePixelRatio = renderer.getPixelRatio();
    this.x_offset = x_offset;
    this.y_offset = y_offset;
    let start = -10 + x_offset;
    let end = 5.5 + x_offset;
    this.degrees = 0;
    this.rotationVector;
    this.rotation = rotation;

    Graph.distance = end - start;
    Graph.startX = start;
    Graph.endX = end;
    Graph.distanceStep = (end - start) / Graph.numTimeSteps;

    this.previousControlPoint = null;
    this.nextControlPoint = null;
    this.points = [];
    this.init();
    scene.add(this.current_time_circle);
    console.log(this.points);
    scene.add(this.line);
    scene.add(this.controlLine);
    scene.add(this.timeline_bar);
    scene.add(this.midPointLine);
    Graph.graphs_arr.push(this);
    console.log(Graph.graphs_arr);
    for (let i = Graph.control_points_arr.length - 1; i >= 0; i--) {
      scene.add(Graph.control_points_arr[i]);
    }
  }
}

export { Graph };
