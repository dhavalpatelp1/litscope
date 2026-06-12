/* ── Keyword search ──────────────────────── */
function searchOpenAlex(q,count,opts,onStatus){
  var out=[], page=1, per=Math.min(200,count);
  var filters=[];
  if(opts.yf) filters.push('from_publication_date:'+opts.yf+'-01-01');
  if(opts.yt) filters.push('to_publication_date:'+opts.yt+'-12-31');
  if(opts.min>0) filters.push('cited_by_count:>'+(opts.min-1));
  if(opts.articles) filters.push('type:article');
  if(opts.oa) filters.push('is_oa:true');
  function next(){
    if(out.length>=count) return Promise.resolve(out.slice(0,count));
    var p=new URLSearchParams({search:q,'per-page':String(per),page:String(page)});
    if(filters.length) p.set('filter',filters.join(','));
    if(opts.sort==='citations') p.set('sort','cited_by_count:desc');
    else if(opts.sort==='newest') p.set('sort','publication_date:desc');
    onStatus('Fetching results '+(out.length+1)+'–'+Math.min(count,out.length+per)+'…');
    return fetchJSON('https://api.openalex.org/works?'+p.toString()).then(function(j){
      var batch=(j.results||[]).map(normOA);
      out=out.concat(batch);
      if(batch.length<per) return out.slice(0,count);
      page++; return next();
    });
  }
  return next();
}

var S2_FIELDS='paperId,title,abstract,year,citationCount,venue,authors,externalIds,url,openAccessPdf,tldr';
function s2Get(url,onStatus,attempt){
  return fetchJSON(url).catch(function(e){
    if(e.status===429&&attempt<2){
      onStatus('Semantic Scholar is busy — retrying in 10 seconds…');
      return sleep(10000).then(function(){ return s2Get(url,onStatus,attempt+1); });
    }
    throw e;
  });
}
function searchS2(q,count,opts,onStatus){
  var out=[], offset=0;
  function next(){
    if(out.length>=count||offset>=1000) return Promise.resolve(out.slice(0,count));
    var limit=Math.min(100,count-out.length);
    var p=new URLSearchParams({query:q,offset:String(offset),limit:String(limit),fields:S2_FIELDS});
    if(opts.yf||opts.yt) p.set('year',(opts.yf||'')+'-'+(opts.yt||''));
    if(opts.min>0) p.set('minCitationCount',String(opts.min));
    if(opts.articles) p.set('publicationTypes','JournalArticle,Conference,Review');
    if(opts.oa) p.set('openAccessPdf','');
    onStatus('Fetching results '+(offset+1)+'–'+(offset+limit)+'…');
    return s2Get('https://api.semanticscholar.org/graph/v1/paper/search?'+p.toString(),onStatus,0).then(function(j){
      var batch=(j.data||[]).map(normS2);
      out=out.concat(batch);
      if(!j.data||j.data.length<limit) return out.slice(0,count);
      offset+=limit; return next();
    });
  }
  return next();
}

