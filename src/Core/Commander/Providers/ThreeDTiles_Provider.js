/**
 * Created On: 2016-11-8
 * Class: ThreeDTiles_Provider
 * Description:
 */
import * as THREE from 'three';
import Provider from './Provider';
import CacheRessource from './CacheRessource';
import B3dmLoader from '../../../Renderer/ThreeExtended/B3dmLoader';
import Fetcher from './Fetcher';
import geoJsonToThree from '../../../Renderer/ThreeExtended/GeoJSONToThree';
import { UNIT } from '../../Geographic/Coordinates';
import FeatureMesh from '../../../Renderer/FeatureMesh';
import FeatureMaterial from '../../../Renderer/FeatureMaterial';
import BoundingBox from '../../../Scene/BoundingBox';


export function ThreeDTilesIndex(tileset) {
    let counter = 0;
    this.index = {};
    const recurse = function recurse_f(node) {
        this.index[counter] = node;
        node.tileId = counter;
        counter++;
        if (node.children) {
            for (const child of node.children) {
                recurse(child);
            }
        }
    }.bind(this);
    recurse(tileset.root);

    this.extendTileset = function extendTileset(tileset, parentId, nodeId) {
        recurse(tileset.root);
        const parent = this.index[parentId];
        for (let i = 0; i < parent.children.length; i++) {
            if (parent.children[i].tileId === nodeId) {
                parent.children[i] = tileset.root;
                break;
            }
        }
    };
}

function ThreeDTiles_Provider(/* options*/) {
    // Constructor

    Provider.call(this);
    this.cache = CacheRessource();
    this.b3dmLoader = new B3dmLoader();
}

ThreeDTiles_Provider.prototype = Object.create(Provider.prototype);

ThreeDTiles_Provider.prototype.constructor = ThreeDTiles_Provider;

ThreeDTiles_Provider.prototype.removeLayer = function removeLayer(/* idLayer*/) {

};

ThreeDTiles_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(/* layer*/) {

};

function getBox(boundingVolume) {
    if (boundingVolume.region) {
        const region = boundingVolume.region;
        // TODO: right unit?
        return { region: new BoundingBox(region[0], region[2], region[1], region[3], region[4], region[5], UNIT.RADIAN) };
    } else if (boundingVolume.box) {
        const box = boundingVolume.box;
        const center = new THREE.Vector3(box[0], box[1], box[2]);
        const w = center.x - box[3] / 2;
        const e = center.x + box[3] / 2;
        const s = center.y - box[7] / 2;
        const n = center.y + box[7] / 2;
        const b = center.z - box[11] / 2;
        const t = center.z + box[11] / 2;

        return { box: new THREE.Box3(new THREE.Vector3(w, s, b), new THREE.Vector3(e, n, t)) };
    } else if (boundingVolume.sphere) {
        // TODO
        return { sphere: undefined };
    }
}

function getTransform(transform, parent) {
    if (transform) {
        const t = new THREE.Matrix4();
        t.fromArray(transform);
        return t.multiply(parent.matrix);
    } else {
        return parent && parent.transform ? parent.transform.clone() : new THREE.Matrix4();
    }
}

