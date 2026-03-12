// use this
// MetadataManager.getMetadata(695288171).then(metadata => AnnotationManager.init(metadata));



if (!window.Konva) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/konva@latest/konva.min.js';
  script.onload = () => console.log('Konva loaded from CDN');
  document.head.appendChild(script);
}
import {VideoAnnotator} from "../../../markrEdge/annotations/video-annotator.js";


// some elements
let debugBox1,debugBox2;
let konvaDiv1, konvaDiv2;
let inwardStage, outwardStage;
let inwardAnnotator, outwardAnnotator;
let inwardVideo, outwardVideo;

window.inwardStage = inwardStage;
window.outwardStage = outwardStage;

const AnnotationManager = {
  init(metadata) {
    console.log("AnnotationManager initialized");



    debugBox1 = document.getElementById("debug-exp-box-1-video");
    debugBox2 = document.getElementById("debug-exp-box-2-video");
    // console.log("Debug boxes found:", debugBox1, debugBox2);


    // create divs inside these for konva stages
    if (debugBox1 && !konvaDiv1) {
      konvaDiv1 = document.createElement("div");
      konvaDiv1.id = "konva-container-1";
      konvaDiv1.style.position = "absolute";
      debugBox1.appendChild(konvaDiv1);
      console.log(debugBox1);
    }

    if (debugBox2 && !konvaDiv2) {
      konvaDiv2 = document.createElement("div");
      konvaDiv2.id = "konva-container-2";
      konvaDiv2.style.position = "absolute";
      debugBox2.appendChild(konvaDiv2);
      console.log(debugBox2);
    }

if (konvaDiv1 && !inwardStage) {
    inwardStage = new Konva.Stage({
        container: konvaDiv1,
        // width: inwardVideo.offsetWidth,
        // height: inwardVideo.offsetHeight,
        width: 500,
        height: 500,
    });
}

if (konvaDiv2 && !outwardStage) {
    outwardStage = new Konva.Stage({
        container: konvaDiv2,
        // width: outwardVideo.offsetWidth,
        // height: outwardVideo.offsetHeight,
        width: 500,
        height: 500,
    });
}

    inwardVideo = debugBox1.querySelector("video");
    outwardVideo = debugBox2.querySelector("video");

    if (inwardAnnotator){
        inwardAnnotator.destroy();
    }
    if (outwardAnnotator){
        outwardAnnotator.destroy();
    }

    // show annotations
        inwardAnnotator = new VideoAnnotator(
        inwardVideo, 
        inwardStage, 
        metadata,
        ['Dsf','Multilane']
    );

    outwardAnnotator = new VideoAnnotator(
        outwardVideo,
        outwardStage,
        metadata,
        ['Header','InertialBar']
    );
    this.setResizeListenersForKonvaResizing();
},

setResizeListenersForKonvaResizing() {

    // Add event listeners for video size changes
    function updateInwardStageSize() {
        inwardStage.width(inwardVideo.offsetWidth);
        inwardStage.height(inwardVideo.offsetHeight);
    }

    function updateOutwardStageSize() {
        outwardStage.width(outwardVideo.offsetWidth);
        outwardStage.height(outwardVideo.offsetHeight);
    }

    // Listen for video resize events
    inwardVideo.addEventListener('loadedmetadata', updateInwardStageSize);
    outwardVideo.addEventListener('loadedmetadata', updateOutwardStageSize);

    // Use ResizeObserver to watch for actual video element size changes
    const inwardResizeObserver = new ResizeObserver(() => {
        updateInwardStageSize();
    });
    inwardResizeObserver.observe(inwardVideo);

    const outwardResizeObserver = new ResizeObserver(() => {
        updateOutwardStageSize();
    });
    outwardResizeObserver.observe(outwardVideo);
}
};

export { AnnotationManager };
