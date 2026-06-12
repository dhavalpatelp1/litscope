/* ── Wire-up ─────────────────────────────── */
$('go').addEventListener('click',runSearch);
$('q').addEventListener('keydown',function(e){if(e.key==='Enter')runSearch();});
$('sort').addEventListener('change',function(){
  if(!papers.length) return;
  meta.sort=this.value;
  applySort(this.value);
  render($('backBtn').hidden?null:$('summary').textContent);
});
$('backBtn').addEventListener('click',function(){
  if(!prevView) return;
  papers=prevView.papers;
  var s=prevView.summary;
  prevView=null;
  $('backBtn').hidden=true;
  render(s);
  setStatus('');
});
$('tabSearch').addEventListener('click',function(){showView('search');});
$('tabLibrary').addEventListener('click',function(){showView('library');});

$('csvBtn').addEventListener('click',function(){download('papers-'+slug(meta.query)+'.csv',toCSV(papers,false),'text/csv');});
$('bibBtn').addEventListener('click',function(){download('papers-'+slug(meta.query)+'.bib',toBib(papers),'application/x-bibtex');});
$('risBtn').addEventListener('click',function(){download('papers-'+slug(meta.query)+'.ris',toRIS(papers),'application/x-research-info-systems');});
$('copyBtn').addEventListener('click',function(){
  var btn=this;
  navigator.clipboard.writeText(toText(papers)).then(function(){flash(btn,'Copied');})
    .catch(function(){setStatus('Copy failed — your browser blocked clipboard access.',true);});
});

$('libCsvBtn').addEventListener('click',function(){download('library.csv',toCSV(libEntries(),true),'text/csv');});
$('libBibBtn').addEventListener('click',function(){download('library.bib',toBib(libEntries()),'application/x-bibtex');});
$('libRisBtn').addEventListener('click',function(){download('library.ris',toRIS(libEntries()),'application/x-research-info-systems');});
$('backupBtn').addEventListener('click',function(){
  download('litscope-library-backup.json',
    JSON.stringify({version:1,exported:new Date().toISOString(),items:libEntries()},null,2),
    'application/json');
});
$('importBtn').addEventListener('click',function(){$('importFile').click();});
$('importFile').addEventListener('change',function(){
  var file=this.files&&this.files[0];
  this.value='';
  if(!file) return;
  var reader=new FileReader();
  reader.onload=function(){
    try{
      var data=JSON.parse(reader.result);
      var items=Array.isArray(data)?data:(data.items||[]);
      var n=0;
      items.forEach(function(it){
        if(!it||!it.title) return;
        var id=it.id||paperId(it);
        lib[id]=Object.assign({status:'toread',note:'',added:Date.now()},it,{id:id});
        n++;
      });
      persistLib(); updateLibCount(); renderLib();
      $('libStatus').textContent='Imported '+n+' paper'+(n===1?'':'s')+'.';
      $('libStatus').className='status';
    }catch(e){
      $('libStatus').textContent='That file could not be read — it needs to be a backup made with the Backup button.';
      $('libStatus').className='status error';
    }
  };
  reader.readAsText(file);
});

store.get('library').then(function(v){
  if(v&&typeof v==='object'){lib=v; updateLibCount();}
});
store.get('recent').then(function(v){
  if(Array.isArray(v)){recents=v; renderRecents();}
});
