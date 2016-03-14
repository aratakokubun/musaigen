var container, scene, camera, renderer, controls, stats;
var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();
var simpleShader, mosaicShader, hsvFilterShader, musaigenShader;
var myShaderUniforms;
var musaigenVertexShader;
var musaigeFragmentShader;
var hsvFilterFragmentShader;
var mosaicFragmentShader;
var simpleFragmentShader;
const skipFrames = 10;
var frameCount = 0;
var div = new THREE.Vector2(64.0, 64.0);
var mag = new THREE.Vector2(512.0, 512.0);
var divRange = new THREE.Vector2(mag.x / div.x, mag.y / div.y);
var nFrag = 1.0 / (divRange.x * divRange.y);
var alphaMatrix = new Array(div.x * div.y);
var alphaUint8Matrix = new Uint8Array(div.x * div.y * 4);
var alphabetOffsetArray = [new THREE.Vector2(0.0, 0.6), new THREE.Vector2(0.1, 0.6), new THREE.Vector2(0.2, 0.6), new THREE.Vector2(0.3, 0.6), new THREE.Vector2(0.4, 0.6), new THREE.Vector2(0.5, 0.6), new THREE.Vector2(0.6, 0.6), new THREE.Vector2(0.7, 0.6), new THREE.Vector2(0.8, 0.6), new THREE.Vector2(0.9, 0.6), new THREE.Vector2(0.0, 0.4), new THREE.Vector2(0.1, 0.4), new THREE.Vector2(0.2, 0.4), new THREE.Vector2(0.3, 0.4), new THREE.Vector2(0.4, 0.4), new THREE.Vector2(0.5, 0.4), new THREE.Vector2(0.6, 0.4), new THREE.Vector2(0.7, 0.4), new THREE.Vector2(0.8, 0.4), new THREE.Vector2(0.9, 0.4), new THREE.Vector2(0.0, 0.2), new THREE.Vector2(0.1, 0.2), new THREE.Vector2(0.2, 0.2), new THREE.Vector2(0.3, 0.2), new THREE.Vector2(0.4, 0.2), new THREE.Vector2(0.5, 0.2), new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.1, 0.0), new THREE.Vector2(0.2, 0.0), new THREE.Vector2(0.3, 0.0), new THREE.Vector2(0.4, 0.0), new THREE.Vector2(0.5, 0.0), new THREE.Vector2(0.6, 0.0), new THREE.Vector2(0.7, 0.0), new THREE.Vector2(0.8, 0.0), new THREE.Vector2(0.9, 0.0)];
var alphaSize = new THREE.Vector2(0.1, 0.2);
var videoTexture;
var video = document.createElement('video');
var videoWidth = 256, videoHeight = 256;
var imageTexture;
var imageWidth = 256, imageHeight = 256;
var alphabetTexture;
var textureGeometry;
const MIN_H = 340.0;
const MIN_S = 20.0;
const MIN_V = 50.0;
const MAX_H = 20.0;
const MAX_S = 180.0;
const MAX_V = 180.0;
var HsvCtrl = function() {
    this.minH = MIN_H;
    this.minS = MIN_S;
    this.minV = MIN_V;
    this.maxH = MAX_H;
    this.maxS = MAX_S;
    this.maxV = MAX_V
};
const VIDEO = 0;
const IMAGE = 1;
var TextureCheckBox = function() {
    this.sampleImageTexture = false;
    this.videoTexture = true
};
var gui = new dat.GUI();
var hsvCtrlObj = new HsvCtrl();
var textureModeCheckBox = new TextureCheckBox();
var folder = gui.addFolder('Musaigen Mosaic Control');
folder.add(hsvCtrlObj, 'minH', 0, 360).onChange(updateHSVThreashold);
folder.add(hsvCtrlObj, 'minS', 0, 180).onChange(updateHSVThreashold);
folder.add(hsvCtrlObj, 'minV', 0, 180).onChange(updateHSVThreashold);
folder.add(hsvCtrlObj, 'maxH', 0, 360).onChange(updateHSVThreashold);
folder.add(hsvCtrlObj, 'maxS', 0, 180).onChange(updateHSVThreashold);
folder.add(hsvCtrlObj, 'maxV', 0, 180).onChange(updateHSVThreashold);
folder.add(textureModeCheckBox, "sampleImageTexture").onChange(updateTextureImage).listen();
folder.add(textureModeCheckBox, "videoTexture").onChange(updateTextureVideo).listen();
loadVideoCamera();
preload();
function preload() {
    SHADER_LOADER.load(function(data) {
        musaigenVertexShader = data.musaigenShader.vertex;
        musaigeFragmentShader = data.musaigenShader.fragment;
        hsvFilterFragmentShader = data.hsvFilterShader.fragment;
        mosaicFragmentShader = data.mosaicShader.fragment;
        simpleFragmentShader = data.simpleShader.fragment;
        init();
        clock.start();
        animate()
    })
}
function init() {
    scene = new THREE.Scene();
    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);
    camera.position.set(0, 0, 400);
    camera.lookAt(scene.position);
    if (Detector.webgl)
        renderer = new THREE.WebGLRenderer({
            antialias: true
        });
    else 
        renderer = new THREE.CanvasRenderer();
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container = document.getElementById('ThreeJS');
    container.appendChild(renderer.domElement);
    THREEx.WindowResize(renderer, camera);
    THREEx.FullScreen.bindKey({
        charCode: 'm'.charCodeAt(0)
    });
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.bottom = '0px';
    stats.domElement.style.zIndex = 100;
    container.appendChild(stats.domElement);
    var light = new THREE.PointLight(0xffffff);
    light.position.set(0, 150, 100);
    scene.add(light);
    var light2 = new THREE.AmbientLight(0x444444);
    scene.add(light2);
    loadImage('image/texture.png');
    alphabetTexture = THREE.ImageUtils.loadTexture('image/alphabet2.png');
    alphabetTexture.magFilter = THREE.NearestFilter;
    alphabetTexture.minFilter = THREE.NearestFilter;
    initAlphabetMatrix();
    createAlphabetMatrixTexture();
    myShaderUniforms = {
        texture: {
            type: 't',
            value: videoTexture
        },
        alphabets: {
            type: 't',
            value: alphabetTexture
        },
        alphaMatrixTexture: {
            type: 't',
            value: alphaMatrixTexture
        },
        div: {
            type: 'v2',
            value: div
        },
        mag: {
            type: 'v2',
            value: mag
        },
        divRange: {
            type: 'v2',
            value: divRange
        },
        nFrag: {
            type: 'f',
            value: nFrag
        },
        minThreashold: {
            type: 'v3',
            value: new THREE.Vector3(MIN_H, MIN_S, MIN_V)
        },
        maxThreashold: {
            type: 'v3',
            value: new THREE.Vector3(MAX_H, MAX_S, MAX_V)
        }
    };
    updateShader()
}
function loadVideoCamera() {
    window.addEventListener("DOMContentLoaded", function() {
        var videoObj = {
            "video": true
        }, errBack = function(error) {
            console.log("Video capture error: ", error.code)
        };
        if (navigator.getUserMedia) {
            navigator.getUserMedia(videoObj, function(stream) {
                video.src = stream;
                video.play();
                videoTexture = new THREE.VideoTexture(video);
                videoTexture.magFilter = THREE.NearestFilter;
                videoTexture.minFilter = THREE.NearestFilter
            }, errBack)
        } else if (navigator.webkitGetUserMedia) {
            navigator.webkitGetUserMedia(videoObj, function(stream) {
                video.src = window.webkitURL.createObjectURL(stream);
                video.play();
                videoTexture = new THREE.VideoTexture(video);
                videoTexture.magFilter = THREE.NearestFilter;
                videoTexture.minFilter = THREE.NearestFilter
            }, errBack)
        } else if (navigator.mozGetUserMedia) {
            navigator.mozGetUserMedia(videoObj, function(stream) {
                video.src = window.URL.createObjectURL(stream);
                video.play();
                videoTexture = new THREE.VideoTexture(video);
                videoTexture.magFilter = THREE.NearestFilter;
                videoTexture.minFilter = THREE.NearestFilter
            }, errBack)
        } else {
            console.log("failed to get media");
            return 
        }
        video.addEventListener("loadedmetadata", function(e) {
            videoWidth = this.videoWidth / 2, videoHeight = this.videoHeight / 2;
            updateShader()
        }, false)
    }, false)
}
function loadImage(showImgSrc) {
    var newImg = new Image();
    newImg.onload = function() {
        imageWidth = newImg.width;
        imageHeight = newImg.height;
        imageTexture = THREE.ImageUtils.loadTexture(showImgSrc);
        imageTexture.magFilter = THREE.NearestFilter;
        imageTexture.minFilter = THREE.NearestFilter
    }
    newImg.src = showImgSrc
}
function initAlphabetMatrix() {
    for (var i = 0; i < div.x * div.y; i++) {
        alphaMatrix[i] = Math.floor(Math.random() * alphabetOffsetArray.length)
    }
}
function createAlphabetMatrixTexture() {
    for (var i = 0; i < div.x * div.y; i++) {
        var offset = alphabetOffsetArray[alphaMatrix[i]];
        alphaUint8Matrix[i * 4] = Math.floor(offset.x * 255);
        alphaUint8Matrix[i * 4 + 1] = Math.floor(offset.y * 255);
        alphaUint8Matrix[i * 4 + 2] = Math.floor(alphaSize.x * 255);
        alphaUint8Matrix[i * 4 + 3] = Math.floor(alphaSize.y * 255)
    }
    alphaMatrixTexture = new THREE.DataTexture(alphaUint8Matrix, div.x, div.y, THREE.RGBAFormat);
    alphaMatrixTexture.needsUpdate = true;
    alphaMatrixTexture.magFilter = THREE.NearestFilter;
    alphaMatrixTexture.minFilter = THREE.NearestFilter
}
function updateAlphabetMatrix() {
    for (var i = 0; i < div.y - 1; i++) {
        for (var j = 0; j < div.x; j++) {
            alphaMatrix[i * div.x + j] = alphaMatrix[(i + 1) * div.x + j]
        }
    }
    for (var i = 0; i < div.x; i++) {
        alphaMatrix[(div.y - 1) * div.x + i] = Math.floor(Math.random() * alphabetOffsetArray.length)
    }
    createAlphabetMatrixTexture();
    myShaderUniforms.alphaMatrixTexture.value = alphaMatrixTexture
}
function updateTextureDivision() {
    divRange = new THREE.Vector2(mag.x / div.x, mag.y / div.y);
    nFrag = 1.0 / (divRange.x * divRange.y)
}
function updateShader() {
    scene.remove(simpleShader);
    scene.remove(mosaicShader);
    scene.remove(hsvFilterShader);
    scene.remove(musaigenShader);
    var width, height;
    if (textureModeCheckBox.videoTexture) {
        width = videoWidth/2;
        height = videoHeight/2;
        myShaderUniforms.texture.value = videoTexture
    } else {
        width = imageWidth;
        height = imageHeight;
        myShaderUniforms.texture.value = imageTexture
    }
    textureGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
    var simpleShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: musaigenVertexShader,
        fragmentShader: simpleFragmentShader,
        uniforms: myShaderUniforms
    });
    simpleShaderMaterial.side = THREE.DoubleSide;
    simpleShaderMaterial.transparent = true;
    simpleShaderMaterial.blending = THREE.NormalBlending;
    simpleShader = new THREE.Mesh(textureGeometry, simpleShaderMaterial);
    simpleShader.position.set( - width / 2, height / 2, 0);
    scene.add(simpleShader);
    var mosaicShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: musaigenVertexShader,
        fragmentShader: mosaicFragmentShader,
        uniforms: myShaderUniforms
    });
    mosaicShaderMaterial.side = THREE.DoubleSide;
    mosaicShaderMaterial.transparent = true;
    mosaicShaderMaterial.blending = THREE.NormalBlending;
    mosaicShader = new THREE.Mesh(textureGeometry, mosaicShaderMaterial);
    mosaicShader.position.set(width / 2, height / 2, 0);
    scene.add(mosaicShader);
    var hsvFilterShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: musaigenVertexShader,
        fragmentShader: hsvFilterFragmentShader,
        uniforms: myShaderUniforms
    });
    hsvFilterShaderMaterial.side = THREE.DoubleSide;
    hsvFilterShaderMaterial.transparent = true;
    hsvFilterShaderMaterial.blending = THREE.NormalBlending;
    hsvFilterShader = new THREE.Mesh(textureGeometry, hsvFilterShaderMaterial);
    hsvFilterShader.position.set( - width / 2, - height / 2, 0);
    scene.add(hsvFilterShader);
    var musaigenShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: musaigenVertexShader,
        fragmentShader: musaigeFragmentShader,
        uniforms: myShaderUniforms
    });
    musaigenShaderMaterial.side = THREE.DoubleSide;
    musaigenShaderMaterial.transparent = true;
    musaigenShaderMaterial.blending = THREE.NormalBlending;
    musaigenShader = new THREE.Mesh(textureGeometry, musaigenShaderMaterial);
    musaigenShader.position.set(width / 2, - height / 2, 0);
    scene.add(musaigenShader)
}
function animate() {
    update();
    render();
    requestAnimationFrame(animate)
}
function update() {
    frameCount += 1;
    if (frameCount >= skipFrames) {
        updateAlphabetMatrix();
        updateTextureDivision();
        frameCount = 0
    }
    controls.update();
    stats.update()
}
function render() {
    renderer.render(scene, camera)
}
function updateHSVThreashold() {
    myShaderUniforms.minThreashold.value = new THREE.Vector3(hsvCtrlObj.minH, hsvCtrlObj.minS, hsvCtrlObj.minV);
    myShaderUniforms.maxThreashold.value = new THREE.Vector3(hsvCtrlObj.maxH, hsvCtrlObj.maxS, hsvCtrlObj.maxV)
}
function updateTextureImage() {
    textureModeCheckBox.sampleImageTexture = true;
    textureModeCheckBox.videoTexture = false;
    updateShader()
}
function updateTextureVideo() {
    textureModeCheckBox.sampleImageTexture = false;
    textureModeCheckBox.videoTexture = true;
    updateShader()
}