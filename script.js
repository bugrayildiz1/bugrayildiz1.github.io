// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu
const burger = document.querySelector('.hamburger');
const menu = document.querySelector('.menu');
burger.addEventListener('click', () => menu.classList.toggle('open'));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

// Smooth scroll for same-page anchors
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href');
    if(id.length > 1){
      e.preventDefault();
      document.querySelector(id).scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
});

// Intersection Observer for slide-in elements
const animated = document.querySelectorAll('.reveal, .slide-up, .slide-left, .slide-right');
const obs = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('show');
      obs.unobserve(entry.target);
    }
  });
},{threshold:0.18});
animated.forEach(el=>obs.observe(el));

// Cookie bar
const cookieBar = document.getElementById('cookieBar');
const cookieOk = document.getElementById('cookieOk');
if(localStorage.getItem('ak-consent')==='1'){ cookieBar.style.display='none'; }
cookieOk.addEventListener('click', ()=>{
  localStorage.setItem('ak-consent','1');
  cookieBar.style.display='none';
});

// ------- Hero slider -------
const slider = document.querySelector('.slider');
const slides = Array.from(slider.querySelectorAll('.slide'));
const leftBtn = slider.querySelector('.arrow.left');
const rightBtn = slider.querySelector('.arrow.right');
const dotsWrap = slider.querySelector('.dots');
let idx = 0, timer, interval = Number(slider.dataset.interval) || 5000;

// build dots
slides.forEach((_, i)=>{
  const b = document.createElement('button');
  b.addEventListener('click', ()=>go(i));
  dotsWrap.appendChild(b);
});
function setActiveDot(){
  dotsWrap.querySelectorAll('button').forEach((d,i)=>d.classList.toggle('active', i===idx));
}
function go(i){
  idx = (i+slides.length)%slides.length;
  slides.forEach((s,si)=>{
    s.style.transform = `translateX(${100*(si-idx)}%)`;
  });
  setActiveDot();
}
slides.forEach((s,i)=>{ s.style.transform = `translateX(${100*i}%)`; });

function next(){ go(idx+1); }
function prev(){ go(idx-1); }
rightBtn.addEventListener('click', next);
leftBtn.addEventListener('click', prev);

function startAuto(){
  if(slider.dataset.autoplay === 'true'){
    stopAuto();
    timer = setInterval(next, interval);
  }
}
function stopAuto(){ if(timer) clearInterval(timer); }
slider.addEventListener('mouseenter', stopAuto);
slider.addEventListener('mouseleave', startAuto);

go(0);
startAuto();
