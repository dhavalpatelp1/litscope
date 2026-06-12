/* ── Library ─────────────────────────────── */
function updateLibCount(){ $('libCount').textContent=Object.keys(lib).length; }
function toggleSave(p,li,btn){
  var id=paperId(p);
  if(lib[id]){
    delete lib[id];
    btn.textContent='Save'; btn.classList.remove('saved');
  } else {
    lib[id]={
      id:id, src:p.src, nativeId:p.nativeId,
      title:p.title, authors:p.authors, year:p.year, venue:p.venue,
      citations:p.citations, abstract:p.abstract, tldr:p.tldr,
      doi:p.doi, pdf:p.pdf, link:p.link,
      status:'toread', note:'', added:Date.now()
    };
    btn.textContent='Saved ✓'; btn.classList.add('saved');
  }
  var tag=li.querySelector('.savedtag');
  if(lib[id]&&!tag){
    var span=document.createElement('span'); span.className='savedtag'; span.textContent='★ ';
    li.querySelector('.rank').prepend(span);
  } else if(!lib[id]&&tag){ tag.remove(); }
  persistLib(); updateLibCount();
}

function libEntries(){
  var arr=Object.keys(lib).map(function(k){return lib[k];});
  arr.sort(function(a,b){return (b.added||0)-(a.added||0);});
  return arr;
}

function renderLibChips(){
  var all=libEntries();
  var counts={all:all.length};
  Object.keys(STATUS_LABELS).forEach(function(s){
    counts[s]=all.filter(function(e){return e.status===s;}).length;
  });
  var box=$('libChips'); box.innerHTML='';
  [['all','All']].concat(Object.keys(STATUS_LABELS).map(function(s){return [s,STATUS_LABELS[s]];}))
    .forEach(function(pair){
      var b=document.createElement('button');
      b.type='button';
      b.className='chip'+(libFilter===pair[0]?' active':'');
      b.textContent=pair[1]+' '+(counts[pair[0]]||0);
      b.addEventListener('click',function(){ libFilter=pair[0]; renderLib(); });
      box.appendChild(b);
    });
}

function renderLib(){
  renderLibChips();
  var list=$('libList'); list.innerHTML='';
  var entries=libEntries();
  if(libFilter!=='all') entries=entries.filter(function(e){return e.status===libFilter;});
  $('libEmpty').hidden=entries.length>0||Object.keys(lib).length>0;
  if(!entries.length&&Object.keys(lib).length){
    $('libEmpty').hidden=false;
    $('libEmpty').innerHTML='No papers with this status yet.';
  } else if(!Object.keys(lib).length){
    $('libEmpty').innerHTML='Nothing saved yet. Run a search and press <strong>Save</strong> on any paper —<br>it lands here with a reading status and a notes field, and stays put between sessions.';
  }
  var frag=document.createDocumentFragment();
  entries.forEach(function(e,i){
    var li=document.createElement('li');
    li.className='card';
    li.style.animationDelay=Math.min(i*14,420)+'ms';
    var bits=[fmtAuthors(e.authors),e.venue,e.year?String(e.year):''].filter(Boolean).join(' · ');
    var cpy=perYear(e);
    var titleHtml=e.link?'<a href="'+esc(e.link)+'" target="_blank" rel="noopener">'+esc(e.title)+'</a>':esc(e.title);
    var sel='<select class="statussel" aria-label="Reading status">'+Object.keys(STATUS_LABELS).map(function(s){
      return '<option value="'+s+'"'+(e.status===s?' selected':'')+'>'+STATUS_LABELS[s]+'</option>';
    }).join('')+'</select>';
    li.innerHTML=
      '<h2 class="title">'+titleHtml+'</h2><hr class="redrule">'+
      '<p class="meta">'+esc(bits)+'</p>'+
      '<p class="cites">Cited by <strong>'+(+e.citations).toLocaleString()+'</strong>'+(cpy?' · '+cpy:'')+'</p>'+
      (e.abstract?'<details><summary>Abstract</summary><p class="abs">'+esc(e.abstract)+'</p></details>':'')+
      '<div class="cardactions">'+sel+
        (e.pdf?'<a class="btn-mini" href="'+esc(e.pdf)+'" target="_blank" rel="noopener">PDF ↗</a>':'')+
        (e.doi?'<a class="btn-mini" href="https://doi.org/'+esc(e.doi)+'" target="_blank" rel="noopener">DOI ↗</a>':'')+
        '<button type="button" class="btn-mini" data-act="remove">Remove</button></div>'+
      '<textarea class="note" placeholder="Notes — key findings, how it fits your thesis, quotes to revisit…">'+esc(e.note||'')+'</textarea>'+
      '<p class="libmeta">Saved '+new Date(e.added||Date.now()).toLocaleDateString()+' · '+(e.src==='oa'?'OpenAlex':'Semantic Scholar')+'</p>';
    li.querySelector('.statussel').addEventListener('change',function(){
      lib[e.id].status=this.value; persistLib(); renderLib();
    });
    li.querySelector('[data-act="remove"]').addEventListener('click',function(){
      delete lib[e.id]; persistLib(); updateLibCount(); renderLib();
    });
    var ta=li.querySelector('.note'), timer=null;
    ta.addEventListener('input',function(){
      var v=this.value;
      clearTimeout(timer);
      timer=setTimeout(function(){ if(lib[e.id]){ lib[e.id].note=v; persistLib(); } },500);
    });
    frag.appendChild(li);
  });
  list.appendChild(frag);
}

