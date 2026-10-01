const INITIAL_DATA = [];
const INITIAL_PAGES = null;
const DATA_KEY = "kip-checklist-v56";
const FONT_KEY = "kip-checklist-font-v1";
const FONT_FAMILY_KEY = "kip-checklist-font-family-v1";
const DOC_TITLE_KEY = "kip-checklist-title-v1";
const PAGES_KEY = "kip-checklist-pages-v56";
const ACTIVE_PAGE_KEY = "kip-checklist-active-page-v56";
const THEME_KEY = "kip-checklist-theme-v56";
const DEFAULT_TITLE = "Tag list";

/* v77 state links: compact, self-contained URL fragment.
   The fragment is local-only: it is never sent to the server as an HTTP request. */
function encodeStateBase64(value){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let binary="";
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  }
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,";
}
function decodeStateBase64(value){
  try{
    const normalized=String(value||"").replace(/-/g,"+").replace(/_/g,"/");
    const padded=normalized+"=".repeat((4-normalized.length%4)%4);
    const binary=atob(padded);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }catch(_){return null;}
}
function applySharedStateFromHash(){
  const match=location.hash.match(/^#state=([A-Za-z0-9_-]+)$/);
  if(!match)return null;
  const state=decodeStateBase64(match[1]);
  if(!state || state.v!==1 || !Array.isArray(state.pages) || !state.pages.length)return null;
  try{
    const restored=normalizeUniquePageNames(state.pages.map((page,index)=>({
      id:String(page.id||createPageId()),
      name:String(page.name||`Страница ${index+1}`).trim()||`Страница ${index+1}`,
      data:cloneItems(page.data),
      updatedAt:page.updatedAt||new Date().toISOString()
    })));
    safeSetStorage(PAGES_KEY,JSON.stringify(restored));
    const active=restored.some(p=>p.id===state.activePageId)?state.activePageId:restored[0].id;
    safeSetStorage(ACTIVE_PAGE_KEY,active);
    const title=String(state.docTitle||DEFAULT_TITLE).trim().slice(0,80)||DEFAULT_TITLE;
    safeSetStorage(DOC_TITLE_KEY,title);
    safeSetStorage(DATA_KEY,JSON.stringify(restored.find(p=>p.id===active)?.data||[]));
    if(state.theme) safeSetStorage(THEME_KEY,String(state.theme));
    if(Number.isFinite(Number(state.fontScale))) safeSetStorage(FONT_KEY,Math.min(1.35,Math.max(.65,Number(state.fontScale))));
    if(state.fontFamily) safeSetStorage(FONT_FAMILY_KEY,String(state.fontFamily));
    return state;
  }catch(_){return null;}
}

// Не даём браузеру превращать вертикальное вытягивание страницы в pull-to-refresh,
// если движок поддерживает overscroll-behavior. Обычный вертикальный скролл при этом сохраняется.
try{document.documentElement.style.overscrollBehaviorY="none";document.body.style.overscrollBehaviorY="none";}catch(_){ }

const sharedState = applySharedStateFromHash();
let docTitle = loadDocumentTitle();
let pages = loadPages();
let activePageId = loadActivePageId();
let data = getActivePage().data;
let filter = typeof sharedState?.filter === "string" ? sharedState.filter : "all";
let query = typeof sharedState?.query === "string" ? sharedState.query : "";
let pageManageMode = false;
let selectedPageIds = new Set();
let pageLongPressTimer = null;
let pageLongPressTriggered = false;
let editId = null;
let selectionMode = false;
let selectedTagIds = new Set();
let longPressTimer = null;
let longPressTriggered = false;
let pendingDuplicate = null;
let saveTimer = null;

const $ = id => document.getElementById(id);

// v68 UX: блокируем прокрутку основного списка при открытом модальном окне,


function safeGetStorage(key,fallback=null){
  try{const value=localStorage.getItem(key);return value===null?fallback:value;}
  catch(e){return fallback;}
}

function loadDocumentTitle(){
  const saved=(safeGetStorage(DOC_TITLE_KEY,"")||"").trim();
  // Migrate the previous built-in title; keep any user-defined title unchanged.
  if(saved==="КИП — чек-лист" || saved==="КИП — чек-лист • v67" || saved==="Tag-list"){
    safeSetStorage(DOC_TITLE_KEY,DEFAULT_TITLE);
    safeSetStorage("kip-last-file-name",DEFAULT_TITLE);
    return DEFAULT_TITLE;
  }
  return saved || DEFAULT_TITLE;
}

function applyDocumentTitle(){
  const el=$("docTitle");
  if(el) el.textContent=docTitle;
  document.title=docTitle;
  const appleMeta=document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if(appleMeta) appleMeta.setAttribute("content",docTitle);
  const appMeta=document.querySelector('meta[name="application-name"]');
  if(appMeta) appMeta.setAttribute("content",docTitle);
}

function saveDocumentTitle(){
  const el=$("docTitle");
  const value=(el?.textContent||"").replace(/\s+/g," ").trim();
  docTitle=value||DEFAULT_TITLE;
  safeSetStorage(DOC_TITLE_KEY,docTitle);
  safeSetStorage("kip-last-file-name",docTitle);
  const page=getActivePage();if(page){page.updatedAt=new Date().toISOString();persistPages();}
  applyDocumentTitle();
  renderLastSaved();
}

function cloneInitial(){ return INITIAL_DATA.map(x => ({...x, task:String(x.task||"")})); }

function normalizeItem(value,index=0){
  const x=(value&&typeof value==="object")?value:{};
  const numericId=Number(x.id);
  return {
    id:Number.isFinite(numericId)&&numericId>=0?numericId:index+1,
    unit:String(x.unit??"").trim(),
    tag:String(x.tag??"").trim(),
    done:x.done===true || x.done===1 || x.done==="true",
    task:String(x.task??"")
  };
}

function cloneItems(items){
  return Array.isArray(items) ? items.map((x,i)=>normalizeItem(x,i)).filter(x=>x.tag || x.unit || x.task) : [];
}

function safeSetStorage(key,value){
  try{localStorage.setItem(key,value);return true;}
  catch(e){console.warn("Tag list: local storage write failed",e);return false;}
}

function loadData(){
  try{
    const raw = safeGetStorage(DATA_KEY,null);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length) return cloneItems(parsed);
    }
  }catch(e){}
  const fresh = cloneInitial();
  safeSetStorage(DATA_KEY, JSON.stringify(fresh));
  return fresh;
}

