var ctrl = {};
    ctrl.Active = 0;
    ctrl.PointerState = 0;
    ctrl.Elevation_Value = 1;
    ctrl.Elevation_Radius = 1;
    ctrl.None = 0;
    ctrl.Elevation_Soft = 1; // In-/Decrease slowly by value (+=)
    ctrl.Elevation_Hard = 2; // In-/Decrease instantly by value ( = )
    ctrl.Elevation_Smooth = 3; // slowly smooth towards value.
window.ctrl = ctrl;

// Ground W/ Elevation.
// We're making heightmaps!

class HWGround extends BABYLON.GroundMesh {
    constructor(name, options = {}, scene){
        super(name, scene);
        this._setReady(false);
        this._subdivisionsX = options.subdivisionsX || options.subdivisions || 1;
        this._subdivisionsY = options.subdivisionsY || options.subdivisions || 1;
        this._width = options.width || 1;
        this._height = options.height || 1;
        this._maxX = this._width / 2;
        this._maxZ = this._height / 2;
        this._minX = -this._maxX;
        this._minZ = -this._maxZ;

        this._minY = options.minY || 0;
        this._maxY = options.maxY || 1;

        this._isHWGround = true;
        
        this.__canvas = document.createElement('canvas');
        this.__vP = [];
        var vertexData = BABYLON.VertexData.CreateGround(options);
        vertexData.applyToMesh(this, options.updatable);

        for(let i = 0; i < vertexData.positions.length; i+=3){
            this.__vP.push(new BABYLON.Vector3( vertexData.positions[i], vertexData.positions[i+1], vertexData.positions[i+2] ));
        }

        this._setReady(true);
        return this;
    }
    __setHeightAtPoint(point, radius, value, eType) {
        let pK = [];

        for(let i = 0; i < this.__vP.length; i++){
            let vP = this.__vP[i];
            if(!vP) continue;
            point.y = vP.y;
            if(BABYLON.Vector3.Distance( vP, point) < radius ){
                switch(eType){
                    case ctrl.Elevation_Soft:
                        vP.y += value;
                        break;

                    case ctrl.Elevation_Hard:
                        vP.y = value;
                        break;

                    case ctrl.Elevation_Smooth:
                        if(vP.y < value-0.1){
                            vP.y += 0.1;
                        }
                        else if(vP.y > value+0.1){
                            vP.y -= 0.1;
                        }
                        else {
                            vP.y = value;
                        }
                        break;
                }
                
                if(vP.y < this._minY){
                    vP.y = this._minY;
                }
                else if(vP.y > this._maxY){
                    vP.y = this._maxY;
                }
            }

            pK.push(vP.x);
            pK.push(vP.y);
            pK.push(vP.z);
        }

        this.setVerticesData(BABYLON.VertexBuffer.PositionKind, pK);
    }
    __createHeightMap() {
        let pixMulti = 2; // Each center VertexPoint is indicated by 2*2 pixels, sides by 2*1 and corners by 1 * 1
        
        let multiX = (this._subdivisionsX / this._width);
        let multiY = (this._subdivisionsY / this._height);

        let w = this._subdivisionsX * pixMulti;
        let h = this._subdivisionsY * pixMulti;

        let canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;

        if (!canvas.getContext) return;
        let ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, w, h);

        for(let i = 0; i < this.__vP.length; i++){
            let vp = this.__vP[i];
            if(!vp) continue;

            let x = vp.x + (this._width/2); // Translate world to canvas
                x *= (multiX*2);
                x -= 1;

            let z = -vp.z + (this._height/2);
                z *= (multiY*2);
                z -= 1;
            
            let y = ( (vp.y - this._minY) / (this._maxY - this._minY) ) * 255;
            ctx.fillStyle = `rgb( ${y}, ${y}, ${y})`;
            ctx.fillRect(x, z, pixMulti, pixMulti);
        }
        return canvas.toDataURL();
    }
}

