'use strict';
var $ = function(id){ return document.getElementById(id); };
var sleep = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
var CUR_YEAR = new Date().getFullYear();
var STATUS_LABELS = { toread:'To read', reading:'Reading', read:'Read', notrel:'Not relevant' };

var papers = [];
var meta = { query:'', source:'', sort:'relevance' };
var prevView = null;
var lib = {};
var recents = [];
var libFilter = 'all';

var store = (function(){
  if (window.storage && window.storage.get) {
    return {
      get: function(k){ return window.storage.get(k, false).then(function(r){ return r ? JSON.parse(r.value) : null; }).catch(function(){ return null; }); },
      set: function(k,v){ return window.storage.set(k, JSON.stringify(v), false).catch(function(){}); }
    };
  }
  try {
    var t='__litscope_test'; localStorage.setItem(t,'1'); localStorage.removeItem(t);
    return {
      get: function(k){ try{ var v=localStorage.getItem('litscope:'+k); return Promise.resolve(v?JSON.parse(v):null); }catch(e){ return Promise.resolve(null); } },
      set: function(k,v){ try{ localStorage.setItem('litscope:'+k, JSON.stringify(v)); }catch(e){} return Promise.resolve(); }
    };
  } catch(e){}
  var mem={};
  return {
    get: function(k){ return Promise.resolve(k in mem ? mem[k] : null); },
    set: function(k,v){ mem[k]=v; return Promise.resolve(); }
  };
})();

function persistLib(){ store.set('library', lib); }
function persistRecents(){ store.set('recent', recents); }

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function hi(raw, q){
  var words=(q||'').split(/\s+/).filter(function(w){return w.length>2;}).map(function(w){
    return w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  });
  if(!words.length) return esc(raw);
  var re=new RegExp('('+words.join('|')+')','gi');
  return String(raw==null?'':raw).split(re).map(function(part,i){
    return i%2 ? '<mark>'+esc(part)+'</mark>' : esc(part);
  }).join('');
}
function deinvert(inv){
  if(!inv) return '';
  var arr=[];
  for(var word in inv){ var ps=inv[word]; for(var i=0;i<ps.length;i++) arr[ps[i]]=word; }
  return arr.join(' ');
}
function slug(s){
  var t=String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
  return t||'papers';
}
function paperId(p){
  if(p.id) return p.id;
  if(p.doi) return 'doi:'+String(p.doi).toLowerCase();
  if(p.nativeId) return p.src+':'+p.nativeId;
  return 't:'+slug(p.title).slice(0,30)+(p.year||'');
}
function fmtAuthors(a){
  if(!a||!a.length) return 'Unknown authors';
  if(a.length<=5) return a.join(', ');
  return a.slice(0,5).join(', ')+', et al. ('+(a.length-5)+' more)';
}
function perYear(p){
  var y=+p.year;
  if(!y||y<1500||!p.citations) return '';
  var v=p.citations/Math.max(1,CUR_YEAR-y+1);
  return (v>=10?v.toFixed(0):v.toFixed(1))+'/yr';
}

function normOA(w){
  var doi = w.doi ? String(w.doi).replace(/^https?:\/\/doi\.org\//,'') : '';
  return {
    src:'oa',
    nativeId:(w.id||'').replace(/^https?:\/\/openalex\.org\//,''),
    title:w.display_name||'Untitled',
    authors:(w.authorships||[]).map(function(a){return a.author&&a.author.display_name;}).filter(Boolean),
    year:w.publication_year||'',
    venue:(w.primary_location&&w.primary_location.source&&w.primary_location.source.display_name)||'',
    citations:w.cited_by_count||0,
    abstract:deinvert(w.abstract_inverted_index),
    tldr:'',
    doi:doi,
    pdf:(w.best_oa_location&&w.best_oa_location.pdf_url)||(w.open_access&&w.open_access.oa_url)||'',
    link:w.doi||(w.open_access&&w.open_access.oa_url)||w.id||''
  };
}
function normS2(p){
  var doi=(p.externalIds&&p.externalIds.DOI)||'';
  return {
    src:'s2',
    nativeId:p.paperId||'',
    title:p.title||'Untitled',
    authors:(p.authors||[]).map(function(a){return a.name;}).filter(Boolean),
    year:p.year||'',
    venue:p.venue||'',
    citations:p.citationCount||0,
    abstract:p.abstract||'',
    tldr:(p.tldr&&p.tldr.text)||'',
    doi:doi,
    pdf:(p.openAccessPdf&&p.openAccessPdf.url)||'',
    link:p.url||(doi?'https://doi.org/'+doi:'')
  };
}

function fetchJSON(url){
  return fetch(url).then(function(r){
    if(!r.ok){ var e=new Error('HTTP '+r.status); e.status=r.status; throw e; }
    return r.json();
  });
}