function download(name,text,mime){
  var blob=new Blob([text],{type:mime});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function toCSV(arr,withLib){
  var head=['rank','title','authors','year','venue','citations','doi','link','pdf','abstract'];
  if(withLib) head=head.concat(['status','notes','saved_on']);
  var rows=[head].concat(arr.map(function(p,i){
    var r=[i+1,p.title,(p.authors||[]).join('; '),p.year,p.venue,p.citations,p.doi,p.link,p.pdf||'',p.abstract||''];
    if(withLib) r=r.concat([STATUS_LABELS[p.status]||'',p.note||'',p.added?new Date(p.added).toISOString().slice(0,10):'']);
    return r;
  }));
  return rows.map(function(r){
    return r.map(function(f){return '"'+String(f==null?'':f).replace(/"/g,'""')+'"';}).join(',');
  }).join('\r\n');
}
function bibClean(s){ return String(s==null?'':s).replace(/[{}\\]/g,''); }
function toBib(arr){
  var used={};
  return arr.map(function(p){
    var last=(((p.authors||[])[0]||'unknown').trim().split(/\s+/).pop()||'unknown').toLowerCase().replace(/[^a-z]/g,'')||'unknown';
    var word=((p.title||'').match(/[A-Za-z]{4,}/)||['paper'])[0].toLowerCase();
    var key=last+(p.year||'')+word;
    if(used[key]){used[key]++;key+=String.fromCharCode(96+used[key]);}else{used[key]=1;}
    var f=['  title = {'+bibClean(p.title)+'}'];
    if((p.authors||[]).length) f.push('  author = {'+p.authors.map(bibClean).join(' and ')+'}');
    if(p.year) f.push('  year = {'+p.year+'}');
    if(p.venue) f.push('  journal = {'+bibClean(p.venue)+'}');
    if(p.doi) f.push('  doi = {'+p.doi+'}');
    if(p.link) f.push('  url = {'+p.link+'}');
    return '@article{'+key+',\n'+f.join(',\n')+'\n}';
  }).join('\n\n');
}
function toRIS(arr){
  return arr.map(function(p){
    var L=['TY  - JOUR','TI  - '+(p.title||'')];
    (p.authors||[]).forEach(function(a){L.push('AU  - '+a);});
    if(p.year) L.push('PY  - '+p.year);
    if(p.venue) L.push('JO  - '+p.venue);
    if(p.doi) L.push('DO  - '+p.doi);
    if(p.link) L.push('UR  - '+p.link);
    if(p.abstract) L.push('AB  - '+String(p.abstract).replace(/\s+/g,' '));
    if(p.note) L.push('N1  - '+String(p.note).replace(/\s+/g,' '));
    L.push('ER  - ');
    return L.join('\r\n');
  }).join('\r\n');
}
function toText(arr){
  return arr.map(function(p,i){
    return (i+1)+'. '+p.title+' — '+fmtAuthors(p.authors)+(p.year?' ('+p.year+')':'')+'. '+(p.venue?p.venue+'. ':'')+'Cited by '+p.citations+'.'+(p.link?' '+p.link:'');
  }).join('\n');
}
function flash(btn,label){
  var old=btn.textContent;
  btn.textContent=label;
  setTimeout(function(){btn.textContent=old;},1500);
}
function showView(which){
  var search=which==='search';
  $('searchView').hidden=!search;
  $('libraryView').hidden=search;
  $('tabSearch').className='tab'+(search?' active':'');
  $('tabLibrary').className='tab'+(search?'':' active');
  if(!search) renderLib();
}
