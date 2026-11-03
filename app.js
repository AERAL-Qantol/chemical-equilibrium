'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const colors = ['#e8a76d','#a6c8fc','#bfdfa0'];
const pathColors = ['#e8a76d','#a6c8fc','#c2a3e8','#efd581','#bfdfa0'];
const initialStates = [[2.997,.001,.001/3],[.001,1.499,.001/3],[.001,.22,2.559/3],[1,.5,1/3],[.3,.3,.7]];
function field([a,b,c]){const j1=2*a*b-c,j2=a*a-.5*b;return[-j1-2*j2,-j1+j2,j1];}
function energy(x){return x.reduce((sum,v)=>{const z=2*v-1;return sum+.5*(Math.abs(z)<.001 ? z*z/2-z*z*z/6+z**4/12-z**5/20+z**6/30 : (1+z)*Math.log1p(z)-z);},0);}
function dissipation(x){return field(x).reduce((s,v,i)=>s+Math.log(x[i]/.5)*v,0);}
function simulate(start){
 const data=[{t:0,x:[...start],v:energy(start)}];let x=[...start];const h=.002;
 for(let n=1;n<=4000;n++){
  const k1=field(x),k2=field(x.map((v,i)=>v+h*k1[i]/2)),k3=field(x.map((v,i)=>v+h*k2[i]/2)),k4=field(x.map((v,i)=>v+h*k3[i]));
  x=x.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
  if(n%5===0)data.push({t:n*h,x:[...x],v:energy(x)});
 }
 return data;
}
const paperRuns=initialStates.map(simulate);
let selected=4, weights=[.3,.6,2.1],run=paperRuns[4],timeIndex=0,playing=false,chartMode='concentration',frame=null,lastTime=0,playIndex=0;
function math(root=document){root.querySelectorAll('[data-tex]').forEach(el=>{if(window.katex){katex.render(el.dataset.tex,el,{throwOnError:false,displayMode:true,strict:'ignore'});}else{el.textContent=el.dataset.tex;}});}
function svgText(x,y,label,extra=''){return `<text x="${x}" y="${y}" font-family="Segoe UI,Microsoft YaHei,sans-serif" fill="#a5bda2" font-size="11" ${extra}>${label}</text>`;}
function path(data,fx,fy){return data.map((p,i)=>(i?'L':'M')+fx(p).toFixed(2)+','+fy(p).toFixed(2)).join(' ');}
const px=a=>56+a/3*450,py=b=>298-b/1.5*255;
function star(cx,cy,r=8){return Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.43:r;return `${cx+Math.cos(a)*rr},${cy+Math.sin(a)*rr}`;}).join(' ');}
function drawPhase(){
 let s=`<title>守恒约束下的反应轨迹</title><desc>横轴 A 浓度，纵轴 B 浓度。可行区域是三角形。平衡点为 A=B=C=0.5。</desc>`;
 for(let a=0;a<=3.01;a+=.5){s+=`<path d="M${px(a)} 43 V298" stroke="#3c5645" stroke-width=".6" opacity=".7"/>`+svgText(px(a),319,a.toFixed(1),'text-anchor="middle"');}
 for(let b=0;b<=1.501;b+=.3){s+=`<path d="M56 ${py(b)} H506" stroke="#3c5645" stroke-width=".6" opacity=".7"/>`+svgText(45,py(b)+4,b.toFixed(1),'text-anchor="end"');}
 s+=`<path d="M56 43 V298 H506 Z" fill="#33523a" fill-opacity=".28" stroke="#779565" stroke-width="1" stroke-dasharray="4 5"/>`;
 s+=svgText(282,345,'A 浓度 xₐ','text-anchor="middle"')+svgText(14,37,'B 浓度 xᵦ');
 s+=svgText(349,72,'三角形内：A、B、C 都为正','font-size="10"');
 if($('#all-paths').checked){paperRuns.forEach((d,i)=>{s+=`<path d="${path(d,p=>px(p.x[0]),p=>py(p.x[1]))}" fill="none" stroke="${pathColors[i]}" stroke-width="1.5" opacity=".5"/><circle cx="${px(d[0].x[0])}" cy="${py(d[0].x[1])}" r="3" fill="${pathColors[i]}"/>`;});}
 const current=run[timeIndex],tail=run.slice(timeIndex);
 s+=`<path d="${path(tail,p=>px(p.x[0]),p=>py(p.x[1]))}" stroke="#e5f8cb" stroke-width="1.7" stroke-dasharray="4 5" fill="none" opacity=".4"/>`;
 s+=`<path d="${path(run.slice(0,timeIndex+1),p=>px(p.x[0]),p=>py(p.x[1]))}" stroke="#d6f5af" stroke-width="2.8" fill="none"/>`;
 s+=`<circle cx="${px(run[0].x[0])}" cy="${py(run[0].x[1])}" r="4" fill="#102822" stroke="#d6f5af" stroke-width="2"/>`;
 s+=`<circle cx="${px(current.x[0])}" cy="${py(current.x[1])}" r="12" fill="#d6f5af" opacity=".1"/><circle cx="${px(current.x[0])}" cy="${py(current.x[1])}" r="5" fill="#e3ffbd"/>`;
 s+=`<polygon points="${star(px(.5),py(.5))}" fill="#f6fbe9" stroke="#153229" stroke-width="1"/>`;
 s+=svgText(px(.5)+14,py(.5)-13,'平衡 (½, ½, ½)','fill="#e0f4c8" font-size="10"');
 $('#phase').innerHTML=s;
}
function drawTime(){
 const left=chartMode==='entropy'?56:43,right=382,top=28,bottom=261,tx=t=>left+t/8*(right-left);
 let s='<title>随时间的演化</title>';
 for(let t=0;t<=8;t+=2){s+=`<path d="M${tx(t)} ${top}V${bottom}" stroke="#3c5645" stroke-width=".6"/>`+svgText(tx(t),281,t,'text-anchor="middle"');}
 let ty;
 if(chartMode==='concentration'){
  const max=Math.max(.65,...run.map(p=>Math.max(...p.x)))*1.06;ty=v=>bottom-v/max*(bottom-top);
  for(let i=0;i<=4;i++){const v=max*i/4;s+=`<path d="M${left} ${ty(v)}H${right}" stroke="#3c5645" stroke-width=".6"/>`+svgText(left-8,ty(v)+4,v.toFixed(1),'text-anchor="end"');}
  s+=`<path d="M${left} ${ty(.5)}H${right}" stroke="#c6d6b1" opacity=".4" stroke-dasharray="3 4"/>`;
  for(let i=0;i<3;i++){
   s+=`<path d="${path(run,p=>tx(p.t),p=>ty(p.x[i]))}" fill="none" stroke="${colors[i]}" stroke-width="1.5" opacity=".32"/>`;
   s+=`<path d="${path(run.slice(0,timeIndex+1),p=>tx(p.t),p=>ty(p.x[i]))}" fill="none" stroke="${colors[i]}" stroke-width="2"/>`;
   s+=`<circle cx="${tx(run[timeIndex].t)}" cy="${ty(run[timeIndex].x[i])}" r="3" fill="${colors[i]}"/>`;
   s+=svgText(left+10+i*48,14,['A','B','C'][i],`style="fill:${colors[i]}"`);
  }
  $('#chart-caption').textContent='实线：当前演化进度 · 三种浓度都趋近 0.5';
 }else{
  const hi=Math.max(1,Math.ceil(Math.log10(run[0].v||1)));ty=v=>top+(hi-Math.log10(Math.max(1e-12,v)))/(hi+12)*(bottom-top);
  for(let k=0;k>=-12;k-=3){const y=ty(10**k);s+=`<path d="M${left} ${y}H${right}" stroke="#3c5645" stroke-width=".6"/>`+svgText(left-8,y+4,`10<tspan baseline-shift="super" font-size="8">${k}</tspan>`,'text-anchor="end"');}
  if($('#all-paths').checked)paperRuns.forEach((d,i)=>{s+=`<path d="${path(d.filter(p=>p.v>=1e-12),p=>tx(p.t),p=>ty(p.v))}" fill="none" stroke="${pathColors[i]}" stroke-width="1.2" opacity=".4"/>`;});
  s+=`<path d="${path(run.filter(p=>p.v>=1e-12),p=>tx(p.t),p=>ty(p.v))}" fill="none" stroke="#d6f5af" opacity=".25" stroke-width="2"/>`;
  s+=`<path d="${path(run.slice(0,timeIndex+1).filter(p=>p.v>=1e-12),p=>tx(p.t),p=>ty(p.v))}" fill="none" stroke="#d6f5af" stroke-width="2.2"/>`;
  if(run[timeIndex].v>=1e-12)s+=`<circle cx="${tx(run[timeIndex].t)}" cy="${ty(run[timeIndex].v)}" r="3" fill="#d6f5af"/>`;
  s+=svgText(left,14,'相对自由能 V（对数纵轴）','font-size="10"');
  $('#chart-caption').textContent='越低越接近平衡；低于 10⁻¹² 的部分不再绘出';
 }
 const now=tx(run[timeIndex].t);s+=`<path d="M${now} ${top}V${bottom}" stroke="#d7ebc3" stroke-dasharray="3 4" opacity=".55"/>`+svgText((left+right)/2,306,'时间 t','text-anchor="middle"');
 $('#time-chart').innerHTML=s;
}
function readouts(){
 const p=run[timeIndex];
 $('#readouts').innerHTML=p.x.map((v,i)=>`<div class="readout"><label style="color:${colors[i]}">物种 ${['A','B','C'][i]}</label><strong>${v.toFixed(4)}</strong><small>平衡值 0.5000</small></div>`).join('')+`<div class="readout"><label>相对自由能 V</label><strong>${p.v<.0001?p.v.toExponential(1):p.v.toFixed(4)}</strong><small>下界 0</small></div>`;
 const distance=Math.max(...p.x.map(v=>Math.abs(v-.5)));
 $('#insight').innerHTML=timeIndex===0?'现在改变的是起点，不变的是守恒约束。拖动时间轴，或播放反应演化。':distance<.0001?'三种浓度已在数值上非常接近 0.5。正逆反应仍在发生，但净通量接近零。':`当前守恒总量为 ${(p.x[0]+2*p.x[1]+3*p.x[2]).toFixed(6)}，最大浓度偏差为 ${distance.toFixed(4)}。浓度不必各自单调；单调下降的是 V。`;
 $('#time-value').textContent=`t = ${p.t.toFixed(2)}`;$('#time').value=timeIndex;
}
function renderLab(){drawPhase();drawTime();readouts();}
function stop(){playing=false;cancelAnimationFrame(frame);$('#play').textContent=timeIndex===800?'↺ 重新播放':'▶ 播放演化';}
function tick(ts){if(!playing)return;if(!lastTime)lastTime=ts;playIndex+=Math.min(ts-lastTime,80)*.1;lastTime=ts;timeIndex=Math.min(800,Math.floor(playIndex));renderLab();if(timeIndex===800){stop();return;}frame=requestAnimationFrame(tick);}
function setInitial(x,preset=-1){stop();selected=preset;run=preset>=0?paperRuns[preset]:simulate(x);timeIndex=0;weights=[x[0],2*x[1],3*x[2]];$$('#sliders input').forEach((el,i)=>el.value=weights[i]);$$('#presets button').forEach((b,i)=>b.classList.toggle('active',i===preset));updateInitial();renderLab();}
function updateInitial(){const x=run[0].x;$('#initial-values').textContent=`初始浓度：A ${x[0].toFixed(4)} · B ${x[1].toFixed(4)} · C ${x[2].toFixed(4)}`;$$('.slider-label output').forEach((el,i)=>el.textContent=(x[i]*[1,2,3][i]/3*100).toFixed(1)+'%');}
$('#sliders').innerHTML=['A','B','C'].map((n,i)=>`<div><label class="slider-label" for="weight-${i}"><span style="color:${colors[i]}">${n} 份额</span><output></output></label><input id="weight-${i}" type="range" min="0.001" max="3" step="0.001" value="${weights[i]}" aria-label="物种 ${n} 初始总量份额" style="accent-color:${colors[i]}"></div>`).join('');
$$('#sliders input').forEach((el,i)=>el.addEventListener('input',()=>{const w=$$('#sliders input').map(e=>+e.value),total=w.reduce((a,b)=>a+b);setInitial(w.map((v,j)=>3*v/total/[1,2,3][j]));}));
$$('#presets button').forEach((b,i)=>b.addEventListener('click',()=>setInitial(initialStates[i],i)));
$('#play').addEventListener('click',()=>{if(playing){stop();return;}if(timeIndex===800)timeIndex=0;playing=true;playIndex=timeIndex;lastTime=0;$('#play').textContent='Ⅱ 暂停演化';frame=requestAnimationFrame(tick);});
$('#reset').addEventListener('click',()=>{stop();timeIndex=0;renderLab();});$('#step-start').addEventListener('click',()=>$('#reset').click());
$('#time').addEventListener('input',e=>{stop();timeIndex=+e.target.value;renderLab();});
$('#all-paths').addEventListener('change',renderLab);
$$('[data-chart]').forEach(b=>b.addEventListener('click',()=>{chartMode=b.dataset.chart;$$('[data-chart]').forEach(el=>el.setAttribute('aria-selected',String(el===b)));drawTime();}));
$('#phase').addEventListener('click',e=>{
 const svg=$('#phase'),point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
 const a=(point.x-56)/450*3,b=(298-point.y)/255*1.5,c=(3-a-2*b)/3;
 if(a<0||b<0||c<0)return;
 const raw=[Math.max(a,.001),Math.max(2*b,.001),Math.max(3*c,.001)],sum=raw.reduce((u,v)=>u+v);setInitial(raw.map((v,i)=>3*v/sum/[1,2,3][i]));
});
const reactionDetails={
 r1:{title:'A 与 B 结合，C 也会解离',formula:String.raw`J_1=\underbrace{2ab}_{\text{正向速率}}-\underbrace{c}_{\text{逆向速率}}`,ode:String.raw`(\dot a,\dot b,\dot c)=J_1(-1,-1,+1)`,body:'正向一次消耗 1 个 A、1 个 B，生成 1 个 C；反向则完全相反。净通量 J₁ 决定当前向哪边反应。'},
 r2:{title:'两个 A 转换为一个 B',formula:String.raw`J_2=\underbrace{a^2}_{\text{正向速率}}-\underbrace{\tfrac12 b}_{\text{逆向速率}}`,ode:String.raw`(\dot a,\dot b,\dot c)=J_2(-2,+1,0)`,body:'正向一次消耗 2 个 A，生成 1 个 B；C 不参与这一对反应。B 的净生成速率为 J₂，A 的净消耗速率为 2J₂。'},
 both:{title:'两条反应的影响，逐项相加',formula:String.raw`J_1=2ab-c,\qquad J_2=a^2-\tfrac12 b`,ode:String.raw`\begin{aligned}\dot a&=-J_1-2J_2\\\dot b&=-J_1+J_2\\\dot c&=J_1\end{aligned}`,body:'这就是实验台实际求解的三个微分方程。令两条净通量同时为零，再加上守恒关系，就能算出平衡浓度。'}
};
function reactionSelect(key){const r=reactionDetails[key];$('#reaction-detail').innerHTML=`<h3>${r.title}</h3><div class="mathline" data-tex="${r.formula}"></div><div class="mathline" data-tex="${r.ode}"></div><p>${r.body}</p>`;math($('#reaction-detail'));}
$$('[data-reaction]').forEach(b=>b.addEventListener('click',()=>{$$('[data-reaction]').forEach(el=>el.classList.toggle('active',el===b));reactionSelect(b.dataset.reaction);}));
const proofData=[
 {tag:'STEP 1 · 原文 §3.1 / 定理 3.1',title:'先确保：没有任何物种逐渐消失。',tex:String.raw`e^{-L}\leq x_i(t)\leq e^L\qquad (t\geq0)`,text:'用有限个仿射函数的最小值构造屏障 F。轨迹被关在一个位于正浓度区域内部的紧致多面体里：既不能跑向无穷远，也不能接近浓度为零的边界。L 可以依赖网络、速率常数和初始状态，不是对所有起点统一的常数。',extra:'这部分适用于更广的弱可逆系统，来自论文引用并改编的上游工作。下面只是二维截面的概念示意，不是例子网络的实际屏障计算。',svg:'<path d="M35 106H535 M50 112V10" stroke="#9aa88b" fill="none"/><path d="M85 86L110 30L360 18L485 65L410 94Z" fill="#e9f0dd" stroke="#8ca16e" stroke-width="1.5"/><path d="M135 72Q240 6 337 62T421 52" stroke="#48704e" stroke-width="2" fill="none"/><circle cx="135" cy="72" r="4" fill="#48704e"/><text x="203" y="110" font-size="10" fill="#798b68">围栏与零浓度边界保持距离</text>'},
 {tag:'STEP 2 · 原文 §3.2.1 / 式 (3.7)–(3.8)',title:'有一个指标，沿反应只能下降。',tex:String.raw`V(x)=\sum_i\left[x_i\ln\frac{x_i}{x_i^*}-x_i+x_i^*\right]\geq0`,text:'V 是类似相对自由能的 Lyapunov 函数，不是“物理熵只能下降”的一般声明。细致平衡保证 dV/dt ≤ 0。单个物种的浓度可以先升后降，整体 V 却不会上升。',extra:'原文中的 x* 是一个细致平衡参考态，不一定属于给定初始状态的相容类。本实验采用 (½,½,½)，它恰好就是当前类的最终平衡，所以 V 的极限为零。',svg:'<path d="M35 105H535 M50 112V10" stroke="#9aa88b" fill="none"/><path d="M65 20C160 20 130 68 260 73S350 96 510 98" stroke="#6a8b45" stroke-width="2.5" fill="none"/><text x="310" y="34" font-size="12" fill="#6b8157">dV/dt ≤ 0</text><text x="456" y="119" font-size="10" fill="#798b68">时间 →</text>'},
 {tag:'STEP 3 · 原文 §3.2.2–3.2.3',title:'同一相容类里，不会有两个正平衡。',tex:String.raw`\{x>0:f(x)=0\}=\{x^*\!\odot e^u:u\in S^\perp\}`,text:'所有正平衡可以写成一个指数族。若两个正平衡 a、b 属于同一相容类，则 a−b 属于反应空间 S，而它们的对数差属于 S 的正交补。二者内积必须为零，但对数的严格单调性又保证每项非负，仅当 a=b 时全为零。',extra:'“唯一”限定在一个相容类内。改变守恒总量，平衡点通常也会改变；它不是所有化学配比共用的唯一浓度。',svg:'<path d="M45 101L510 30 M65 120L530 49" stroke="#b1bca5" fill="none"/><path d="M120 4Q110 90 415 117" stroke="#6f8b4f" stroke-width="2" fill="none"/><circle cx="187" cy="79" r="5" fill="#32573e"/><circle cx="230" cy="94" r="5" fill="#8ca467"/><text x="310" y="27" font-size="10" fill="#6b8157">不同相容类可以有不同终点</text>'},
 {tag:'STEP 4 · 原文 §3.2.4 / 引理 3.20',title:'不能永远路过“非平衡点”。',tex:String.raw`D(z)<-\eta\quad\Longrightarrow\quad V(x(t+\delta))\leq V(x(t))-\eta\delta`,text:'假设轨迹长期反复接近一个非平衡点。由于自由能在附近有严格负的下降速率，而轨迹速度有上限，它不能瞬间穿过：每次都要消耗一段确定的自由能。这与 V 已经接近其下确界矛盾。',extra:'所以所有长期聚集点都必须是正平衡。再结合紧致性与同一相容类中平衡唯一，就得到整条轨迹收敛。论文用这一有界速度论证替代 LaSalle 不变性原理。',svg:'<path d="M30 104H535" stroke="#a4b394"/><rect x="215" y="10" width="120" height="79" rx="12" fill="#e5edd9"/><path d="M60 60Q170 95 240 50T510 60" stroke="#658648" stroke-width="2" fill="none"/><circle cx="272" cy="39" r="5" fill="#34553a"/><text x="231" y="82" font-size="10" fill="#6b8157">非平衡区域</text><text x="190" y="120" font-size="10" fill="#6b8157">速度有界 → 停留时间不能无限短</text>'}
];
function renderProof(i){const p=proofData[i];$('#proof-panel').innerHTML=`<div class="tag">${p.tag}</div><h3>${p.title}</h3><div data-tex="${p.tex}"></div><p>${p.text}</p><svg viewBox="0 0 560 130" role="img" aria-label="${p.title}的概念示意">${p.svg}</svg><p>${p.extra}</p>`;math($('#proof-panel'));}
$$('[data-proof]').forEach(b=>b.addEventListener('click',()=>{$$('[data-proof]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-selected',String(el===b));});renderProof(+b.dataset.proof);}));
const formulas=[
 ['(2.1)','model','质量作用方程',String.raw`\dot x=f(x)=\sum_{y\to y'}\kappa_{y\to y'}x^y(y'-y)`,'反应速率 × 一次反应的浓度变化，再对所有反应求和。','第 2 页。xʸ = ∏ᵢ xᵢʸⁱ 是质量作用单项式。y、y′ 是反应物与产物的计量向量；它们不是浓度。'],
 ['(2.2)','model','细致平衡条件',String.raw`\kappa_e(x^*)^{s(e)}=\kappa_{\bar e}(x^*)^{t(e)}=:K_e`,'在某个正参考态，每一对正逆反应的速率分别相等。','第 3 页。ē 表示反向反应。两边的速率常数一般不同。可逆并不自动保证给定常数满足细致平衡；原文备注 2.4 给出 Wegscheider 条件。'],
 ['(2.3)','barrier','对数坐标中的单项式比值',String.raw`\frac{(h^p)^z}{(h^p)^y}=h^{p\cdot(z-y)}`,'把复杂的浓度乘积，转换成指数中的线性比较。','第 3 页。0<h<1，hᵖ 表示逐坐标取幂。当 p·(z−y) 为正且有固定间隔时，分子相对分母会很小。这是判别主导反应的基础。'],
 ['(3.1)','barrier','对数围栏：既不爆炸，也不消失',String.raw`|\ln x_i(t)|\leq L\quad(t\geq0)`, '等价于 e⁻ᴸ ≤ xᵢ(t) ≤ eᴸ，每一种浓度都有正下界和有限上界。','第 4 页，定理 3.1。L 依赖网络、常数和初值，对这个初值的所有全局正向解统一适用。正性在 Lean 中单独证明，不能只凭其 log 约定判断。'],
 ['(3.2)','barrier','把尺度 h 选得足够小',String.raw`\left|\frac{\ln x_{0,i}}{\ln h}\right|<H,\qquad h^H\kappa_{\rm tot}<\kappa_e`,'同时把初值放入合适的坐标位置，并保证主导通量压过其他通量。','第 6 页。κtot 是所有反应常数之和。先固定仿射方向和正间隔 H，再选 h；避免“常数也随着 h 改变”的循环论证。'],
 ['(3.3)','barrier','方向近似必须保住正负号',String.raw`\operatorname{sign}(p\cdot v)=\operatorname{sign}(r_j\cdot v),\qquad |p\cdot v|>\tfrac12|r_j\cdot v|\geq H`,'屏障面的方向虽然只是近似，但必须正确判断哪些反应朝内、哪些朝外。','第 7 页。适用于 rⱼ·v≠0 的 v。p 是真实的对数坐标方向，rⱼ 是当前活跃仿射分支的方向。符号容差引理确保近似不破坏排序。'],
 ['(3.4)','barrier','局部截距衰减得足够快',String.raw`c(h)=o\!\left(h^{t+\rho_t}\right)`,'拼接局部屏障前，要求截距相对于指定幂次可以忽略。','第 11 页。这是构造仿射近似的技术步骤；此处 t 是最小指数的层级参数，不是反应时间。小 o 表示二者之比趋零。'],
 ['(3.5)','barrier','让相邻局部区域接得上',String.raw`\begin{gathered}t_j<q_j<t_{j+1}\\{}[q_{j-1},q_j]\subset I_{t_j}\end{gathered}`,'选择落在重叠部分的切点，确保整个区间都被局部构造覆盖。','第 12 页。第一行适用于 1≤j<N，第二行适用于 1≤j≤N。q₀=a，qN=b。不同局部标签族通过相邻区间连接为一个有限族。'],
 ['(3.6)','barrier','平移截距，选出正确的局部族',String.raw`\widetilde c(h)=c(h)-\sum_{\ell=1}^{j-1}h^{q_\ell}`,'同一局部族整体平移，不改变内部比较，却能决定族与族之间谁占优。','第 12 页。这些偏移量让合并后的活跃标签来自恰当的邻域。j=1 时求和为空。它服务于屏障存在性证明，不是新的化学反应规律。'],
 ['(3.7)','energy','相对自由能与下降速率',String.raw`\begin{aligned}V(x)&=\sum_i\left[x_i\ln\frac{x_i}{x_i^*}-x_i+x_i^*\right]\\D(x)&=\sum_i\ln\frac{x_i}{x_i^*}\,f_i(x)=\frac{dV}{dt}\end{aligned}`,'V 衡量偏离参考态的程度；D 告诉我们 V 此刻如何变化。','第 14 页。V≥0。参考态 x* 不一定是给定相容类中的平衡，因此一般只能说 V 收敛到该类的最小值，不能一概说极限为 0。'],
 ['(3.8)','energy','耗散恒等式',String.raw`2D(x)=\sum_{e\in R}K_e(L_{t(e)}-L_{s(e)})(e^{L_{s(e)}}-e^{L_{t(e)}})\leq0`,'因为指数严格递增，每一项都是“相反符号的两数相乘”，所以不大于零。','第 14 页。Lᵧ=ln[xʸ/(x*)ʸ]，不是式 (3.1) 的常数 L。系数 2 来自有向反应集里正逆方向各记一次。等号要求每条反应的对数间隔都为零。'],
 ['关键定义','model','化学计量相容类',String.raw`S=\operatorname{span}\{y'-y\},\qquad (x_0+S)\cap\mathbb R_{>0}^d`,'反应只能沿反应向量移动，所以轨迹始终留在这个允许的状态集合里。','第 3 页、引理 3.14（第 13 页）。本例 S 的正交补由 (1,2,3) 张成，因而相容类由 a+2b+3c=常数刻画。'],
 ['关键构造','barrier','有限最小屏障与平台',String.raw`\begin{gathered}F(x)=\min_j(r_j\cdot x+c_j)\\P=\{x:F(x)=M\}\subset\operatorname{int}B_h\end{gathered}`,'用有限个平面拼成屏障，把初值关在一个不会接触零浓度边界的区域。','第 4、7–9 页。存在常数分支 ℓⱼ₀≡M，使 F≤M。证明 F 沿轨迹非减，初值又满足 F=M，因此轨迹只能一直停留在平台 P。'],
 ['引理 3.18','energy','所有正平衡的指数参数化',String.raw`\{x>0:f(x)=0\}=\{x>0:D(x)=0\}=x^*\!\odot\exp(S^\perp)`,'停止耗散与处于正平衡等价；所有正平衡构成一个指数族。','第 14–15 页。⊙ 表示逐坐标相乘。S⊥ 是所有与反应向量正交的方向。它描述多个相容类中的所有正平衡，而非只描述实验中的一个点。'],
 ['引理 3.19','energy','同一相容类的唯一性',String.raw`0=(\ln a-\ln b)\cdot(a-b)=\sum_i(\ln a_i-\ln b_i)(a_i-b_i)`,'每一项都非负，和为零只能是每一项都为零，于是 a=b。','第 15 页。a、b 在此是两个正平衡向量，不是实验台中 A、B 的标量浓度。向量差属于 S、对数差属于 S⊥，所以内积为零。'],
 ['引理 3.20','energy','有界速度带来确定的下降量',String.raw`\delta=\frac r{2B},\qquad V(x(t+\delta))\leq V(x(t))-\eta\delta`,'轨迹速度不超过 B，就不能无限快地穿过一个严格耗散区域。','第 15 页。若某个聚集点 z 满足 D(z)<0，连续性给出邻域中 D<−η；每次进入内半径后至少能停留 δ。这与 V 接近下确界矛盾。'],
 ['§5.1','model','实验台实际求解的方程',String.raw`\begin{aligned}\dot a&=-(2ab-c)-2(a^2-\tfrac12 b)\\\dot b&=-(2ab-c)+(a^2-\tfrac12 b)\\\dot c&=2ab-c\end{aligned}`,'每一条曲线，都是从这三个微分方程算出来的。','第 19 页的网络与常数代入式 (2.1) 所得。总量 a+2b+3c=3，平衡为 (½,½,½)。改变常数或总量后，这个平衡数值通常随之改变。'],
 ['§5.2','energy','为什么只靠耗散还不够',String.raw`2A\rightleftharpoons A+B:\quad \dot a=a[\kappa_2T-(\kappa_1+\kappa_2)a]`,'即使有细致平衡，边界上也可能存在平衡点 (0,T)。','第 20 页，例 5.1。a+b=T。靠近 a=0 时 D=O(a|ln a|)→0，所以“下降速率趋零”不能独自判断接近的是正平衡还是边界平衡。'],
 ['§5.4 · 未形式化','energy','复合平衡中的熵不等式',String.raw`D(x)\leq\sum_e\kappa_e(x^*)^{s(e)}(w_{t(e)}-w_{s(e)})=0`,'复合平衡用每个复合物的总流量平衡，替代每一对反应分别平衡。','第 20–21 页。wᵧ=xʸ/(x*)ʸ，关键标量不等式为 w ln(w′/w)≤w′−w。作者说明可结合持久性和聚集点论证得到扩展，但该节不在报告的 Lean 形式化范围内。']
];
let filter='all';
function renderFormulas(){const query=$('#formula-search').value.trim().toLowerCase();let count=0;$('#formula-cards').innerHTML=formulas.filter(f=>(filter==='all'||f[1]===filter)&&f.join(' ').toLowerCase().includes(query)).map(f=>{count++;return `<article class="formula-card"><div class="card-top"><span>${{model:'反应模型',barrier:'几何围栏',energy:'能量与终点'}[f[1]]}</span><span>${f[0]}</span></div><h3>${f[2]}</h3><div class="formula-expression" data-tex="${f[3]}"></div><p>${f[4]}</p><details><summary>符号解释与原文位置 ＋</summary><p>${f[5]}</p></details></article>`;}).join('');$('#no-results').hidden=count>0;math($('#formula-cards'));}
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;$$('[data-filter]').forEach(el=>el.classList.toggle('active',el===b));renderFormulas();}));$('#formula-search').addEventListener('input',renderFormulas);
function realChem(){
 const a0=+$('#real-start').value,t=+$('#real-time').value/100;
 // Exact solution of a' = -2a²-a+2 for the illustrative one-reaction model.
 const root=Math.sqrt(17),ap=(-1+root)/4,am=(-1-root)/4,q=(a0-ap)/(a0-am)*Math.exp(-root*t),a=(ap-q*am)/(1-q),b=(2-a)/2;
 $('#real-start-value').textContent=a0.toFixed(2);$('#real-time-value').textContent=`t = ${t.toFixed(2)}`;
 $('#real-state').innerHTML=`NO₂ <b>${a.toFixed(4)}</b><br>N₂O₄ <b>${b.toFixed(4)}</b>`;
 const j=a*a-b;$('#real-flux').textContent=Math.abs(j)<.0001?'正逆速率相等，净变化接近零':j>0?'此刻：净生成 N₂O₄ →':'此刻：净解离生成 NO₂ ←';
 $('#gas').style.opacity=.10+.65*a/2;
 const positions=[[17,20],[45,28],[73,15],[28,52],[67,48],[14,78],[48,79],[80,76]];
 $('#molecules').innerHTML=positions.map(([x,y],i)=>`<span class="molecule" style="left:${x}%;top:${y}%;color:${i/8<a/2?'#a25432':'#64826a'}">${i/8<a/2?'NO₂':'N₂O₄'}</span>`).join('');
}
$('#real-start').addEventListener('input',()=>{$('#real-time').value=0;realChem();});$('#real-time').addEventListener('input',realChem);
window.Lab={field,energy,dissipation,simulate,initialStates,paperRuns,getState:()=>({selected,timeIndex,playing,chartMode,initial:run[0].x,current:run[timeIndex]})};
math();reactionSelect('r1');renderProof(0);renderFormulas();updateInitial();renderLab();realChem();
