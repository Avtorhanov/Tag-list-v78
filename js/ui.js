function getFontOption(id){return FONT_OPTIONS.find(x=>x.id===id)||FONT_OPTIONS[0];}

function applyFontFamily(id){
  const option=getFontOption(id);
  document.documentElement.style.setProperty("--appFont",option.family);
  safeSetStorage(FONT_FAMILY_KEY,option.id);
  const btn=$("fontBtn");
  if(btn){btn.title=`Шрифт: ${option.name}`;btn.setAttribute("aria-label",`Выбрать шрифт. Сейчас: ${option.name}`);}
}

function cycleFont(){
  const current=safeGetStorage(FONT_FAMILY_KEY,"system")||"system";
  const idx=FONT_OPTIONS.findIndex(x=>x.id===current);
  const next=FONT_OPTIONS[(idx+1+FONT_OPTIONS.length)%FONT_OPTIONS.length];
  applyFontFamily(next.id);
  const bubble=$("fontBubble");
  bubble.textContent=next.name;
  bubble.classList.add("show");
  clearTimeout(cycleFont.timer);
  cycleFont.timer=setTimeout(()=>bubble.classList.remove("show"),850);
}

function openDryReport(kind){
  const labels={all:"Весь список",done:"Выполненные",todo:"Невыполненные",task:"Задания"};
  const text=kind==="all"?buildGroupedTextReport("all"):buildGroupedTextReport(kind);
  $("dryListOverlay").classList.remove("show");
  $("fullReportTitle").textContent=`Сухой список · ${labels[kind]||""}`;
  $("fullReportText").textContent=text;
  $("fullReportOverlay").classList.add("show");
}

function closeDryReport(){
  const active=document.activeElement;
  if(active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) active.blur();
  $("fullReportOverlay").classList.remove("show");
}

function askConfirm(message,title="Подтверждение",okText="Удалить"){
  $("confirmTitle").textContent=title;
  $("confirmMessage").innerHTML=escapeHtml(message).replace(/\n/g,"<br>");
  $("confirmOk").textContent=okText;
  $("confirmOverlay").classList.add("show");
  return new Promise(resolve=>{confirmResolver=resolve;});
}

function finishConfirm(result){$("confirmOverlay").classList.remove("show");const r=confirmResolver;confirmResolver=null;if(r)r(result);}

function applyTheme(theme){
  const selected=THEME_ORDER.includes(theme)?theme:"light";
  document.documentElement.dataset.theme=selected;
  safeSetStorage(THEME_KEY,selected);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content={light:"#f5f7fa",navy:"#0d1726",violet:"#171124",green:"#0d211e"}[selected];
  const icon=$("themeIcon");
  if(icon)icon.textContent=THEME_ICON[selected];
  const btn=$("themeBtn");
  if(btn){btn.title=`Тема: ${selected}. Нажми для смены`;btn.setAttribute("aria-label",`Сменить тему. Сейчас: ${selected}`);}
}

function cycleTheme(){
  const current=safeGetStorage(THEME_KEY,"light")||"light";
  const next=THEME_ORDER[(THEME_ORDER.indexOf(current)+1)%THEME_ORDER.length];
  applyTheme(next);
}

function refreshAfterViewportChange(){
  clearTimeout(viewportRefreshTimer);
  viewportRefreshTimer=setTimeout(()=>{
    document.documentElement.style.setProperty("--viewport-h", `${window.innerHeight}px`);
    if(!document.activeElement || !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){
      renderTabs(); renderList();
    }
  },80);
}

