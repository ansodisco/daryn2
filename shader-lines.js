(function () {
    // Check if Three.js is loaded
    if (!window.THREE) {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = initShaderLines;
        document.head.appendChild(script);
    } else {
        initShaderLines();
    }

    function initShaderLines() {
        // Create container if not exists, or usage existing background container
        // We want it to be a background
        var container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '-20'; // Behind everything
        container.style.pointerEvents = 'none';
        container.id = 'shader-lines-bg';
        document.body.prepend(container);

        var THREE = window.THREE;
        var camera = new THREE.Camera();
        camera.position.z = 1;

        var scene = new THREE.Scene();
        var geometry = new THREE.PlaneBufferGeometry(2, 2);

        var uniforms = {
            time: { type: "f", value: 1.0 },
            resolution: { type: "v2", value: new THREE.Vector2() }
        };

        var vertexShader = `
            void main() {
                gl_Position = vec4( position, 1.0 );
            }
        `;

        var fragmentShader = `
            #define TWO_PI 6.2831853072
            #define PI 3.14159265359

            precision highp float;
            uniform vec2 resolution;
            uniform float time;
                
            float random (in float x) {
                return fract(sin(x)*1e4);
            }
            float random (vec2 st) {
                return fract(sin(dot(st.xy,
                                     vec2(12.9898,78.233)))*
                    43758.5453123);
            }
            
            void main(void) {
                vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
                
                vec2 fMosaicScal = vec2(4.0, 2.0);
                vec2 vScreenSize = vec2(256,256);
                uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
                uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);       
                
                float t = time*0.06+random(uv.x)*0.4;
                float lineWidth = 0.0008;

                vec3 color = vec3(0.0);
                for(int j = 0; j < 3; j++){
                    for(int i=0; i < 5; i++){
                        color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));        
                    }
                }

                // Adjust alpha or blend mode if needed. 
                gl_FragColor = vec4(color[2],color[1],color[0],1.0);
            }
        `;

        var material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true
        });

        var mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        var renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        uniforms.resolution.value.x = window.innerWidth;
        uniforms.resolution.value.y = window.innerHeight;

        function onWindowResize() {
            var width = window.innerWidth;
            var height = window.innerHeight;
            renderer.setSize(width, height);
            uniforms.resolution.value.x = width;
            uniforms.resolution.value.y = height;
        }

        window.addEventListener('resize', onWindowResize, false);

        function animate() {
            requestAnimationFrame(animate);
            uniforms.time.value += 0.05;
            renderer.render(scene, camera);
        }

        animate();
    }
})();
