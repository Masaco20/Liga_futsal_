/* Buscador público sencillo: equipos y partidos */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('form.inline-form').forEach(function(form){
      const input=form.querySelector('input[name="query"]');
      if(!input) return;
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const q=(input.value||'').trim();
        if(q) window.location.href='buscar.html?q='+encodeURIComponent(q);
      });
    });
  });
})();
