async function buildExportHtml(exportData=data, exportPages=pages){
  const stamp=makeTimestamp();
  const currentJson=JSON.stringify(exportData,null,2).replace(/</g,"\u003c");
  const pagesJson=JSON.stringify(exportPages,null,2).replace(/</g,"\u003c");
  const uniqueKey="kip-checklist-saved-"+Date.now();
  const clone=document.documentElement.cloneNode(true);
  ["overlay","saveOverlay","exportOverlay","fontOverlay","dryListOverlay","fullReportOverlay","confirmOverlay"].forEach(id=>{
    const el=clone.querySelector("#"+id);
    if(el){el.classList.remove("show");el.style.removeProperty("display");}
  });
  ["importList","fileImportList"].forEach(id=>{const el=clone.querySelector("#"+id);if(el)el.innerHTML="";});
  ["importActions","fileImportActions"].forEach(id=>{const el=clone.querySelector("#"+id);if(el)el.style.display="none";});
  const status=clone.querySelector("#fileImportStatus");if(status)status.textContent="";
  const fp=clone.querySelector("#fileProgressWrap");if(fp)fp.style.display="none";
  const toast=clone.querySelector("#toast");if(toast){toast.className="toast";toast.textContent="";}
  const ocrStatus=clone.querySelector("#ocrStatus");if(ocrStatus)ocrStatus.textContent="";
  const progress=clone.querySelector("#ocrProgressWrap");if(progress)progress.style.display="none";
  const pageContext=clone.querySelector("#pageContextMenu");if(pageContext){pageContext.classList.remove("show");pageContext.style.display="none";}

  // Export is deliberately self-contained: inline CSS and every JS module so the
  // saved HTML keeps working without the original project directory.
  const moduleNames=["storage.js","tags.js","export.js","ocr-utils.js","ocr.js","import.js","ui.js"];
  const [cssText,...moduleTexts]=await Promise.all([
    fetch("./css/app.css").then(r=>{if(!r.ok)throw new Error("Не удалось прочитать CSS");return r.text();}),
    ...moduleNames.map(name=>fetch(`./js/${name}`).then(r=>{if(!r.ok)throw new Error(`Не удалось прочитать ${name}`);return r.text();}))
  ]);
  const head=clone.querySelector("head");
  clone.querySelectorAll('link[rel="stylesheet"]').forEach(el=>{
    if(el.getAttribute("href")?.endsWith("app.css")){
      const style=document.createElement("style");style.textContent=cssText;el.replaceWith(style);
    }
  });
  const moduleTextsByName=new Map(moduleNames.map((name,index)=>[name,moduleTexts[index]]));
  const moduleScripts=[...clone.querySelectorAll('script[src^="./js/"]')];
  moduleScripts.forEach(el=>{
    const name=(el.getAttribute("src")||"").split("/").pop();
    const script=document.createElement("script");
    script.textContent=moduleTextsByName.get(name)||"";
    el.replaceWith(script);
  });
  let exported="<!doctype html>\n"+clone.outerHTML;
  const escapedTitle=JSON.stringify(docTitle).replace(/</g,"\u003c");
  exported=exported.replace(/<title>.*?<\/title>/s,`<title>${docTitle.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</title>`);
  exported=exported.replace(/const INITIAL_DATA = .*?;\s*const INITIAL_PAGES = .*?;\s*const DATA_KEY = ".*?";\s*const FONT_KEY = ".*?";\s*const FONT_FAMILY_KEY = ".*?";\s*const DOC_TITLE_KEY = ".*?";\s*const PAGES_KEY = ".*?";\s*const ACTIVE_PAGE_KEY = ".*?";\s*const THEME_KEY = ".*?";\s*const DEFAULT_TITLE = ".*?";/s,
    `const INITIAL_DATA = ${currentJson};\nconst INITIAL_PAGES = ${pagesJson};\nconst DATA_KEY = "${uniqueKey}";\nconst FONT_KEY = "kip-checklist-font-v1";\nconst FONT_FAMILY_KEY = "kip-checklist-font-family-v1";\nconst DOC_TITLE_KEY = "kip-checklist-title-v1";\nconst PAGES_KEY = "${uniqueKey}-pages";\nconst ACTIVE_PAGE_KEY = "${uniqueKey}-active-page";\nconst THEME_KEY = "${uniqueKey}-theme";\nconst DEFAULT_TITLE = ${escapedTitle};`);
  const selectedFamily=JSON.stringify(safeGetStorage(FONT_FAMILY_KEY,"system"));
  exported=exported.replace(/const DEFAULT_TITLE = .*?;/s,match=>match+`\nconst EXPORTED_FONT_FAMILY = ${selectedFamily};`);
  exported=exported.replace(/const savedFontFamily=localStorage.getItem\(FONT_FAMILY_KEY\)\|\|"system";/,'const savedFontFamily=typeof EXPORTED_FONT_FAMILY!=="undefined"?EXPORTED_FONT_FAMILY:(localStorage.getItem(FONT_FAMILY_KEY)||safeGetStorage(FONT_FAMILY_KEY,"system"));');
  return {html:exported,stamp};
}

