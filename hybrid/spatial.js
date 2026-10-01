import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/meshoptimizer/meshopt_decoder.mjs';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

const MODEL=new URL('../models/realistic/hakobune-realistic-web.glb?v=20261001b',import.meta.url).href;
const HDR=new URL('../models/realistic/textures/kloofendal_48d_partly_cloudy/kloofendal_48d_partly_cloudy_1k.hdr',import.meta.url).href;

export async function createSpatialExperience(stage){
  const canvas=stage.querySelector('canvas');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile=()=>innerWidth<760;
  const clamp=x=>Math.min(1,Math.max(0,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
  const mix=THREE.MathUtils.lerp;
  const scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0xb7c1bd,.0018);
  const camera=new THREE.PerspectiveCamera(35,stage.clientWidth/stage.clientHeight,.08,300);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.5:1.8));
  renderer.setSize(stage.clientWidth,stage.clientHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.AgXToneMapping;
  renderer.toneMappingExposure=.85;
  renderer.transmissionResolutionScale=mobile()?.5:1;

  // A real radiance map supplies the colour, direction and reflections of daylight.
  // The panorama is a lighting/location study, not a photograph of this property's site.
  const [gltf,hdr,panorama]=await Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL),
    new HDRLoader().loadAsync(HDR),
    new THREE.TextureLoader().loadAsync(new URL(`../models/realistic/panorama-${mobile()?'mobile':'desktop'}.jpg`,import.meta.url).href)
  ]);
  hdr.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer);
  const envTarget=pmrem.fromEquirectangular(hdr);
  pmrem.dispose();
  scene.environment=envTarget.texture;
  scene.environmentIntensity=.55;
  panorama.mapping=THREE.EquirectangularReflectionMapping;panorama.colorSpace=THREE.SRGBColorSpace;
  scene.background=panorama;
  scene.backgroundIntensity=.8;
  scene.backgroundBlurriness=0;
  scene.backgroundRotation.y=1.75;
  scene.environmentRotation.y=1.75;

  const hemi=new THREE.HemisphereLight(0xe4edff,0x5c6548,.18);
  scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff4e5,2.0);
  sun.position.set(-11,18,14);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:70});
  sun.shadow.bias=-.00015;
  sun.shadow.normalBias=.025;
  scene.add(sun);
  const bounce=new THREE.DirectionalLight(0xdde9ff,.12);
  bounce.position.set(12,5,-9);
  scene.add(bounce);
  const lamps=[];
  for(const p of [[4.7,5.75,.4],[-.4,5.55,0],[-4.3,5.55,1],[.1,2.9,0]]){
    const light=new THREE.PointLight(0xffd4a0,0,14,2);
    light.position.set(...p);
    scene.add(light);
    lamps.push(light);
  }

  const model=gltf.scene;
  model.name='Hakobune';
  scene.add(model);
  const maxAnisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  let surfaceMaterials=0,normalMaps=0,occlusionMaps=0,grassMaterial;
  model.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=true;
    object.receiveShadow=true;
    const old=Array.isArray(object.material)?object.material:[object.material];
    const next=old.map(material=>{
      if(material.name.toLowerCase().includes('glass')){
        object.castShadow=false;
        const glass=new THREE.MeshPhysicalMaterial({
          color:0xf5faff,roughness:.028,metalness:0,ior:1.5,
          transmission:mobile()?0:.97,thickness:.025,
          transparent:mobile(),opacity:mobile()?.09:1,
          depthWrite:!mobile(),side:THREE.DoubleSide,envMapIntensity:1,
          attenuationColor:new THREE.Color(0xe9f3ef),attenuationDistance:4
        });
        glass.name=material.name;
        material.dispose();
        return glass;
      }
      surfaceMaterials++;
      if(material.normalMap)normalMaps++;
      if(material.aoMap){occlusionMaps++;material.aoMapIntensity=material.name.includes('__Roof')?.35:material.name.includes('__Timber')?.6:.8}
      material.envMapIntensity=1;
      for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap']){
        if(material[key])material[key].anisotropy=maxAnisotropy;
      }
      if(material.name.startsWith('Oak')){
        material.color.setRGB(.98,.99,1);
        material.roughness=.6;
      }
      if(material.name.startsWith('Cedar')||material.name.startsWith('Charred')){
        material.color.setRGB(.8,.85,.88);
        material.roughness=.92;
      }
      if(material.name.startsWith('Retaining stone'))material.roughness=.96;
      if(material.name.startsWith('Ivory upholstery'))material.roughness=1;
      if(material.name.startsWith('Walnut')){material.color.setRGB(.30,.19,.11);material.roughness=.8}
      if(material.name.startsWith('Leaf surface'))material.side=THREE.DoubleSide;
      if(material.name==='Meadow')grassMaterial=material;
      return material;
    });
    object.material=next.length===1?next[0]:next;
  });
  canvas.dataset.materialRevision='photographic-pbr-20261001';
  canvas.dataset.pbrMaterials=surfaceMaterials;
  canvas.dataset.normalMaps=normalMaps;
  canvas.dataset.occlusionMaps=occlusionMaps;

  // Textured ground replaces the old flat-colour field and sphere-shaped hills.
  const groundMaterial=(grassMaterial||new THREE.MeshStandardMaterial({color:0x6b7754,roughness:1})).clone();
  const groundTextures=[];
  for(const key of ['map','normalMap','roughnessMap']){
    if(!groundMaterial[key])continue;
    const texture=groundMaterial[key].clone();
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(18,18);
    groundTextures.push(texture);
    groundMaterial[key]=texture;
  }
  groundMaterial.aoMap=null;
  groundMaterial.color.setRGB(.78,.84,.73);
  groundMaterial.transparent=true;groundMaterial.depthWrite=false;
  groundMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vTerrainUV;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvTerrainUV=uv;');
    shader.fragmentShader='varying vec2 vTerrainUV;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a*=1.0-smoothstep(28.0,42.0,length(vTerrainUV-vec2(.5))*84.0);\n#include <alphatest_fragment>');
  };
  const ground=new THREE.Mesh(new THREE.CircleGeometry(42,64),groundMaterial);
  ground.rotation.x=-Math.PI/2;
  ground.position.y=-.64;
  ground.receiveShadow=true;
  scene.add(ground);

  const roof=model.getObjectByName('Roof');
  const base=roof?.position.clone();
  const water=model.getObjectByName('Water');
  if(water)water.visible=false;
  const mirror=new Reflector(new THREE.PlaneGeometry(31,13.6),{
    textureWidth:mobile()?512:1024,textureHeight:mobile()?512:1024,
    color:0xd3dbd1,clipBias:.003
  });
  mirror.rotation.x=-Math.PI/2;
  mirror.position.set(0,-.45,13.8);
  scene.add(mirror);
  const tintMaterial=new THREE.MeshBasicMaterial({color:0x4c624f,transparent:true,opacity:.12,depthWrite:false});
  const tint=new THREE.Mesh(new THREE.PlaneGeometry(31,13.6),tintMaterial);
  tint.rotation.x=-Math.PI/2;
  tint.position.set(0,-.444,13.8);
  scene.add(tint);

  const controls=new OrbitControls(camera,canvas);
  controls.enabled=false;
  controls.enableDamping=true;
  controls.dampingFactor=.06;
  controls.minDistance=5;
  controls.maxDistance=65;
  controls.maxPolarAngle=Math.PI*.48;
  const wanted=new THREE.Vector3(),target=new THREE.Vector3(),wantedTarget=new THREE.Vector3();
  const nextPosition=new THREE.Vector3(),nextTarget=new THREE.Vector3();
  const desktop=[
    {p:[0,4.3,24.5],t:[0,2.8,0],f:30},
    {p:[17,16,19],t:[-1.4,3,0],f:39},
    {p:[5.25,4.9,-1],t:[4.7,4.03,4.9],f:56}
  ];
  const phone=[
    {p:[31,17,53],t:[0,4.6,1],f:43},
    {p:[30,27,39],t:[0,5.4,0],f:43},
    {p:[5.3,4.9,-1],t:[4.9,4.1,5.5],f:67}
  ];
  let progress=0,visible=false,free=false,night=false,time=0,lift=0;
  let wantedFov=35,running=false,alive=true,raf=0,previous=0;
  const dayFog=new THREE.Color(0xb7c1bd),nightFog=new THREE.Color(0x324353);
  function path(){
    const shots=mobile()?phone:desktop;
    let i=0,b=0;
    if(progress>.61){i=1;b=smooth((progress-.61)/.15)}
    else b=smooth((progress-.34)/.13);
    if(reduce){i=progress<.43?0:progress<.7?1:2;b=0}
    const next=Math.min(i+1,2);
    wanted.fromArray(shots[i].p).lerp(nextPosition.fromArray(shots[next].p),b);
    wantedTarget.fromArray(shots[i].t).lerp(nextTarget.fromArray(shots[next].t),b);
    wantedFov=mix(shots[i].f,shots[next].f,b);
    lift=reduce?(i===1?1:0):smooth((progress-.35)/.16)*(1-smooth((progress-.65)/.13));
  }
  path();
  camera.position.copy(wanted);target.copy(wantedTarget);
  camera.fov=wantedFov;camera.updateProjectionMatrix();camera.lookAt(target);
  function draw(now){
    if(!alive||!visible){running=false;return}
    raf=requestAnimationFrame(draw);
    if(document.hidden)return;
    if(previous&&mobile()&&now-previous<30)return;
    const dt=Math.min((now-previous)/1000,.06)||.016;
    previous=now;
    if(free)controls.update();
    else{
      path();const damping=reduce?1:1-Math.exp(-dt*6);
      camera.position.lerp(wanted,damping);target.lerp(wantedTarget,damping);
      camera.fov=mix(camera.fov,wantedFov,damping);
      camera.updateProjectionMatrix();camera.lookAt(target);
    }
    if(roof){
      const amount=free?0:lift;
      roof.position.y=mix(roof.position.y,base.y+amount*5.1,reduce?1:.085);
      roof.position.z=mix(roof.position.z,base.z-amount*5.5,reduce?1:.085);
    }
    time=mix(time,night?1:0,reduce?1:.045);
    hemi.intensity=mix(.18,.05,time);
    sun.intensity=mix(2,.06,time);
    bounce.intensity=mix(.12,.08,time);
    scene.environmentIntensity=mix(.55,.095,time);
    scene.backgroundIntensity=mix(.8,.12,time);
    lamps.forEach((light,i)=>light.intensity=time*(i===3?28:38));
    scene.fog.color.copy(dayFog).lerp(nightFog,time);
    renderer.toneMappingExposure=mix(.85,1.05,time);
    renderer.render(scene,camera);
    canvas.dataset.ready='true';canvas.dataset.model='Blender / hakobune-realistic-web.glb';
    canvas.dataset.triangles=renderer.info.render.triangles;
    canvas.dataset.drawcalls=renderer.info.render.calls;
  }
  function run(){
    if(!running&&visible&&alive){running=true;previous=0;raf=requestAnimationFrame(draw)}
  }
  function contextLost(event){
    event.preventDefault();alive=false;
    stage.classList.add('no-3d');
    stage.querySelector('#load-status').textContent='写真で建築をご覧いただけます';
  }
  canvas.addEventListener('webglcontextlost',contextLost);
  return{
    update(p,active){progress=p;visible=active;run()},
    resize(){
      camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.5:1.8));
      renderer.setSize(stage.clientWidth,stage.clientHeight);
    },
    setNight(v){night=v;run()},
    setFree(v){
      free=v;controls.enabled=v;
      if(v){
        camera.position.fromArray(mobile()?[31,17,53]:[20,10,29]);
        camera.fov=mobile()?43:39;camera.updateProjectionMatrix();
        controls.target.set(0,2.7,0);controls.update();
      }
      run();
    },
    dispose(){
      alive=false;cancelAnimationFrame(raf);controls.dispose();
      canvas.removeEventListener('webglcontextlost',contextLost);
      const geometries=new Set(),materials=new Set(),textures=new Set();
      model.traverse(o=>{
        if(!o.isMesh)return;geometries.add(o.geometry);
        for(const m of Array.isArray(o.material)?o.material:[o.material]){
          materials.add(m);
          for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key])textures.add(m[key]);
        }
      });
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
      groundTextures.forEach(t=>t.dispose());ground.geometry.dispose();groundMaterial.dispose();
      tint.geometry.dispose();tintMaterial.dispose();mirror.dispose();envTarget.dispose();hdr.dispose();panorama.dispose();renderer.dispose();
    }
  };
}
