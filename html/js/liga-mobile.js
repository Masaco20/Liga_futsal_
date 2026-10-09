/* Liga Futsal - navegación móvil estable 2026 */
(function(){
  function init(){
    var trigger=document.querySelector('.mobile-nav-trigger');
    var searchTrigger=document.querySelector('.mobile-search-trigger');
    var nav=document.querySelector('.main-nav-wrap');
    var search=document.querySelector('.mobile-search');
    var navbar=document.querySelector('.menu-area .navbar');
    if(trigger && nav){
      trigger.setAttribute('aria-expanded','false');
      trigger.addEventListener('click',function(e){
        e.preventDefault();
        var open=nav.classList.toggle('liga-mobile-open');
        trigger.setAttribute('aria-expanded',open?'true':'false');
      });
      nav.querySelectorAll('a').forEach(function(a){
        a.addEventListener('click',function(e){
          var parent=a.parentElement;
          if(parent && parent.classList.contains('liga-has-dropdown') && window.innerWidth<=767){
            e.preventDefault();
            parent.classList.toggle('is-open');
          }
        });
      });
    }
    // El buscador ya tiene su propio controlador en main.js cuando esa plantilla lo carga.
    // En las páginas que no lo cargan, lo manejamos aquí; se evita el doble toggle.
    if(searchTrigger && search){
      searchTrigger.addEventListener('click',function(e){
        e.preventDefault();
        var open=search.classList.toggle('is-visible');
        if(navbar) navbar.classList.toggle('liga-search-open',open);
      });
    }
    document.addEventListener('click',function(e){
      if(!nav || !trigger) return;
      if(window.innerWidth<=767 && nav.classList.contains('liga-mobile-open')){
        if(!nav.contains(e.target) && !trigger.contains(e.target)){
          nav.classList.remove('liga-mobile-open');
          trigger.setAttribute('aria-expanded','false');
          if(navbar) navbar.classList.remove('liga-search-open');
        }
      }
    });
    window.addEventListener('resize',function(){
      if(window.innerWidth>767 && nav){
        nav.classList.remove('liga-mobile-open');
        nav.querySelectorAll('.liga-has-dropdown.is-open').forEach(function(x){x.classList.remove('is-open');});
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
