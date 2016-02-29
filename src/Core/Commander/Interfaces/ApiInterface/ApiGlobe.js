/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */


define('Core/Commander/Interfaces/ApiInterface/ApiGlobe', [
       'Core/Commander/Interfaces/EventsManager',
       'Scene/Scene',
       'Globe/Globe',
       'Core/Commander/Providers/WMTS_Provider'], function(
           EventsManager, 
           Scene,
           Globe,
           WMTS_Provider) {

    function ApiGlobe() {
        //Constructor

        this.scene = null;
        this.commandsTree = null;

    }

    ApiGlobe.prototype = new EventsManager();

    /**
     * @param Command
     */
    ApiGlobe.prototype.add = function(/*Command*/) {
        //TODO: Implement Me 

    };


    /**
     * @param commandTemplate
     */
    ApiGlobe.prototype.createCommand = function(/*commandTemplate*/) {
        //TODO: Implement Me 

    };

    /**
     */
    ApiGlobe.prototype.execute = function() {
        //TODO: Implement Me 

    };

    ApiGlobe.createSceneGlobe = function(pos) {
        //TODO: Normalement la creation de scene ne doit pas etre ici....
        // A� deplacer plus tard

        this.scene = Scene();
        this.scene.init(pos);

        return this.scene;

    };
    
    ApiGlobe.setLayerAtLevel = function(baseurl,layer/*,level*/) {
 
        var wmtsProvider = new WMTS_Provider({url:baseurl, layer:layer});
        this.scene.managerCommand.providerMap[this.scene.layers[0].terrain.layerId].providerWMTS = wmtsProvider;
        this.scene.browserScene.updateNodeMaterial(wmtsProvider);
        this.scene.renderScene3D();
    };

    ApiGlobe.showClouds = function(value) {

        this.scene.layers[0].showClouds(value);
    };
    
    ApiGlobe.setRealisticLightingOn = function(value) {

        this.scene.gfxEngine.setLightingOn(value);
        this.scene.layers[0].setRealisticLightingOn(value);
        this.scene.browserScene.updateMaterialUniform("lightingOn",value);
    };

    return ApiGlobe;

});