function snowballOA(p,dir,onStatus){
  var key=(dir==='refs'?'cited_by:':'cites:')+p.nativeId;
  var q=new URLSearchParams({'per-page':'200',page:'1',filter:key,sort:'cited_by_count:desc'});
  onStatus(dir==='refs'?'Pulling reference list…':'Pulling citing papers…');
  return fetchJSON('https://api.openalex.org/works?'+q.toString()).then(function(j){
    return (j.results||[]).map(normOA);
  });
}
function snowballS2(p,dir,onStatus){
  var ep=dir==='refs'?'references':'citations';
  var inner=dir==='refs'?'citedPaper':'citingPaper';
  var fields='paperId,title,abstract,year,citationCount,venue,authors,externalIds,url,openAccessPdf';
  var out=[], offset=0;
  function next(){
    if(out.length>=200) return Promise.resolve(out);
    onStatus(dir==='refs'?'Pulling reference list…':'Pulling citing papers…');
    var url='https://api.semanticscholar.org/graph/v1/paper/'+encodeURIComponent(p.nativeId)+'/'+ep+'?fields='+fields+'&limit=100&offset='+offset;
    return s2Get(url,onStatus,0).then(function(j){
      var batch=(j.data||[]).map(function(x){ return normS2(x[inner]||{}); }).filter(function(x){ return x.nativeId||x.doi||x.title!=='Untitled'; });
      out=out.concat(batch);
      if(!j.data||j.data.length<100) return out;
      offset+=100; return next();
    });
  }
  return next();
}
function snowball(p,dir){
  if(!p.nativeId){ setStatus('No citation data is linked to this paper.',true); return; }
  prevView={ papers:papers.slice(), summary:$('summary').textContent };
  busy(true); setStatus('',false,true);
  var job=p.src==='oa'?snowballOA(p,dir,function(m){setStatus(m,false,true);}):snowballS2(p,dir,function(m){setStatus(m,false,true);});
  job.then(function(res){
    papers=res;
    papers.forEach(function(x,i){x._rel=i;});
    applySort($('sort').value);
    var short=p.title.length>60?p.title.slice(0,57)+'…':p.title;
    var label=(dir==='refs'?'References of “':'Papers citing “')+short+'” · '+papers.length+' found';
    render(label);
    $('backBtn').hidden=false;
    setStatus(papers.length?'':'None found — this paper may not have linked citation data.',!papers.length);
    busy(false);
    window.scrollTo({top:0,behavior:'smooth'});
  }).catch(function(e){ fail(e); });
}

function applySort(mode){
  if(mode==='citations') papers.sort(function(a,b){return b.citations-a.citations;});
  else if(mode==='newest') papers.sort(function(a,b){return (+b.year||0)-(+a.year||0);});
  else papers.sort(function(a,b){return a._rel-b._rel;});
}
function setStatus(msg,isError,busyFlag){
  var el=$('status');
  el.textContent=msg||'';
  el.className='status'+(isError?' error':'')+(busyFlag?' busy':'');
}
function busy(on){
  $('go').disabled=on;
  $('go').textContent=on?'Searching…':'Search papers';
}
function fail(e){
  var msg;
  if(e.status===429) msg='Semantic Scholar is rate-limiting right now. Wait a minute and try again, or switch the source to OpenAlex.';
  else if(e.status) msg='The search service returned an error ('+e.status+'). Try again in a moment.';
  else msg='Could not reach the search service. Download the repository and open it through a local web server if your browser restricts direct API access.';
  setStatus(msg,true);
  busy(false);
}

function cardHTML(p,i){
  var saved=!!lib[paperId(p)];
  var bits=[fmtAuthors(p.authors),p.venue,p.year?String(p.year):''].filter(Boolean).join(' · ');
  var cpy=perYear(p);
  var titleHtml=p.link?'<a href="'+esc(p.link)+'" target="_blank" rel="noopener">'+esc(p.title)+'</a>':esc(p.title);
  var h='<span class="rank">'+(saved?'<span class="savedtag">★ </span>':'')+String(i+1).padStart(3,'0')+'</span>'+
    '<h2 class="title">'+titleHtml+'</h2><hr class="redrule">'+
    '<p class="meta">'+esc(bits)+'</p><p class="cites">Cited by <strong>'+(+p.citations).toLocaleString()+'</strong>'+(cpy?' · '+cpy:'')+'</p>';
  if(p.tldr) h+='<p class="tldr"><span class="tlabel">TL;DR — </span>'+hi(p.tldr,meta.query)+'</p>';
  if(p.abstract) h+='<details><summary>Abstract</summary><p class="abs">'+hi(p.abstract,meta.query)+'</p></details>';
  h+='<div class="cardactions">'+
    '<button type="button" class="btn-mini'+(saved?' saved':'')+'" data-act="save">'+(saved?'Saved ✓':'Save')+'</button>'+
    (p.nativeId?'<button type="button" class="btn-mini" data-act="refs">References</button><button type="button" class="btn-mini" data-act="cites">Cited by →</button>':'')+
    (p.pdf?'<a class="btn-mini" href="'+esc(p.pdf)+'" target="_blank" rel="noopener">PDF ↗</a>':'')+
    (p.doi?'<a class="btn-mini" href="https://doi.org/'+esc(p.doi)+'" target="_blank" rel="noopener">DOI ↗</a>':'')+'</div>';
  return h;
}

