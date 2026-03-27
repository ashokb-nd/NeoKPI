import "../markrEdge/konva.min.js";
import { VideoAnnotator } from "../markrEdge/annotations/video-annotator.js";

let debugBox1;
let debugBox2;
let konvaDiv1;
let konvaDiv2;
let inwardStage;
let outwardStage;
let inwardAnnotator;
let outwardAnnotator;
let inwardVideo;
let outwardVideo;
let inwardResizeObserver;
let outwardResizeObserver;
let inwardLoadedMetadataHandler;
let outwardLoadedMetadataHandler;

const AnnotationManager = {
    async init(metadata) {
        const KonvaLib = window.Konva;
        if (!KonvaLib || !metadata) {
            return false;
        }

        debugBox1 = document.getElementById("debug-exp-box-1-video");
        debugBox2 = document.getElementById("debug-exp-box-2-video");
        if (!debugBox1 || !debugBox2) {
            return false;
        }

        this.ensureContainers();
        this.ensureStages(KonvaLib);

        inwardVideo = debugBox1.querySelector("video");
        outwardVideo = debugBox2.querySelector("video");
        if (!inwardVideo || !outwardVideo) {
            return false;
        }

        this.destroyAnnotators();

        inwardAnnotator = new VideoAnnotator(inwardVideo, inwardStage, metadata, [
            "Dsf",
            "Multilane",
        ]);

        outwardAnnotator = new VideoAnnotator(outwardVideo, outwardStage, metadata, [
            "Header",
            "InertialBar",
        ]);

        this.setResizeListenersForKonvaResizing();
        return true;
    },

    ensureContainers() {
        if (debugBox1 && !konvaDiv1) {
            konvaDiv1 = document.createElement("div");
            konvaDiv1.id = "konva-container-1";
            konvaDiv1.style.position = "absolute";
            konvaDiv1.style.inset = "0";
            debugBox1.appendChild(konvaDiv1);
        }

        if (debugBox2 && !konvaDiv2) {
            konvaDiv2 = document.createElement("div");
            konvaDiv2.id = "konva-container-2";
            konvaDiv2.style.position = "absolute";
            konvaDiv2.style.inset = "0";
            debugBox2.appendChild(konvaDiv2);
        }
    },

    ensureStages(KonvaLib) {
        if (konvaDiv1 && !inwardStage) {
            inwardStage = new KonvaLib.Stage({
                container: konvaDiv1,
                width: 500,
                height: 500,
            });
        }

        if (konvaDiv2 && !outwardStage) {
            outwardStage = new KonvaLib.Stage({
                container: konvaDiv2,
                width: 500,
                height: 500,
            });
        }

        window.inwardStage = inwardStage;
        window.outwardStage = outwardStage;
    },

    destroyAnnotators() {
        if (inwardAnnotator) {
            inwardAnnotator.destroy();
            inwardAnnotator = null;
        }

        if (outwardAnnotator) {
            outwardAnnotator.destroy();
            outwardAnnotator = null;
        }
    },

    setResizeListenersForKonvaResizing() {
        this.removeResizeListeners();

        const updateInwardStageSize = () => {
            if (!inwardStage || !inwardVideo) return;
            inwardStage.width(inwardVideo.offsetWidth || 0);
            inwardStage.height(inwardVideo.offsetHeight || 0);
        };

        const updateOutwardStageSize = () => {
            if (!outwardStage || !outwardVideo) return;
            outwardStage.width(outwardVideo.offsetWidth || 0);
            outwardStage.height(outwardVideo.offsetHeight || 0);
        };

        inwardLoadedMetadataHandler = updateInwardStageSize;
        outwardLoadedMetadataHandler = updateOutwardStageSize;

        inwardVideo.addEventListener("loadedmetadata", inwardLoadedMetadataHandler);
        outwardVideo.addEventListener("loadedmetadata", outwardLoadedMetadataHandler);

        inwardResizeObserver = new ResizeObserver(updateInwardStageSize);
        inwardResizeObserver.observe(inwardVideo);

        outwardResizeObserver = new ResizeObserver(updateOutwardStageSize);
        outwardResizeObserver.observe(outwardVideo);

        updateInwardStageSize();
        updateOutwardStageSize();
    },

    removeResizeListeners() {
        if (inwardVideo && inwardLoadedMetadataHandler) {
            inwardVideo.removeEventListener("loadedmetadata", inwardLoadedMetadataHandler);
        }

        if (outwardVideo && outwardLoadedMetadataHandler) {
            outwardVideo.removeEventListener("loadedmetadata", outwardLoadedMetadataHandler);
        }

        inwardLoadedMetadataHandler = null;
        outwardLoadedMetadataHandler = null;

        inwardResizeObserver?.disconnect();
        outwardResizeObserver?.disconnect();
        inwardResizeObserver = null;
        outwardResizeObserver = null;
    },

    cleanup() {
        this.removeResizeListeners();
        this.destroyAnnotators();

        inwardStage?.destroy();
        outwardStage?.destroy();
        inwardStage = null;
        outwardStage = null;

        konvaDiv1?.remove();
        konvaDiv2?.remove();
        konvaDiv1 = null;
        konvaDiv2 = null;

        debugBox1 = null;
        debugBox2 = null;
        inwardVideo = null;
        outwardVideo = null;

        window.inwardStage = null;
        window.outwardStage = null;
    },
};

export { AnnotationManager };
