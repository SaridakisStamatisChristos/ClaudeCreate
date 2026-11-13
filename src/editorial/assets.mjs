import { createHash } from 'node:crypto';
import { copyFile, mkdir } from 'node:fs/promises';
import { realpathSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_ASSET_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets');
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_MEDIA_BYTES = 60 * 1024 * 1024;
const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);

// Public scripts use "assets/..."; one approved asset root, never the working directory.
export function resolveLocalAsset(src, assetRoot = DEFAULT_ASSET_ROOT, {allowVideo=false} = {}) {
  if (typeof src !== 'string' || !src.startsWith('assets/') || src.includes('\\') ||
      src.includes('\0') || isAbsolute(src) || /^(?:[a-z][\w+.-]*:|\/\/)/i.test(src))
    throw new Error('expected relative assets/... path (no URL or absolute path)');
  const segments = src.split('/');
  if (segments.length < 3 || segments.some(v => !v || v === '.' || v === '..'))
    throw new Error('path traversal or empty path component is forbidden');
  const ext = extname(src).toLowerCase();
  if (!IMAGE_EXTS.has(ext) && !(allowVideo && ext === '.mp4'))
    throw new Error('unsupported media extension (PNG, JPEG, WebP only)');
  const root = realpathSync(assetRoot), file = realpathSync(resolve(root, ...segments.slice(1)));
  const rel = relative(root, file);
  if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel))
    throw new Error('asset escapes approved local asset root');
  const st = statSync(file);
  if (!st.isFile() || st.size === 0 || st.size > MAX_MEDIA_BYTES)
    throw new Error('asset must be a nonempty regular file of at most 60 MiB');
  return file;
}

export function validateMediaDescriptor(media, path, errors, {assetRoot=DEFAULT_ASSET_ROOT,allowVideo=false,allowLayers=false}={}) {
  if (!isRecord(media)) {errors.push(path + ': expected media object');return;}
  const permitted = allowLayers ? ['image','layers',...(allowVideo?['video']:[])] : ['image',...(allowVideo?['video']:[])];
  if (!permitted.includes(media.kind)) errors.push(path + '.kind: expected ' + permitted.join(' or '));
  const keys = media.kind === 'layers' ? ['kind','fit','motion','layers'] : ['kind','src','fit','motion'];
  for (const key of Object.keys(media)) if (!keys.includes(key)) errors.push(path + ": unknown property '" + key + "'");
  if (media.fit !== undefined && !['cover','contain'].includes(media.fit)) errors.push(path + '.fit: expected cover or contain');
  const motions = ['none','zoom_in','zoom_out','pan_left','pan_right',...(allowLayers?['parallax']:[])];
  if (media.motion !== undefined && !motions.includes(media.motion)) errors.push(path + '.motion: invalid motion');
  if (media.motion === 'parallax' && media.kind !== 'layers') errors.push(path + '.motion: parallax requires layers');
  if (media.kind === 'layers') {
    if (!allowLayers) return;
    if (!Array.isArray(media.layers) || media.layers.length < 2 || media.layers.length > 5) {
      errors.push(path + '.layers: expected 2–5 entries');return;
    }
    media.layers.forEach((l,i)=>{
      const p=path+'.layers['+i+']';
      if (!isRecord(l)) {errors.push(p+': expected object');return;}
      for(const key of Object.keys(l)) if(!['src','depth'].includes(key))errors.push(p+": unknown property '"+key+"'");
      if(typeof l.depth!=='number'||!Number.isFinite(l.depth)||l.depth < -1||l.depth > 1)errors.push(p+'.depth: expected finite number in [-1,1]');
      try{resolveLocalAsset(l.src,assetRoot);}catch(e){errors.push(p+'.src: '+e.message);}
    });
  } else if (media.kind === 'image' || media.kind === 'video') {
    try{resolveLocalAsset(media.src,assetRoot,{allowVideo});}
    catch(e){errors.push(path+'.src: '+e.message);}
    if(media.kind==='video'&&!allowVideo)errors.push(path+'.kind: MP4 requires verified deterministic seeking');
  }
}

// Clone and stage under digest-only filenames; revalidate in case media changed after check.
export async function stageMediaForComposition(script, workDir, {assetRoot=DEFAULT_ASSET_ROOT,allowVideo=false}={}) {
  if(script.schema_version!==2 || script.mode!=='editorial_illustrated') return script;
  const staged=structuredClone(script), mediaDir=join(workDir,'media');
  await mkdir(mediaDir,{recursive:true});
  for(const [i,scene] of staged.scenes.entries()) {
    const media=scene.props?.media;
    if(!media)continue;
    const sources=media.kind==='layers'?media.layers:[media];
    for(const source of sources) {
      let file;
      try{file=resolveLocalAsset(source.src,assetRoot,{allowVideo:allowVideo&&media.kind==='video'});}
      catch(e){throw new Error('scenes['+i+'].props.media: '+e.message);}
      const name=createHash('sha256').update(source.src).digest('hex').slice(0,20)+extname(file).toLowerCase();
      await copyFile(file,join(mediaDir,name));
      source.src='./media/'+name;
    }
  }
  return staged;
}
