/* global itowns, document, renderer */
// # Planar (EPSG:3946) viewer

var extent;
var viewerDiv;
var view;
var c;
var flyControls;

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3879',
    '+proj=tmerc +lat_0=0 +lon_0=25 +k=1 +x_0=25500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs ');

// Define geographic extent: CRS, min/max X, min/max Y
extent = new itowns.Extent(
    'EPSG:3879',
    25490533.546, 25513662.805,
    6665020.439, 6687054.407);

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
viewerDiv = document.getElementById('viewerDiv');

// Instanciate PlanarView*
view = new itowns.PlanarView(viewerDiv, extent, { renderer: renderer });
view.tileLayer.disableSkirt = true;

// instanciate controls
flyControls = new itowns.PlanarControls(view, {groundLevel: 0, instantTravel: true});

// Add an WMS imagery layer (see WMS_Provider* for valid options)
view.addLayer({
    url: 'https://kartta.hel.fi/ws/geoserver/avoindata/ows',
    networkOptions: { crossOrigin: 'anonymous' },
    type: 'color',
    protocol: 'wms',
    version: '1.3.0',
    id: 'wms_imagery',
    name: 'Opaskartta_Helsinki',
    projection: 'EPSG:3879',
    transparent: false,
    extent: extent,
    bbox_url: 'swne',
    updateStrategy: {
        type: 0,
        options: {},
    },
    options: {
        mimetype: 'image/jpeg',
    },
});

const preUpdateGeo = (context, layer) => {
    if(layer.root === undefined) {
        itowns.init3dTilesLayer(context, layer);
        return [];
    }
    itowns.pre3dTilesUpdate(context, layer);
    return [layer.root];
};

const rules1 = {
    default: {
        0:['lod1'],
        1:['lod1'],
        2:['lod1'],
        3:['lod1']
    },
    tileConditions: [],
    featureConditions: []
};

const rules2 = {
    default: {
        0:['lod1']
    },
    tileConditions: [
        [
            {
                type: "zone",
                points: [[25495883,6670437],
                         [25496413,6671193],
                         [25498087,6671446],
                         [25498892,6672573]],
                radius: 500
            },
            {
                3:['lod2'],
            }
        ]
    ],
    featureConditions: []
};

const rules3 = {
    default: {
        0:['lod1']
    },
    tileConditions: [
        [
            {
                type: "zone",
                center: [25496694,6672338],
                radius: 500
            },
            {
                3:['lod2'],
            }
        ]
    ],
    featureConditions: [
        [
            {
                type: "greater",
                attribute: "height",
                value: 80
            },
            {
                0: ["lod2"]
            }
        ]
    ]
};

editableRules = document.getElementById('rulesEdit');
editableRules.textContent = JSON.stringify(rules1, null, 4).replace(/\[\s*|\s*\]/g, (a) => a.replace(/\s/g, ''));

var rulesString = encodeURI(JSON.stringify(rules1));

var first = true;
var reload = function() {
    if (!first) {
        itowns.View.prototype.removeLayer.call(view, 'buildings');
    }
    rulesString = JSON.stringify(JSON.parse(editableRules.textContent));

    var $3dTilesLayerDiscreteLOD = new itowns.GeometryLayer('buildings', view.scene);

    $3dTilesLayerDiscreteLOD.preUpdate = preUpdateGeo;
    $3dTilesLayerDiscreteLOD.update = itowns.process3dTilesNode(
        itowns.$3dTilesCulling,
        itowns.$3dTilesSubdivisionControl
    );
    $3dTilesLayerDiscreteLOD.name = 'buildings';
    $3dTilesLayerDiscreteLOD.protocol = '3d-tiles';
    $3dTilesLayerDiscreteLOD.overrideMaterials = true;  // custom cesium shaders are not functional
    $3dTilesLayerDiscreteLOD.type = 'geometry';
    $3dTilesLayerDiscreteLOD.visible = true;
    $3dTilesLayerDiscreteLOD.url = 'http://3d.oslandia.com/proto-building/getScene?city=helsinki&layer=buildings&rules=' + rulesString;
    itowns.View.prototype.addLayer.call(view, $3dTilesLayerDiscreteLOD);
    if (first) {
        first = false;
        //debug.create3dTilesDebugUI(menu.gui, view, $3dTilesLayerDiscreteLOD, d);
    }
};

var changeRuleSet = function changeRuleSet(rs) {
    return function() {
        editableRules.textContent = JSON.stringify(rs, null, 4).replace(/\[\s*|\s*\]/g, (a) => a.replace(/\s/g, ''));
        rulesString = encodeURI(JSON.stringify(rs));
        reload();
    }
}

button = document.getElementById('ruleButton');
button.onclick = reload;

buttonPS1 = document.getElementById('preset1');
buttonPS2 = document.getElementById('preset2');
buttonPS3 = document.getElementById('preset3');
buttonPS1.onclick = changeRuleSet(rules1);
buttonPS2.onclick = changeRuleSet(rules2);
buttonPS3.onclick = changeRuleSet(rules3);



var light = new itowns.THREE.PointLight( 0xffffff, 1 );
light.position.set(0.5 * (25490533 * 2 + 0 * 25513662), 0.5 * (6665020 * 2 + 0 * 6687054), 10000);
light.updateMatrix();
light.updateMatrixWorld();
view.scene.add( light );

// Since PlanarView doesn't create default controls, we manipulate directly three.js camera
// Position the camera at south-west corner
c = new itowns.Coordinates('EPSG:3879', extent.west(), extent.south(), 2000);
view.camera.camera3D.position.copy(c.xyz());

// Since PlanarView doesn't create default controls, we manipulate directly three.js camera
// Position the camera at south-west corner
c = new itowns.Coordinates('EPSG:3879', extent.west(), extent.south(), 2000);
view.camera.camera3D.position.copy(c.xyz());
// Then look at extent's center
view.camera.camera3D.lookAt(extent.center().xyz());

var menu = new GuiTools('menuDiv', view, 300);
var d = new debug.Debug(view, menu.gui);
debug.createTileDebugUI(menu.gui, view, view.tileLayer, d);

// Request redraw
view.notifyChange(true);

exports.view = view;