function createPageId(){return `page-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;}

function normalizePageName(value,fallback="Страница"){
  const base=String(value??"").replace(/\s+/g," ").trim().slice(0,60)||fallback;
  const used=new Set(pages.map(page=>String(page.name||"").trim().toLocaleLowerCase("ru-RU")));
  if(!used.has(base.toLocaleLowerCase("ru-RU")))return base;
  let n=2;
  while(used.has(`${base} (${n})`.toLocaleLowerCase("ru-RU")))n++;
  return `${base} (${n})`.slice(0,60);
}

function normalizeUniquePageNames(list){
  const used=new Set();
  return list.map((page,index)=>{
    const raw=String(page.name||`Страница ${index+1}`).replace(/\s+/g," ").trim()||`Страница ${index+1}`;
    let name=raw.slice(0,60), n=2;
    while(used.has(name.toLocaleLowerCase("ru-RU"))){
      const suffix=` (${n++})`;
      name=`${raw.slice(0,60-suffix.length)}${suffix}`;
    }
    used.add(name.toLocaleLowerCase("ru-RU"));
    return {...page,name};
  });
}

function loadPages(){
  try{
    const raw=safeGetStorage(PAGES_KEY,null);
    if(raw){
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length){
        const restored=normalizeUniquePageNames(parsed.map((page,index)=>({
          id:String(page.id||createPageId()),
          name:String(page.name||`Страница ${index+1}`).trim()||`Страница ${index+1}`,
          data:cloneItems(page.data),
          updatedAt:page.updatedAt||new Date().toISOString()
        })));
        safeSetStorage(PAGES_KEY,JSON.stringify(restored));
        return restored;
      }
    }
  }catch(e){}
  if(Array.isArray(INITIAL_PAGES) && INITIAL_PAGES.length){
    const restored=normalizeUniquePageNames(INITIAL_PAGES.map((page,index)=>({id:String(page.id||createPageId()),name:String(page.name||`Страница ${index+1}`).trim()||`Страница ${index+1}`,data:cloneItems(page.data),updatedAt:page.updatedAt||new Date().toISOString()})));
    safeSetStorage(PAGES_KEY,JSON.stringify(restored));
    return restored;
  }
  const first={id:createPageId(),name:"Основная страница",data:loadData(),updatedAt:new Date().toISOString()};
  safeSetStorage(PAGES_KEY,JSON.stringify([first]));
  return [first];
}

function loadActivePageId(){
  const stored=safeGetStorage(ACTIVE_PAGE_KEY,null);
  return pages.some(page=>page.id===stored) ? stored : pages[0].id;
}

function getActivePage(){return pages.find(page=>page.id===activePageId)||pages[0];}

function persistPages(){safeSetStorage(PAGES_KEY,JSON.stringify(pages));safeSetStorage(ACTIVE_PAGE_KEY,activePageId);}

function formatSaved(value){
  const date=new Date(value||0);
  if(Number.isNaN(date.getTime()))return "Сохранено на устройстве: —";
  return `Сохранено на устройстве: ${date.toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}`;
}

function renderLastSaved(){
  const el=$("lastSaved"),page=getActivePage();
  if(el&&page)el.textContent=formatSaved(page.updatedAt);
}

function renderPages(){
  const strip=$("pageStrip");
  if(!strip)return;
  strip.innerHTML="";
  pages.forEach(page=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="pageChip"+(page.id===activePageId?" active":"")+(selectedPageIds.has(page.id)?" selected":"");
    if(page.id===activePageId) button.setAttribute("aria-current","page");
    button.title=pageManageMode?"Нажми для выбора страницы":"Нажми для открытия • удерживай для управления";
    if(pageManageMode){
      const mark=document.createElement("span");
      mark.className="pageChipMark";mark.textContent="✓";mark.setAttribute("aria-hidden","true");
      button.appendChild(mark);
    }
    const name=document.createElement("span");name.className="pageName";name.textContent=page.name;
    const count=document.createElement("span");count.className="pageCount";count.textContent=`• ${page.data.length}`;
    button.append(name,count);
    button.onclick=()=>{
      if(pageLongPressTriggered){pageLongPressTriggered=false;return;}
      if(pageManageMode){togglePageSelection(page.id);return;}
      selectPage(page.id);
    };
    button.addEventListener("selectstart",e=>e.preventDefault());
    button.addEventListener("dragstart",e=>e.preventDefault());
    let pressX=0,pressY=0;
    button.addEventListener("pointerdown",e=>{
      if(e.pointerType==="mouse" && e.button!==0)return;
      pressX=e.clientX;pressY=e.clientY;
      startPageLongPress(page.id);
    });
    button.addEventListener("pointermove",e=>{
      if(Math.abs(e.clientX-pressX)>10 || Math.abs(e.clientY-pressY)>10)cancelPageLongPress();
    });
    button.addEventListener("pointerup",cancelPageLongPress);
    button.addEventListener("pointercancel",cancelPageLongPress);
    button.addEventListener("contextmenu",e=>{e.preventDefault();cancelPageLongPress();enterPageManage(page.id,false);});
    strip.appendChild(button);
  });
  updatePageManageBar();
}

function startPageLongPress(id){
  cancelPageLongPress();
  pageLongPressTriggered=false;
  pageLongPressTimer=setTimeout(()=>{
    pageLongPressTimer=null;
    pageLongPressTriggered=true;
    enterPageManage(id,false);
    if(navigator.vibrate)navigator.vibrate(25);
  },650);
}

function cancelPageLongPress(){
  if(pageLongPressTimer){clearTimeout(pageLongPressTimer);pageLongPressTimer=null;}
}

function updatePageManageBar(){
  const bar=$("pageManageBar");
  if(!bar)return;
  bar.classList.toggle("show",pageManageMode);
  const edit=$("pageManageEdit"),del=$("pageManageDelete");
  if(edit){edit.disabled=selectedPageIds.size!==1;edit.style.opacity=selectedPageIds.size===1?"1":".45";}
  if(del){del.disabled=selectedPageIds.size===0;del.style.opacity=selectedPageIds.size?"1":".45";}
}

function enterPageManage(id,selectAll=false){
  pageManageMode=true;
  selectedPageIds=selectAll?new Set(pages.map(page=>page.id)):new Set([id]);
  renderPages();
  updatePageManageBar();
}

function exitPageManage(){
  pageManageMode=false;
  selectedPageIds.clear();
  closePageContextMenu();
  renderPages();
  updatePageManageBar();
}

function togglePageSelection(id){
  if(selectedPageIds.has(id))selectedPageIds.delete(id);
  else selectedPageIds.add(id);
  renderPages();
  updatePageManageBar();
}

function selectAllPages(){
  if(selectedPageIds.size===pages.length)selectedPageIds.clear();
  else selectedPageIds=new Set(pages.map(page=>page.id));
  renderPages();
  updatePageManageBar();
}

function editSelectedPage(){
  if(selectedPageIds.size!==1)return;
  const id=[...selectedPageIds][0],page=pages.find(item=>item.id===id);
  if(!page)return;
  const name=prompt("Название страницы",page.name);
  if(name===null)return;
  const clean=name.replace(/\s+/g," ").trim();
  if(!clean){showToast("Название не изменено");return;}
  page.name=normalizePageName(clean,page.name);page.updatedAt=new Date().toISOString();
  persistPages();exitPageManage();showToast("Название страницы сохранено");
}

function editPageById(id){
  const page=pages.find(item=>item.id===id);
  if(!page)return;
  const name=prompt("Название страницы",page.name);
  if(name===null)return;
  const clean=name.replace(/\s+/g," ").trim();
  if(!clean){showToast("Название не изменено");return;}
  page.name=normalizePageName(clean,page.name);page.updatedAt=new Date().toISOString();
  persistPages();closePageContextMenu();renderPages();showToast("Название страницы сохранено");
}

async function deleteSelectedPages(){
  const ids=[...selectedPageIds];
  resetTagSelection();
  if(!ids.length)return;
  pages=pages.filter(page=>!ids.includes(page.id));
  if(!pages.length){
    const fresh={id:createPageId(),name:"Основная страница",data:[],updatedAt:new Date().toISOString()};
    pages=[fresh];activePageId=fresh.id;data=fresh.data;
  }else if(!pages.some(page=>page.id===activePageId)){
    const next=pages[0];activePageId=next.id;data=next.data;
  }
  filter="all";query="";
  if($("search"))$("search").value="";
  persistPages();pageManageMode=false;selectedPageIds.clear();closePageContextMenu();render();
  showToast(ids.length===1?"Страница удалена":"Страницы удалены");
}

function deletePageById(id){
  selectedPageIds=new Set([id]);
  deleteSelectedPages();
}

function closePageContextMenu(){
  const menu=$("pageContextMenu");
  if(menu){menu.classList.remove("show");menu.setAttribute("aria-hidden","true");}
  contextPageId=null;
}

function resetTagSelection(){
  selectionMode=false;
  selectedTagIds.clear();
  document.body.classList.remove("selection-mode-active");
}

function selectPage(id){
  const page=pages.find(item=>item.id===id);
  if(!page)return;
  resetTagSelection();
  activePageId=page.id;
  data=page.data;
  filter="all";query="";
  if($("search"))$("search").value="";
  persistPages();render();
}

function createPage(){
  const proposed=`Страница ${pages.length+1}`;
  const name=prompt("Название новой страницы",proposed);
  if(name===null)return;
  const clean=normalizePageName(name.replace(/\s+/g," ").trim()||proposed,proposed);
  const page={id:createPageId(),name:clean,data:[],updatedAt:new Date().toISOString()};
  pages.push(page);resetTagSelection();activePageId=page.id;data=page.data;filter="all";query="";
  if($("search"))$("search").value="";
  persistPages();render();showToast("Создана новая страница");
}

function renameActivePage(){
  const page=getActivePage();if(!page)return;
  const name=prompt("Название текущей страницы",page.name);
  if(name===null)return;
  const clean=name.replace(/\s+/g," ").trim();
  if(!clean){showToast("Название не изменено");return;}
  page.name=normalizePageName(clean,page.name);page.updatedAt=new Date().toISOString();persistPages();render();showToast("Название страницы сохранено");
}

async function deleteActivePage(){
  resetTagSelection();
  const page=getActivePage();
  if(!page)return;
  const isLast=pages.length===1;
  const message=isLast
    ? `Удалить страницу «${page.name}»? Это последняя страница. После удаления будет создана пустая новая страница.`
    : `Удалить страницу «${page.name}»? Все приборы и задания на этой странице будут удалены.`;
  if(!await askConfirm(message,"Удаление страницы","Удалить"))return;
  const index=pages.findIndex(item=>item.id===page.id);
  pages=pages.filter(item=>item.id!==page.id);
  if(!pages.length){
    const fresh={id:createPageId(),name:"Основная страница",data:[],updatedAt:new Date().toISOString()};
    pages=[fresh];
    activePageId=fresh.id;
    data=fresh.data;
  }else{
    const next=pages[Math.min(index,pages.length-1)];
    activePageId=next.id;
    data=next.data;
  }
  filter="all";query="";
  if($("search"))$("search").value="";
  persistPages();render();showToast(isLast?"Страница удалена • создана новая пустая":"Страница удалена");
}

function save(){
  const page=getActivePage();
  if(page){
    page.data=data;
    page.updatedAt=new Date().toISOString();
  }
  persistPages();
  safeSetStorage(DATA_KEY, JSON.stringify(data));
  renderLastSaved();
}

function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>save(),350);
}

function flushSave(){
  clearTimeout(saveTimer);
  save();
}

function haptic(duration=18){
  try{
    if(typeof navigator!=="undefined" && typeof navigator.vibrate==="function") navigator.vibrate(duration);
  }catch(_){ }
}