function isStandaloneApp(){
  return window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

function hideInstallButton(){
  deferredInstallPrompt=null;
  if(installAppBtn) installAppBtn.hidden=true;
}

function showInstallFallback(){
  const ua=navigator.userAgent||"";
  const isiOS=/iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
  if(isiOS){
    showToast("Установка на iPhone: нажми «Поделиться» → «На экран „Домой“»");
  }else{
    showToast("Установка через кнопку сейчас недоступна. Открой меню браузера и выбери «Установить приложение».");
  }
}



let modalScrollY = 0;
let modalLocked = false;
function updateModalScrollLock(){
  const open = !!document.querySelector(".overlay.show");
  if(open && !modalLocked){
    modalScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.dataset.modalScrollY = String(modalScrollY);
    document.body.style.position = "fixed";
    document.body.style.top = `-${modalScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.classList.add("modal-open");
    modalLocked = true;
  }else if(!open && modalLocked){
    document.body.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    const y = Number(document.body.dataset.modalScrollY || modalScrollY || 0);
    delete document.body.dataset.modalScrollY;
    modalLocked = false;
    requestAnimationFrame(()=>window.scrollTo(0,y));
  }
}

const modalObserver = new MutationObserver(updateModalScrollLock);
const tabs = $("tabs"), list = $("list");
const overlay = $("overlay"), tagInput = $("tagInput");
const statusInput = $("statusInput"), manualTaskInput = $("manualTaskInput"), modalTitle = $("modalTitle"), deleteBtn = $("deleteBtn");






































document.querySelectorAll(".overlay").forEach(el=>modalObserver.observe(el,{attributes:true,attributeFilter:["class"]}));

document.addEventListener("focusin",e=>{
  const target=e.target;
  if(!target?.matches?.("input,textarea,select"))return;
  if(!target.closest(".sheet"))return;
  setTimeout(()=>{
    try{target.scrollIntoView({block:"nearest",inline:"nearest",behavior:"smooth"});}catch(_){}
  },120);
});

document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushSave();});
window.addEventListener("pagehide",flushSave);









// Один набор обработчиков вместо обработчика на каждом теге. Это заметно снижает
// количество объектов/замыканий на длинных списках и уменьшает нагрузку на iPhone/Android.
tabs.addEventListener("click",e=>{
  const b=e.target.closest(".tab");
  if(!b)return;
  if(selectionMode)setSelectionMode(false);
  filter=b.dataset.filter||"all";
  renderTabs();renderSummary();renderList();
});










list.addEventListener("click",e=>{
  const ref=rowItemFromTarget(e.target);
  if(!ref)return;
  const {row,item}=ref;

  const editBtn=e.target.closest(".rowEdit");
  if(editBtn){
    e.stopPropagation();
    openEdit(item.id);
    return;
  }
  const cancelBtn=e.target.closest(".rowCancel");
  if(cancelBtn){
    e.stopPropagation();
    setSelectionMode(false);
    return;
  }
  const selectBtn=e.target.closest(".rowSelect");
  if(selectBtn){
    e.stopPropagation();
    toggleTagSelection(item.id);
    return;
  }
  const copyBtn=e.target.closest(".rowCopy");
  if(copyBtn){
    e.stopPropagation();
    const ids=selectedTagIds.size?[...selectedTagIds]:[item.id];
    copyTags(ids);
    return;
  }
  if(e.target.closest(".check")){
    e.stopPropagation();
    item.done=!item.done;
    haptic(18);
    save();
    updateRenderedRowState(row,item);
    renderTabs();renderSummary();
    if(filter==="done"||filter==="todo")renderList();
    return;
  }
  if(selectionMode && !e.target.closest("button,textarea,input,select")){
    e.stopPropagation();
    toggleTagSelection(item.id);
    return;
  }
  const taskToggle=e.target.closest(".taskToggle");
  if(taskToggle){
    e.stopPropagation();
    setTaskEditor(row,item,!row.querySelector(".taskEditorWrap")?.classList.contains("open"),true);
    return;
  }
  const taskSave=e.target.closest(".taskSave");
  if(taskSave){
    e.stopPropagation();
    const ta=row.querySelector(".taskBox textarea");
    item.task=String(ta?.value||"").trim();
    save();
    const toggle=row.querySelector(".taskToggle");
    toggle?.classList.toggle("hasTask",!!item.task);
    setTaskEditor(row,item,false);
    renderTabs();
    return;
  }
  if(longPressTriggered){e.preventDefault();longPressTriggered=false;}
});
list.addEventListener("contextmenu",e=>{
  // На Android долгий тап может породить contextmenu. Он никогда не открывает
  // редактирование: редактирование доступно только через карандаш.
  if(e.target.closest(".row")){
    e.preventDefault();
    e.stopPropagation();
    longPressTriggered=false;
  }
});
list.addEventListener("touchstart",e=>{
  if(e.target.closest("textarea,input,select,button"))return;
  const ref=rowItemFromTarget(e.target);
  if(ref)startLongPress(ref.item.id);
},{passive:true});
list.addEventListener("touchmove",e=>{if(e.target.closest(".row"))cancelLongPress();},{passive:true});
list.addEventListener("touchend",cancelLongPress,{passive:true});
list.addEventListener("touchcancel",cancelLongPress,{passive:true});

















let pullGuardStartY=0;
document.addEventListener("touchstart",e=>{
  if(e.touches?.length!==1)return;
  pullGuardStartY=e.touches[0].clientY;
},{passive:true});
document.addEventListener("touchmove",e=>{
  if(e.touches?.length!==1)return;
  const dy=e.touches[0].clientY-pullGuardStartY;
  if(window.scrollY<=0 && dy>8 && !e.target.closest(".pageStrip,.tabs,.importList,.taskBox textarea,.fullReportText,.fullReportSheet,.sheet")){
    e.preventDefault();
  }
},{passive:false});



























let addMode="manual";
let ocrCandidates=[];
let ocrCandidateMeta=new Map();
let ocrRunToken=0;








































let fileCandidates=[];
let sheetJsPromise=null;










const FONT_OPTIONS=[
  {id:"system",name:"Системный",family:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',sample:"Aa КИП 123"},
  {id:"arial",name:"Arial",family:'Arial,"Helvetica Neue",sans-serif',sample:"Aa КИП 123"},
  {id:"verdana",name:"Verdana",family:'Verdana,sans-serif',sample:"Aa КИП 123"},
  {id:"georgia",name:"Georgia",family:'Georgia,"Times New Roman",serif',sample:"Aa КИП 123"},
  {id:"trebuchet",name:"Trebuchet MS",family:'"Trebuchet MS",Arial,sans-serif',sample:"Aa КИП 123"},
  {id:"courier",name:"Courier New",family:'"Courier New",monospace',sample:"Aa КИП 123"}
];






document.querySelectorAll("[data-dry-kind]").forEach(btn=>btn.addEventListener("click",()=>openDryReport(btn.dataset.dryKind)));
$("dryListClose").onclick=()=>$("dryListOverlay").classList.remove("show");
$("dryListOverlay").addEventListener("click",e=>{if(e.target===$("dryListOverlay"))$("dryListOverlay").classList.remove("show")});
$("fullReportClose").onclick=closeDryReport;
$("fullReportOverlay").addEventListener("click",e=>{if(e.target===$("fullReportOverlay"))closeDryReport();});

let confirmResolver=null;


$("confirmOk").onclick=()=>finishConfirm(true);
$("confirmCancel").onclick=()=>finishConfirm(false);
$("confirmClose").onclick=()=>finishConfirm(false);
$("confirmOverlay").addEventListener("click",e=>{if(e.target===$("confirmOverlay"))finishConfirm(false)});

const THEME_ORDER=["light","navy","violet","green"];
const THEME_ICON={light:"☼",navy:"☾",violet:"◈",green:"◒"};


$("docTitle").addEventListener("blur",()=>{
  if($("docTitle").getAttribute("contenteditable")==="true"){
    $("docTitle").setAttribute("contenteditable","false");
    $("docTitle").classList.remove("editing");
    saveDocumentTitle();
  }
});
$("docTitle").addEventListener("keydown",e=>{
  if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}
});

document.addEventListener("input",event=>{
  if(event.target.matches(".taskBox textarea")){
    const row=event.target.closest(".row"),id=Number(row?.dataset.id),item=data.find(x=>x.id===id);
    if(item){item.task=event.target.value;scheduleSave();autosizeTaskTextarea(event.target,170);}
  }
});

document.addEventListener("focusin",event=>{
  if(event.target.matches(".taskBox textarea")){
    const editor=event.target.closest(".taskEditorWrap");
    editor?.classList.add("focused");
    autosizeTaskTextarea(event.target,170);
    event.target.scrollTop=0;
  }
});
document.addEventListener("focusout",event=>{
  if(event.target.matches(".taskBox textarea")){
    const editor=event.target.closest(".taskEditorWrap");
    editor?.classList.remove("focused");
    autosizeTaskTextarea(event.target,125);
  }
});

let searchRenderFrame=0;
$("search").addEventListener("input",e=>{
  const value=String(e.target.value||"");
  if(!value.trim()){
    if(selectionMode)setSelectionMode(false);
    query="";
    e.target.value="";
    $("searchPanel").classList.remove("show");
    renderSummary();
    if(searchRenderFrame)cancelAnimationFrame(searchRenderFrame);
    searchRenderFrame=requestAnimationFrame(()=>{searchRenderFrame=0;renderList();});
    return;
  }
  if(selectionMode)setSelectionMode(false);
  query=value;
  renderSummary();
  if(searchRenderFrame)cancelAnimationFrame(searchRenderFrame);
  searchRenderFrame=requestAnimationFrame(()=>{searchRenderFrame=0;renderList();});
});
$("searchBtn").onclick=()=>{$("searchPanel").classList.add("show");setTimeout(()=>$("search").focus(),20);};
$("searchClose").onclick=()=>{query="";$("search").value="";$("searchPanel").classList.remove("show");renderSummary();renderList();};
$("fontMinus").onclick=()=>{
  let s=parseFloat(document.documentElement.style.getPropertyValue("--fontScale"))||1;
  s=Math.max(.65,Math.round((s-.1)*10)/10);document.documentElement.style.setProperty("--fontScale",s);safeSetStorage(FONT_KEY,s);
};
$("fontPlus").onclick=()=>{
  let s=parseFloat(document.documentElement.style.getPropertyValue("--fontScale"))||1;
  s=Math.min(1.35,Math.round((s+.1)*10)/10);document.documentElement.style.setProperty("--fontScale",s);safeSetStorage(FONT_KEY,s);
};
$("addBtn").onclick=openAdd;
$("exportAction").onclick=openExportMenu;
$("dryListBtn").onclick=()=>$("dryListOverlay").classList.add("show");
$("exportCloseBtn").onclick=closeExportMenu;
$("exportAllBtn").onclick=()=>shareTextReport("all");
$("exportDoneBtn").onclick=()=>shareTextReport("done");
$("exportTodoBtn").onclick=()=>shareTextReport("todo");
$("exportTaskBtn").onclick=()=>shareTextReport("task");
$("exportTreeBtn").onclick=shareStateLink;
$("exportOverlay").addEventListener("click",e=>{if(e.target===$("exportOverlay"))closeExportMenu();});
$("themeBtn").onclick=cycleTheme;
$("fontBtn").onclick=cycleFont;
$("addPageBtn").onclick=createPage;
$("pageManageEdit").onclick=()=>{
  if(selectedPageIds.size!==1){showToast("Выбери одну страницу");return;}
  editSelectedPage();
};
$("pageManageSelect").onclick=()=>selectAllPages();
$("pageManageDelete").onclick=()=>{if(selectedPageIds.size)deleteSelectedPages();};
$("pageManageClose").onclick=exitPageManage;
document.addEventListener("pointerdown",e=>{
  const menu=$("pageContextMenu");
  if(menu?.classList.contains("show")&&!menu.contains(e.target)&&!e.target.closest(".pageChip"))closePageContextMenu();
});
document.addEventListener("scroll",closePageContextMenu,{passive:true});
$("closeBtn").onclick=closeModal;

$("cameraChoice").onclick=()=>{setAddMode("camera"); setTimeout(()=>$("cameraInput").click(),50);};
$("photoChoice").onclick=()=>{setAddMode("photo"); setTimeout(()=>$("photoInput").click(),50);};
$("fileChoice").onclick=()=>setAddMode("file");

$("ocrBackBtn").onclick=()=>{
  $("importList").innerHTML=""; $("importActions").style.display="none"; ocrCandidateMeta=new Map();
  $("ocrStatus").textContent=""; $("ocrProgressWrap").style.display="none";
  setAddMode("manual");
};
$("fileSelectBtn").onclick=()=>$("importFileInput").click();
$("filePasteBtn").onclick=pasteTextImport;
$("fileBackBtn").onclick=()=>{
  $("fileImportList").innerHTML="";$("fileImportActions").style.display="none";$("fileImportStatus").textContent="";
  $("fileProgressWrap").style.display="none";setFileProgress(0);
  setAddMode("manual");
};
updateOcrConfigStatus();
$("cameraInput").addEventListener("change",async e=>{
  const file=e.target.files && e.target.files[0]; e.target.value="";
  if(!file)return;
  try{await ensureOcrLoaded(); runOCR(file);}catch(err){showToast(err.message||"Не удалось загрузить OCR");}
});
$("photoInput").addEventListener("change",async e=>{
  const file=e.target.files && e.target.files[0]; e.target.value="";
  if(!file)return;
  try{await ensureOcrLoaded(); runOCR(file);}catch(err){showToast(err.message||"Не удалось загрузить OCR");}
});
$("importFileInput").addEventListener("change",event=>{
  const file=event.target.files&&event.target.files[0];if(file)runFileImport(file);event.target.value="";
});
$("importBtn").onclick=async()=>{try{await ensureOcrLoaded();importCandidates();}catch(err){showToast(err.message||"Не удалось загрузить OCR");}};
$("cancelImportBtn").onclick=()=>setAddMode("manual");
$("fileImportBtn").onclick=importFileCandidates;
$("cancelFileImportBtn").onclick=()=>setAddMode("manual");
$("duplicateEditBtn").onclick=()=>{
  const pending=pendingDuplicate?.pending;closeDuplicateDialog();
  if(pending){tagInput.value=pending.tag;manualTaskInput.value=pending.task||"";statusInput.value=pending.done?"done":"todo";setAddMode("manual");setTimeout(()=>tagInput.focus(),50);}
};
$("duplicateDeleteBtn").onclick=()=>{
  if(!pendingDuplicate)return;
  const pending=pendingDuplicate.pending,duplicateId=pendingDuplicate.duplicateId;
  data=data.filter(item=>item.id!==duplicateId);save();closeDuplicateDialog();
  editId=pending.editId;tagInput.value=pending.tag;manualTaskInput.value=pending.task||"";statusInput.value=pending.done?"done":"todo";
  if(editId!==null){
    const item=data.find(x=>x.id===editId);
    if(item){item.unit=pending.unit;item.tag=pending.tag;item.done=pending.done;item.task=pending.task||"";save();closeModal();render();showToast("Дубликат удалён, запись обновлена");return;}
  }
  const max=data.reduce((m,x)=>Math.max(m,Number(x.id)||0),0);data.push({id:max+1,unit:pending.unit,tag:pending.tag,done:pending.done,task:pending.task||""});save();closeModal();render();showToast("Дубликат удалён, новый прибор добавлен");
};
$("duplicateCloseBtn").onclick=closeDuplicateDialog;
$("duplicateOverlay").addEventListener("click",e=>{if(e.target===$("duplicateOverlay"))closeDuplicateDialog();});

$("saveBtn").onclick=saveModal;
deleteBtn.onclick=deleteCurrent;
overlay.addEventListener("click",e=>{if(e.target===overlay)closeModal();});
$("deleteAll").onclick=()=>{
  if(selectionMode){
    const ids=[...selectedTagIds].filter(id=>visibleData().some(item=>item.id===id));
    if(!ids.length){showToast("Выбери теги для удаления");return;}
    const set=new Set(ids);
    data=data.filter(item=>!set.has(item.id));
    selectedTagIds.clear();
    selectionMode=false;
    document.body.classList.remove("selection-mode-active");
    save();
    updateSelectionFooter();
    render();
    showToast(`Удалено тегов: ${ids.length}`);
    return;
  }
  const count=data.length;
  if(!count){showToast("Список уже пуст");return;}
  data=[];
  save();
  filter="all";
  render();
  showToast(`Удалено тегов: ${count}`);
};

$("selectAllTags").onclick=()=>{
  if(!selectionMode)return;
  const scope=visibleData();
  if(!scope.length){showToast("В текущей вкладке нет тегов");return;}
  const allSelected=scope.every(item=>selectedTagIds.has(item.id));
  if(allSelected) selectedTagIds=new Set();
  else selectedTagIds=new Set(scope.map(item=>item.id));
  updateSelectionFooter();
  renderList();
  haptic(12);
  showToast(allSelected?"Выбор текущей вкладки снят":`Выбраны теги текущей вкладки: ${scope.length}`);
};

$("markSelectedDone").onclick=()=>{
  if(!selectionMode || !selectedTagIds.size)return;
  const scope=visibleData();
  const selected=scope.filter(item=>selectedTagIds.has(item.id));
  const todo=selected.filter(item=>!item.done).length;
  if(!todo){updateSelectionFooter();return;}
  selected.forEach(item=>{item.done=true;});
  haptic(20);
  save();
  updateSelectionFooter();
  render();
  showToast(`Выполнено выбранных: ${todo}`);
};

$("markAllDone").onclick=()=>{
  if(selectionMode)return;
  const scope=visibleData();
  const todo=scope.filter(item=>!item.done).length;
  if(!todo){showToast("В текущей вкладке все теги уже отмечены");return;}
  scope.forEach(item=>{item.done=true;});
  save();
  render();
  showToast(`Отмечены как выполненные: ${todo}`);
};

$("clearChecks").onclick=()=>{
  if(selectionMode)return;
  const scope=visibleData();
  const marked=scope.filter(item=>item.done).length;
  if(!marked){showToast("В текущей вкладке нет отметок");return;}
  scope.forEach(item=>{item.done=false;});
  save();
  render();
  showToast(`Сняты отметки: ${marked}`);
};
document.addEventListener("selectstart",e=>{
  if(e.target.closest("input,textarea,select,[contenteditable=true]")) return;
  if(e.target.closest("button,.pageChip,.tab,.row,.utilityRow,.footer,.fab,.searchClose")) e.preventDefault();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();closeDuplicateDialog();if(selectionMode){setSelectionMode(false);}$("dryListOverlay").classList.remove("show");closeDryReport();if(confirmResolver)finishConfirm(false);}});

// Enter в поле тега сохраняет запись и закрывает клавиатуру;
// в многострочном задании сохранение выполняется по Ctrl/Cmd+Enter.
tagInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();tagInput.blur();saveModal();}});
manualTaskInput.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();manualTaskInput.blur();saveModal();}});


// v58: браузеры Android иногда оставляют старые размеры viewport после поворота.
// Даём движку один кадр на перерасчёт, не меняя данные и не трогая активное поле ввода.
let viewportRefreshTimer=0;

window.addEventListener("orientationchange",()=>requestAnimationFrame(refreshAfterViewportChange),{passive:true});
window.addEventListener("resize",()=>{ if(Math.abs((window.innerWidth||0)-((window.visualViewport&&window.visualViewport.width)||window.innerWidth))>2) return; refreshAfterViewportChange(); },{passive:true});
if(window.visualViewport) window.visualViewport.addEventListener("resize",refreshAfterViewportChange,{passive:true});

// OCR is included as a lightweight module; this boundary keeps the existing async call sites intact.
let ocrLoadPromise=null;
function ensureOcrLoaded(){
  if(window.runOCR && window.importCandidates) return Promise.resolve();
  return Promise.reject(new Error("Не удалось загрузить OCR-модуль."));
}

// PWA installation.
// Chromium-based browsers can provide the native install prompt via beforeinstallprompt.
// iOS does not expose that event: the button gives the native Safari/Chrome installation path.
let deferredInstallPrompt=null;
const installAppBtn=$("installApp");





if(installAppBtn && isStandaloneApp()){
  hideInstallButton();
}

window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  if(installAppBtn && !isStandaloneApp()) installAppBtn.hidden=false;
});

if(installAppBtn){
  installAppBtn.onclick=async()=>{
    if(isStandaloneApp()){
      hideInstallButton();
      return;
    }
    if(!deferredInstallPrompt){
      showInstallFallback();
      return;
    }

    const promptEvent=deferredInstallPrompt;
    deferredInstallPrompt=null;
    try{
      const choice=await promptEvent.prompt();
      if(choice?.outcome==="accepted"){
        installAppBtn.hidden=true;
      }
      await promptEvent.userChoice.catch(()=>null);
    }catch(_){
      // Не меняем остальной интерфейс приложения при сбое системного prompt.
    }
  };
}

window.addEventListener("appinstalled",hideInstallButton);


const savedFont=parseFloat(safeGetStorage(FONT_KEY,null));
if(savedFont) document.documentElement.style.setProperty("--fontScale",savedFont);
const savedFontFamily=safeGetStorage(FONT_FAMILY_KEY,"system")||"system";
applyFontFamily(savedFontFamily);
applyTheme(safeGetStorage(THEME_KEY,"navy")||"navy");
applyDocumentTitle();
render();

const appSplash=$("appSplash");
if(appSplash){
  requestAnimationFrame(()=>requestAnimationFrame(()=>appSplash.classList.add("hide")));
}

