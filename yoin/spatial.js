import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function createSpatial(stage){
  const renderer=new THREE.WebGLRenderer({canvas:stage.querySelector('canvas'),alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.25:1.5));
  renderer.setClearColor(0xf7f7f4,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-15,15,12,-12,.1,120);
  scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2.6));
  const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-10,20,14);scene.add(sun);
  let gltf;try{gltf=await new GLTFLoader().loadAsync(new URL('assets/hakobune-monochrome.glb',import.meta.url).href);}catch(e){renderer.dispose();throw e;}
  const house=gltf.scene;
  house.updateMatrixWorld(true);
  const drawing=new THREE.Group();scene.add(drawing);
  const omitted=new Set(['Dining','Floorboards','Kitchen','Living','Sleeping','Timber']);
  house.traverse(mesh=>{
    if(!mesh.isMesh)return;
    // GLTF nodes with multiple primitives become groups; inspect their ancestors too.
    let terrace=false, facade=false;
    for(let node=mesh;node;node=node.parent){
      if(omitted.has(node.name))return;
      terrace ||= node.name==='Terrace';facade ||= node.name==='Facade';
    }
    if(facade && mesh.material?.name==='Timber')return;
    const edges=new THREE.EdgesGeometry(mesh.geometry,25);
    edges.applyMatrix4(mesh.matrixWorld);
    const lines=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:0x343832,transparent:true,opacity:terrace ? .14 : .48,depthWrite:false}));
    drawing.add(lines);
  });
  const bounds=new THREE.Box3().setFromObject(house),center=bounds.getCenter(new THREE.Vector3());
  drawing.position.x-=center.x;drawing.position.z-=center.z;
  house.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});
  let angle=.62,visible=false,paused=false,disposed=false,raf=0,last=0;
  function render(){camera.position.set(Math.sin(angle)*27,21,Math.cos(angle)*27);camera.lookAt(0,2.6,0);renderer.render(scene,camera);}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h;const halfW=Math.max(13,12*aspect);camera.left=-halfW;camera.right=halfW;camera.top=halfW/aspect;camera.bottom=-halfW/aspect;camera.updateProjectionMatrix();renderer.setSize(w,h,false);render();}
  function tick(now){raf=0;if(disposed||!visible||paused)return;if(!last)last=now;if(now-last>=1000/30){angle+=(Math.min(now-last,100)/1000)*(Math.PI*2/36);last=now;render();}raf=requestAnimationFrame(tick);}
  function update(){cancelAnimationFrame(raf);raf=0;last=0;if(visible&&!paused&&!disposed)raf=requestAnimationFrame(tick);}
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();stage.classList.add('is-ready');
  return {setVisible(v){visible=v;update();},setPaused(v){paused=v;update();},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});renderer.dispose();}};
}