function render(summaryOverride){
  var list=$('results');
  list.innerHTML='';
  var frag=document.createDocumentFragment();
  papers.forEach(function(p,i){
    var li=document.createElement('li');
    li.className='card';
    li.style.animationDelay=Math.min(i*14,420)+'ms';
    li.innerHTML=cardHTML(p,i);
    var saveBtn=li.querySelector('[data-act="save"]');
    saveBtn.addEventListener('click',function(){ toggleSave(p,li,saveBtn); });
    var rBtn=li.querySelector('[data-act="refs"]');
    var cBtn=li.querySelector('[data-act="cites"]');
    if(rBtn) rBtn.addEventListener('click',function(){ snowball(p,'refs'); });
    if(cBtn) cBtn.addEventListener('click',function(){ snowball(p,'cites'); });
    frag.appendChild(li);
  });
  list.appendChild(frag);
  var sortName={relevance:'relevance',citations:'citations',newest:'year'}[meta.sort]||'relevance';
  $('summary').textContent=summaryOverride||(papers.length+' papers · '+meta.source+' · sorted by '+sortName);
  $('toolbar').hidden=papers.length===0;
  $('empty').hidden=papers.length>0;
}

function runSearch(){
  var q=$('q').value.trim();
  if(!q){ $('q').focus(); return; }
  var yf=$('yfrom').value.trim(), yt=$('yto').value.trim();
  if((yf&&!/^\d{4}$/.test(yf))||(yt&&!/^\d{4}$/.test(yt))){ setStatus('Years need four digits, like 2018.',true); return; }
  var opts={
    yf:yf,yt:yt,
    min:Math.max(0,parseInt($('mincites').value,10)||0),
    articles:$('articlesOnly').checked,
    oa:$('oaOnly').checked,
    sort:$('sort').value
  };
  var count=+$('count').value;
  var source=$('source').value;
  prevView=null; $('backBtn').hidden=true;
  busy(true);
  $('empty').hidden=true; $('toolbar').hidden=true; $('results').innerHTML='';
  setStatus('Searching '+(source==='openalex'?'OpenAlex':'Semantic Scholar')+'…',false,true);
  var job=source==='openalex'?searchOpenAlex(q,count,opts,function(m){setStatus(m,false,true);}):searchS2(q,count,opts,function(m){setStatus(m,false,true);});
  job.then(function(res){
    papers=res;
    papers.forEach(function(p,i){p._rel=i;});
    meta={query:q,source:source==='openalex'?'OpenAlex':'Semantic Scholar',sort:opts.sort};
    if(source==='s2') applySort(opts.sort);
    recents=[q].concat(recents.filter(function(r){return r!==q;})).slice(0,8);
    persistRecents(); renderRecents();
    if(!papers.length) setStatus('No papers matched. Try broader terms or loosen the filters.',true);
    else setStatus('');
    render();
    busy(false);
  }).catch(fail);
}

function renderRecents(){
  var el=$('recent');
  if(!recents.length){ el.hidden=true; return; }
  el.hidden=false;
  el.textContent='Recent: ';
  recents.forEach(function(r){
    var b=document.createElement('button');
    b.type='button'; b.textContent=r;
    b.addEventListener('click',function(){ $('q').value=r; runSearch(); });
    el.appendChild(b);
  });
}