ThreeDTiles_Provider.prototype.geojsonToMesh = function geojsonToMesh(geoJson, url) {
    return new Promise((resolve) => {
        try {
            const features = geoJson.features;

            let geometry;
            const color = /* new THREE.Color(Math.random(),Math.random(),Math.random());//*/new THREE.Color(180 / 255, 147 / 255, 128 / 255);

            if (features.length === 0) {
                resolve(new THREE.Object3D());
            }

            if (features[0].properties.zmax !== undefined) {
                let shape = new THREE.Shape();
                for (let r = 0; r < features.length; r++) {
                    const height = features[r].properties.zmax - features[r].properties.zmin;
                    const extrudeSettings = {
                        amount: height,
                        bevelEnabled: true,
                        bevelThickness: height / 10,
                        bevelSize: height / 10,
                        bevelSegments: 2,
                    };
                    const coords = features[r].geometry.coordinates;
                    if (coords === undefined) {
                        resolve(new THREE.Object3D());
                    }
                    for (let i = 0; i < coords.length; i++) {
                        let polygon = coords[i][0]; // TODO: support holes
                        let pathPoints = [];
                        for (let j = 0; j < polygon.length - 1; j++) {  // skip redundant point
                            pathPoints[j] = (new THREE.Vector2(polygon[j][0], polygon[j][1]));
                        }
                        // shape creation
                        shape = new THREE.Shape(pathPoints);
                        for (let k = 1; k < coords[i].length; k++) {
                            polygon = coords[i][k];
                            pathPoints = [];
                            for (let j = 0; j < polygon.length - 1; j++) {  // skip redundant point
                                pathPoints[j] = (new THREE.Vector2(polygon[j][0], polygon[j][1]));
                            }
                            shape.holes.push(new THREE.Path(pathPoints));
                        }
                        if (geometry) {
                            const geometry2 = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                            geometry2.translate(0, 0, features[r].properties.zmin);
                            geometry.merge(geometry2);
                        } else {
                            geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                            geometry.translate(0, 0, features[r].properties.zmin);
                        }
                    }
                }
                geometry.computeBoundingSphere();
            } else {
                const threeData = geoJsonToThree.convert(geoJson);
                geometry = threeData.geometries;
                geometry.computeBoundingSphere();
            }
            const mesh = new FeatureMesh({ bbox: undefined });
            mesh.setGeometry(geometry);
            mesh.material.uniforms.diffuseColor.value = color;

            resolve(mesh);
        } catch (error) {
            // console.log(url);
            resolve(new THREE.Object3D());
        }
    });
};

ThreeDTiles_Provider.prototype.b3dmToMesh = function b3dmToMesh(data) {
    // TODO: change shaders?
    return this.b3dmLoader.parse(data).then((result) => {
        const setMaterial = function setMaterial(mesh) {
            mesh.material = new FeatureMaterial();
        };
        result.scene.traverse(setMaterial);
        return result.scene;
    });
};

// Taken from Three
function convertUint8ArrayToString(array) {
    var s = '';
    for (var i = 0; i < array.length; i++) {
        s += String.fromCharCode(array[i]);
    }
    return s;
}

function configureTile(tile, layer, metadata) {
    tile.frustumCulled = false;
    tile.loaded = true;
    tile.layer = layer.id;

    // parse metadata
    tile.transform = getTransform(metadata.transform, parent);
    tile.applyMatrix(tile.transform);
    tile.geometricError = metadata.geometricError;
    tile.tileId = metadata.tileId;
    tile.additiveRefinement = (metadata.refine === 'add');
    tile.boundingVolume = getBox(metadata.boundingVolume);
}

ThreeDTiles_Provider.prototype.executeCommand = function executeCommand(command) {
    const layer = command.layer;
    const parent = command.requester;
    const metadata = command.metadata;

    const urlSuffix = metadata.content ? metadata.content.url : undefined;
    if (urlSuffix) {
        const url = layer.urlPrefix + urlSuffix;

        const supportedFormats = {
            geoJson: this.geojsonToMesh.bind(this),
            b3dm: this.b3dmToMesh.bind(this),
        };

        return Fetcher.arrayBuffer(url).then((result) => {
            if (result !== undefined) {
                let func = supportedFormats.b3dm;
                const firstChar = String.fromCharCode((new Uint8Array(result, 0, 1))[0]);
                if (firstChar === '{') {
                    result = JSON.parse(convertUint8ArrayToString(new Uint8Array(result)));
                    if (result.asset) {
                        layer.tileIndex.extendTileset(result, parent.tileId, metadata.tileId);
                        return;
                    } else {
                        func = supportedFormats.geoJson;
                    }
                }
                return func(result, url).then((tile) => {
                    configureTile(tile, layer, metadata);
                    if (parent) {
                        // TODO: move this elsewhere
                        parent.add(tile);
                    }
                    tile.updateMatrixWorld();
                    this.cache.addRessource(url, result);
                    return tile;
                });
            } else {
                this.cache.addRessource(url, null);
                return null;
            }
        });
    } else {
        return new Promise((resolve/* , reject*/) => {
            const tile = new THREE.Object3D();
            configureTile(tile, layer, metadata);
            if (parent) {
                // TODO: move this elsewhare
                parent.add(tile);
            }
            tile.updateMatrixWorld();
            resolve(tile);
        });
    }
};

export { ThreeDTiles_Provider };