class EditorGUI {
    constructor(advTexture, scene){
        if(!advTexture) return;
        
        var self = this;
        this.adv = advTexture;
        this.scene = scene;
        this.mesh = null;
        this.con = this.addElement('Container', this.adv, {width: 1, height: 1});

        scene.onPointerDown = self.onPointerDown.bind(self);
        scene.onPointerUp = self.onPointerUp.bind(self);
        scene.onPointerMove = self.onPointerMove.bind(self);
    
/*

if(evt.button === 2){
    this.mesh.__createHeightMap();
    return;
}

*/

    /**
     * Panel Right
    **/
        this.panel_right = this.addElement('Rectangle', this.con, {
            width: "200px", 
            height: 0.9, 
            background: "black", 
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER,
            horizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT,
            isPointerBlocker: true,
            thickness: 0.5
            });

/** Editor Options - Label **/
        this.label_options = this.addElement('TextBlock', this.panel_right, {
            text: "Editor Options",
            height: "50px",
            fontSize: "22px",
            color: "white",
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP
            });

    /**
     * Panel Right Sections
    **/
        this.panel_right_a_a = this.addElement('StackPanel', this.panel_right, {
            width: 1, 
            height: 0.30,
            top: 50,
            isVisible: (!this.mesh), 
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP
            });

        this.panel_right_a_b = this.addElement('StackPanel', this.panel_right, {
            width: 1, 
            height: 0.30,
            top: 50,
            isVisible: (!!this.mesh), 
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP
            });

    /**
     * Panel Right Bottom
    **/
        this.panel_right_b = this.addElement('Container', this.panel_right, {
            width: 1, 
            height: 0.50,
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER
            });

        this.panel_right_c = this.addElement('StackPanel', this.panel_right, {
            width: 1, 
            height: 0.10,
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM
            });

        let btn_1 = {
            height: "30px",
            width: "170px",
            top: 25
            };
        let btn_2 = Object.assign({}, btn_1, {
            paddingTop: "5px", 
            height: "35px"
            });

    /** Editor Options - Buttons **/
// CREATE / LOAD
        let newMap = this.createButton("New HeightMap", this.panel_right_a_a, btn_1);
            newMap.onPointerClickObservable.add((a, b) => {
                let ops = {
                    updatable: true
                }

                ops.width = parseInt(prompt("Size X", 10));
                ops.height = parseInt(prompt("Size Z", 10));
                ops.subdivisionsX = parseInt(prompt("subdivisionsX", 10));
                ops.subdivisionsY = parseInt(prompt("subdivisionsZ", 10));
                ops.minY = parseInt(prompt("Minimum Y", 0));
                ops.maxY = parseInt(prompt("Maximum Y", 1));

                let mesh = new HWGround("ground", ops, scene);
                    mesh.material = new BABYLON.StandardMaterial();
                    mesh.material.specularColor.copyFromFloats(0,0,0)
                    mesh.material.wireframe = true;

                self.mesh = mesh;
                self.panel_right_a_a.isVisible = false;
                self.panel_right_a_b.isVisible = true;
            });
        /*
        let loadMap = this.createButton("Load From Image", this.panel_right_a_a, btn_2);
        loadMap.onPointerClickObservable.add((a, b) => { 
                //this.loadMap();
            });

        let loadMap2 = this.createButton("Load From Base64", this.panel_right_a_a, btn_2);
        loadMap2.onPointerClickObservable.add((a, b) => { 
                //this.loadMap();
            });
        */

// EXPORT
        this.addElement('TextBlock', this.panel_right_c, {
            text: "Export",
            fontSize: "18px", 
            color: "white",
            textVerticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            height: "30px"
            });

        let exportMap2 = this.createButton("Save HeightMap", this.panel_right_c, {
            paddingTop: "5px",
            height: "35px",
            width: "160px"
            });
        exportMap2.onPointerClickObservable.add((a, b) => {
            let b64 = this.mesh.__createHeightMap();

            let image = new Image();
                image.src = b64;

            let w = window.open('', '_blank');
                w.document.write(image.outerHTML);
        });



        this.btn_elevation_option = this.createButton("Elevation", this.panel_right_a_b, {
            height: "30px"
            });
        this.btn_elevation_option.onPointerClickObservable.add((a, b) => { 
            this.displayBottomPanel('elevation_Panel');
            this.btn_elevation_option.children[0].color = "orange";
            });
        /*
        this.btn_paint_option = this.createButton("Paint", this.panel_right_a_b, {
            paddingTop: "5px",
            height: "35px"
            });
        this.btn_paint_option.onPointerClickObservable.add((a, b) => { 
            this.displayBottomPanel('paint_Panel');
            this.btn_paint_option.children[0].color = "orange";
            });
        */

    /** Elevation **/
        this.elevation_Panel = this.addElement('Container', this.panel_right_b, {
            width: 1, 
            height: 1,
            isVisible: false,
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP
            });

        this.addElement('TextBlock', this.elevation_Panel, {
            text: "Elevation",
            fontSize: "22px", 
            color: "white",
            textVerticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            top: 20
            });

//    Elevation_Type
        this.addElement('TextBlock', this.elevation_Panel, {
            text: "Type",
            fontSize: "18px", 
            color: "white",
            textVerticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            top: 55
            });


        function selectElevationOption(value, target){
            if(ctrl.Active === value) return;
            switch(ctrl.Active){
                case ctrl.Elevation_Hard:
                    elevation_hard.children[0].color = "white";
                    break;
                case ctrl.Elevation_Soft:
                    elevation_soft.children[0].color = "white";
                    break;
                case ctrl.None:
                    elevation_none.children[0].color = "white";
                    break;
                case ctrl.Elevation_Smooth:
                    elevation_smooth.children[0].color = "white";
                    break;
            }
            target.children[0].color = "orange";
            ctrl.Active = value;
        }

        var elevation_none = this.createButton("None", this.elevation_Panel, {
            top: 85,
            left: -40,
            width: "75px"
            });
            elevation_none.children[0].color = "orange";
            elevation_none.onPointerClickObservable.add((a,b) => { 
                selectElevationOption(ctrl.None, b.target);
            });
        var elevation_soft = this.createButton("Soft", this.elevation_Panel, {
            top: 85,
            left: 40,
            width: "75px"
            });
            elevation_soft.onPointerClickObservable.add( (a,b) => {
                selectElevationOption(ctrl.Elevation_Soft, b.target);
            });
        var elevation_hard = this.createButton("Hard", this.elevation_Panel, {
            top: 120,
            left: -40,
            width: "75px"
            });
            elevation_hard.onPointerClickObservable.add((a,b) => { 
                selectElevationOption(ctrl.Elevation_Hard, b.target);
            });
        var elevation_smooth = this.createButton("Smooth", this.elevation_Panel, {
            top: 120,
            left: 40,
            width: "75px"
            });
            elevation_smooth.onPointerClickObservable.add((a, b) => {
                selectElevationOption(ctrl.Elevation_Smooth, b.target);
            });

//    Elevation_Value
        let elevation_value_label = this.addElement('TextBlock', this.elevation_Panel, {
            text: "Value: "+ctrl.Elevation_Value,
            fontSize: "18px", 
            color: "white",
            textVerticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            textHorizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER,
            top: 170
            });

        this.elevation_value_slider = this.addElement('Slider', this.elevation_Panel, {
            minimum: 0,
            maximum: 5,
            step: 0.05,
            value: ctrl.Elevation_Value,
            height: "20px",
            width: 0.75,
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            horizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER,
            top: 190,
            color: "white",
            background: "orange"
        }).onValueChangedObservable.add(function(value) {
            elevation_value_label.text = "Value: "+ value;
            ctrl.Elevation_Value = value;
        });

//    Elevation_Radius
        let elevation_radius_label = this.addElement('TextBlock', this.elevation_Panel, {
            text: "Radius: " + ctrl.Elevation_Radius,
            fontSize: "18px", 
            color: "white",
            textVerticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            textHorizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER,
            top: 210
            });

        this.elevation_radius_slider = this.addElement('Slider', this.elevation_Panel, {
            minimum: 0,
            maximum: 5,
            step: 0.05,
            value: ctrl.Elevation_Radius,
            height: "20px",
            width: 0.75,
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP,
            horizontalAlignment: BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER,
            top: 230,
            color: "white",
            background: "orange"
        }).onValueChangedObservable.add(function(value) {
            elevation_radius_label.text = "Radius: "+ value;
            ctrl.Elevation_Radius = value;
        });

        return this;
    }
    onPointerDown(evt, pick) {
        ctrl.PointerState = 1;
        this._elevation_value_cache = (evt.button === 0 ? ctrl.Elevation_Value : (evt.button === 2 ? -ctrl.Elevation_Value : 0) );
        switch(ctrl.Active){
          default:
          case ctrl.None:
            return;
            break;

          case ctrl.Elevation_Soft:
          case ctrl.Elevation_Hard:
          case ctrl.Elevation_Smooth:
            this.scene.activeCamera.detachControl(canvas);
            if(pick && pick.hit && pick.pickedPoint && pick.pickedMesh && pick.pickedMesh._isHWGround){
              this.mesh.__setHeightAtPoint(pick.pickedPoint, ctrl.Elevation_Radius, this._elevation_value_cache, ctrl.Active);
            }
            break;
        }
    }
    onPointerUp() {
        ctrl.PointerState = 0;
        switch(ctrl.Active){
          default:
          case ctrl.None:
            break;

          case ctrl.Elevation_Soft:
          case ctrl.Elevation_Hard:
          case ctrl.Elevation_Smooth:
            this.mesh.createNormals(true);
            this.scene.activeCamera.attachControl(canvas, true);
            break;
        }
    }
    onPointerMove() {
        switch(ctrl.Active){
          default:
          case ctrl.None:
            break;

          case ctrl.Elevation_Soft:
          case ctrl.Elevation_Hard:
          case ctrl.Elevation_Smooth:
            if(!ctrl.PointerState) return;
            var pick = scene.pick(scene.pointerX, scene.pointerY);
            if(pick && pick.hit && pick.pickedPoint && pick.pickedMesh && pick.pickedMesh._isHWGround){
                this.mesh.__setHeightAtPoint(pick.pickedPoint, ctrl.Elevation_Radius, this._elevation_value_cache, ctrl.Active);
            }
            break;
        }
    }
    displayBottomPanel(panelName) {
        let panel = this[panelName];
        if(!panel) return;

        this.btn_elevation_option.children[0].color = "white";
        //this.btn_paint_option.children[0].color = "white";

        for(let i = 0; i < this.panel_right_b.children.length; i++){
            let child = this.panel_right_b.children[i];
            if(!child) continue; 
            else if(child !== panel){
                child.isVisible = false;
                child.children[0].color = "white";
                continue;
            }
            child.isVisible = true;
        }
    }
    addElement(typeName, parent, options) {
        if(!typeName || typeof(BABYLON.GUI[typeName]) !== "function" ) return false;
        var result = new BABYLON.GUI[typeName]();
        if(typeof(options) === 'object'){
            var keyNames = Object.keys(options);
            for(var i in keyNames){
                result[keyNames[i]] = options[keyNames[i]];
            }
        }
        if(parent) parent.addControl(result);
        return result;
    }
    createLabelText(text, parent, options) {
        var result = this.addElement('Rectangle', parent, Object.assign({}, {
            width: "160px", 
            height: "30px", 
            background: "black",
            cornerRadius: 5,
            isPointerBlocker: true,
            thickness: 0.5,
            zIndex: 5,
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP
            }, options));
        
        result.textBlock = this.addElement('TextBlock', result, {
            text: text, 
            color: "white"
            });

        return result;
    }
    createButton(text, parent, options) {
        var result = this.addElement('Button', parent, Object.assign({}, {
            width: "125px", 
            height: "30px", 
            background: "black",
            cornerRadius: 5,
            isPointerBlocker: true,
            thickness: 0.5,
            verticalAlignment: BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP
            }, options));
        
        result.__textBlock = this.addElement('TextBlock', result, {
            text: text, 
            color: "white"
            });

        return result;
    }
}