async function openBlankNewDocument(){
  save();
  const blankPages=pages.map(page=>({...page,data:[]}));
  const {html:exported}=await buildExportHtml([],blankPages);
  let tab=null;
  try{tab=window.open("about:blank","_blank");}catch(_){}
  if(!tab){showToast("Браузер не разрешил открыть новую вкладку");return;}
  try{
    tab.document.open();
    tab.document.write(exported);
    tab.document.close();
    closeExportMenu();
    showToast("Новый пустой файл открыт");
  }catch(e){
    try{tab.close();}catch(_){}
    showToast("Не удалось открыть новый файл");
  }
}

function safeFileBase(name){
  return name.trim()
    .replace(/[\\/:*?"<>|]/g,"-")
    .replace(/\s+/g," ")
    .replace(/\.+$/,"") || "КИП-чек-лист";
}

function renderExportPageButtons(){
  const wrap=$("exportPageButtons");
  if(!wrap)return;
  wrap.innerHTML="";
  pages.forEach((page,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="choice";
    button.innerHTML=`<span class="ico">${index===0?"⌂":"≡"}</span>${escapeHtml(page.name||`Страница ${index+1}`)}`;
    button.addEventListener("click",()=>sharePageReport(page.id));
    wrap.appendChild(button);
  });
}

function openExportMenu(){
  $("exportTitle").textContent="Сохранить / отправить";
  renderExportPageButtons();
  $("exportOverlay").classList.add("show");
}

function closeExportMenu(){ $("exportOverlay").classList.remove("show"); }

function reportDateTime(){
  return new Date().toLocaleString("ru-RU",{
    day:"2-digit",month:"2-digit",year:"numeric",
    hour:"2-digit",minute:"2-digit"
  });
}

function cleanReportField(value){
  return String(value??"")
    .replace(/[\r\n\t]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function pageTitleForReport(page){
  const name=cleanReportField(page?.name);
  return name||"Без названия";
}

function reportPageHeader(page){
  return `${pageTitleForReport(page)}\n${reportDateTime()}`;
}

function formatReportItems(items,includeTasks=false){
  return items.map((item,index)=>{
    const tag=cleanReportField(item.tag)||"Без тега";
    const task=cleanReportField(item.task);
    return `${index+1}. ${tag}${includeTasks&&task?` — ${task}`:""}`;
  }).join("\n");
}

function buildPageTextReport(page,kind="all"){
  if(!page)return "";
  const done=page.data.filter(item=>item.done);
  const todo=page.data.filter(item=>!item.done);
  const tasks=page.data.filter(item=>!!cleanReportField(item.task));
  const sections=[];
  const addSection=(title,items,includeTasks=false)=>{
    if(items.length) sections.push(`${title}\n${formatReportItems(items,includeTasks)}`);
  };

  if(kind==="done") addSection("Выполненные",done);
  else if(kind==="todo") addSection("Невыполненные",todo);
  else if(kind==="task") addSection("Задания",tasks,true);
  else {
    // «Весь список» содержит только статусные разделы.
    // Задания доступны отдельным вариантом «Задания», чтобы одна позиция
    // с заданием не дублировалась одновременно в общем списке и в разделе заданий.
    addSection("Выполненные",done);
    addSection("Невыполненные",todo);
  }

  const body=sections.length?sections.join("\n\n"):"Нет данных";
  return `${pageTitleForReport(page)}\n\n${body}`;
}

function buildGroupedTextReport(kind="all"){
  // Для отправки всегда используется только открытая пользователем страница.
  return buildPageTextReport(getActivePage(),kind);
}

function toUnicodeBold(value){
  const chars={"A":"𝐀","B":"𝐁","C":"𝐂","D":"𝐃","E":"𝐄","F":"𝐅","G":"𝐆","H":"𝐇","I":"𝐈","J":"𝐉","K":"𝐊","L":"𝐋","M":"𝐌","N":"𝐍","O":"𝐎","P":"𝐏","Q":"𝐐","R":"𝐑","S":"𝐒","T":"𝐓","U":"𝐔","V":"𝐕","W":"𝐖","X":"𝐗","Y":"𝐘","Z":"𝐙","a":"𝐚","b":"𝐛","c":"𝐜","d":"𝐝","e":"𝐞","f":"𝐟","g":"𝐠","h":"𝐡","i":"𝐢","j":"𝐣","k":"𝐤","l":"𝐥","m":"𝐦","n":"𝐧","o":"𝐨","p":"𝐩","q":"𝐪","r":"𝐫","s":"𝐬","t":"𝐭","u":"𝐮","v":"𝐯","w":"𝐰","x":"𝐱","y":"𝐲","z":"𝐳","0":"𝟎","1":"𝟏","2":"𝟐","3":"𝟑","4":"𝟒","5":"𝟓","6":"𝟔","7":"𝟕","8":"𝟖","9":"𝟗"};
  return Array.from(String(value||"")).map(ch=>chars[ch]||ch).join("");
}

function buildFullStateTextReport(){
  const lines=[toUnicodeBold(docTitle||"Tag list"),"","  Страницы:"];
  pages.forEach((page,index)=>lines.push(`  ${index+1}. ${pageTitleForReport(page)}`));
  lines.push("");
  pages.forEach((page,index)=>{
    const done=page.data.filter(item=>item.done);
    const todo=page.data.filter(item=>!item.done);
    const tasks=page.data.filter(item=>!!cleanReportField(item.task));
    lines.push(`  ${toUnicodeBold(pageTitleForReport(page))}`);
    lines.push("");
    const add=(title,items,withTask=false)=>{
      lines.push(`    ${title}`);
      if(!items.length) lines.push("      —");
      else items.forEach((item,i)=>{
        const tag=cleanReportField(item.tag)||"Без тега";
        const task=cleanReportField(item.task);
        lines.push(`      ${i+1}. ${tag}${withTask&&task?` — ${task}`:""}`);
      });
    };
    add("Выполненные",done);
    add("Невыполненные",todo);
    add("Задания",tasks,true);
    if(index<pages.length-1)lines.push("");
  });
  return lines.join("\n");
}

function buildTitlesReport(){
  return pages.map((page,index)=>`${index+1}. ${pageTitleForReport(page)}`).join("\n");
}

async function shareStateLink(){
  closeExportMenu();
  const state={
    v:1,
    docTitle,
    pages:pages.map(page=>({
      id:String(page.id),
      name:String(page.name||""),
      data:cloneItems(page.data),
      updatedAt:page.updatedAt||new Date().toISOString()
    })),
    activePageId,
    theme:safeGetStorage(THEME_KEY,"light"),
    fontScale:Number(safeGetStorage(FONT_KEY,1))||1,
    fontFamily:safeGetStorage(FONT_FAMILY_KEY,"system"),
    filter,
    query:String(query||"")
  };
  const encoded=encodeStateBase64(state);
  const url=`${location.origin}${location.pathname}#state=${encoded}`;
  try{
    if(navigator.share){
      await navigator.share({title:`${docTitle} — состояние`,text:"Tag list: состояние списка",url});
      showToast("Ссылка с состоянием передана");
      return;
    }
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(url);
      showToast("Ссылка с состоянием скопирована");
      return;
    }
    const ta=document.createElement("textarea");
    ta.value=url;ta.style.position="fixed";ta.style.opacity="0";
    document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
    showToast("Ссылка с состоянием скопирована");
  }catch(e){
    if(e?.name!=="AbortError")showToast("Не удалось передать ссылку");
  }
}

async function shareTextPayload(title,text){
  closeExportMenu();
  try{
    if(navigator.share){await navigator.share({title,text});showToast("Текст передан");return;}
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);showToast("Текст скопирован");return;}
    throw new Error("share-unavailable");
  }catch(e){if(e.name!=="AbortError")showToast("Не удалось передать текст");}
}

async function shareTextReport(kind){
  const labels={all:"Весь список",state:"Всё состояние · текст",done:"Выполненные",todo:"Невыполненные",task:"Задания",pages:"Титулы"};
  const text=kind==="state"?buildFullStateTextReport():(kind==="pages"?buildTitlesReport():buildPageTextReport(getActivePage(),kind));
  await shareTextPayload(`${docTitle} — ${labels[kind]}`,text);
}

async function sharePageReport(pageId){
  const page=pages.find(p=>p.id===pageId);
  if(!page)return;
  await shareTextPayload(`${pageTitleForReport(page)}`,buildPageTextReport(page,"all"));
}

async function shareCurrentDocument(){
  const {html:exported,stamp}=await buildExportHtml(data);
  const fileName=`${safeFileBase(docTitle)} — ${stamp}.html`;
  const file=new File([exported],fileName,{type:"text/html"});
  closeExportMenu();
  try{
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
      await navigator.share({title:fileName,files:[file]});
      showToast("Файл передан");return;
    }
    const url=URL.createObjectURL(file);
    const a=document.createElement("a");a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);showToast("Файл подготовлен");
  }catch(e){if(e.name!=="AbortError")showToast("Не удалось передать файл");}
}



