// Chapter dialogue; voices approved and generated after the text/art review.
export const BUNNY_FLAGS = ['bunnyChapter','approachKnown','kioskKeyFound','kioskOpen','bunniesTaken','bunny1','bunny2','bunny3','bunny4','minefieldCleared'];
export const BUNNY_ITEMS = {
  kioskKey:{name:'Ключ от киоска',description:'Ключ на красном брелоке. Гоночная карьера закончилась, слесарная — начинается.'},
  bunnies:{name:'Коробка зайцев',description:'Игрушечные оптимисты на батарейках. Выпускать по одному. Вся коробка сразу — плохая идея.'}
};
export const BUNNY_SCENE = {name:'Испытательный полигон',short:'СЛУЖЕБНЫЙ ВХОД',coordinate:'ЗАВОД КОРЛИ · 22:51',index:4,x:0,y:0,description:'Закрытый киоск. Открытая вакансия для героя.',arrival:'Главный вход перекрыт. Остались служебный проход и магазин счастливого детства. Что-то здесь обязательно взорвётся.',spawn:[28,86],background:'proving-ground.png'};
export const bunnyProgress = s => [1,2,3,4].filter(i=>s.flags['bunny'+i]).length;
// The actor is confined to the cleared foreground. Clicking beyond it never
// walks Ben into the fictional hazard, including during the visual animation.
export const bunnyFrontier = s => 34 + bunnyProgress(s)*12;
const say=(text,speaker='BEN',extra={})=>({text,speaker,...extra});
const note=(s,text)=>{if(!s.journal.includes(text))s.journal.push(text);};
const give=(s,id)=>{if(!s.inventory.includes(id))s.inventory.push(id);};
export function bunnyObjective(s){
  if(!s.flags.bunniesTaken)return 'Найти способ достать игрушечных зайцев из киоска.';
  return 'Выпускать зайцев по одному и пройти к служебному входу.';
}
export function bunnyObjects(s){
  const o=(id,name,x,y,w,h)=>({id,name,x,y,w,h});
  return [o('guard','Ночной охранник',30,48,9,28),o('kiosk',s.flags.kioskOpen?'Открытый киоск':'Решётка киоска',6,42,18,17),
    o('remote','Пульт машинки',5,53,7,7),...(!s.flags.kioskKeyFound?[o('toyCar','Демонстрационная машинка',15,48,8,7)]:[]),
    ...(s.flags.kioskOpen&&!s.flags.bunniesTaken?[o('bunnyBox','Коробка зайцев',11,46,10,10)]:[]),
    o('warning','Предупреждающий знак',40,42,7,18),o('minefield',s.flags.minefieldCleared?'Расчищенная дорожка':'Минное поле',44,68,45,17),
    o('serviceGate','Служебный проход',79,36,17,16)];
}
export function bunnyConversation(s,who='guard'){
  if(who==='remote')return say('Пульт ещё работает. Ключ от киоска прицеплен к бамперу машинки за решёткой. Зачем? Видимо, чтобы не потерять.', 'BEN', {choices:[
    {id:'car_forward',label:'Толкнуть рычаг вперёд'}, {id:'car_reverse',label:'Потянуть рычаг назад'}, {id:'bunny_bye',label:'Отойти от пульта'}]});
  s.flags.approachKnown=true;
  note(s,'Охранник показал служебный путь через старый полигон. Люди Рипбургера снова включили защиту. В киоске остались игрушечные зайцы.');
  return say(s.flags.minefieldCleared?'Четыре зайца против охраны Рипбургера. Пожалуй, верну свой значок «Хорьков» на видное место.':
    'Главный вход заперли люди Рипбургера. До служебного можно дойти через старый полигон, вот только они снова включили мины. Взрываются от малейшей нагрузки.', 'GUARD', {choices:[
    {id:'bunny_security',label:'Корли испытывал здесь мотоциклы или покупателей?'},
    {id:'bunny_kiosk',label:'Как открыть киоск?'},
    {id:'bunny_bye',label:'Ладно. Пойду за добровольцами.'}]});
}
export function bunnyChoose(s,id){
  if(s.scene!=='proving')return null;
  if(!['car_forward','car_reverse','bunny_security','bunny_kiosk','bunny_bye'].includes(id))return null;
  s.actions++;
  if(id==='bunny_bye')return say('Пора за работу. У Рипбургера слишком много свободного эфира.');
  if(id==='bunny_security')return say('Раньше тут испытывали защиту грузовиков. Малкольм велел всё отключить. Новый начальник решил сэкономить на сторожах.', 'GUARD');
  if(id==='bunny_kiosk')return say('Продавец прицепил ключ к демонстрационной машинке. Машинка за решёткой, пульт снаружи. Между нижней перекладиной и прилавком есть щель.', 'GUARD');
  if(s.flags.kioskKeyFound)return say('Ключ уже у меня. Гонка окончена.');
  if(id==='car_forward')return say('Машинка уткнулась в заднюю стенку. Задний ход придумали как раз для таких победителей.');
  s.flags.kioskKeyFound=true;give(s,'kioskKey');
  note(s,'Вывел машинку задним ходом через щель под решёткой и снял с бампера ключ от киоска.');
  return say('Задний ход. Машинка пролезает под решёткой вместе с ключом. Первый угон, за который мне даже немного стыдно.', 'BEN',{toast:'Ключ от киоска — в кармане',effect:'car'});
}
export const BUNNY_RELEASE_LINES=[
  'Первый заяц бодро скачет навстречу карьере. Бум. Появилась дорожка. Теперь можно подойти ближе.',
  'Второй поёт ту же песенку. Бум. Припев стал короче. Ещё немного пути свободно.',
  'Третий даже не замедлился. Вот что значит верить в свою работу. До прохода остался один участок.',
  'Последний хлопок. Тишина. Наконец-то полезная льгота для сотрудников. Путь к служебному входу открыт.'
];
export function bunnyInteract(s,target,verb,item){
  if(s.scene!=='proving')return null;
  const f=s.flags;
  if(item==='kioskKey'&&target==='kiosk'){
    f.kioskOpen=true;s.inventory=s.inventory.filter(id=>id!==item);
    note(s,'Открыл киоск «Смэшаториум». Внутри коробка с четырьмя игрушечными зайцами.');
    return say('Замок щёлкнул. За решёткой — четыре зайца и ни одного здравого решения. Осталось забрать коробку.');
  }
  if(item==='bunnies'&&target==='minefield'){
    const step=bunnyProgress(s);if(step===4)return say('Путь уже свободен. Зайцы сделали своё дело.');
    f['bunny'+(step+1)]=true;
    if(step===3){f.minefieldCleared=true;s.inventory=s.inventory.filter(id=>id!=='bunnies');}
    note(s,BUNNY_RELEASE_LINES[step]);
    return say(BUNNY_RELEASE_LINES[step],'BEN',{effect:'bunny',bunnyStep:step+1,toast:step===3?'Служебный путь открыт':undefined});
  }
  if(item)return null;
  if(target==='guard')return verb==='talk'||verb==='use'?bunnyConversation(s):say('На куртке охранника значок «Хорьков». Сегодня это лучше любого пропуска.');
  if(verb==='kick')return say(target==='minefield'?'Один пинок — и меня будут собирать магнитом. Поищу другой способ.':'Пусть сегодня тяжёлую работу сделает кто-нибудь на батарейках.');
  if(target==='remote')return verb==='use'?bunnyConversation(s,'remote'):say('Пульт демонстрационной машинки. Рычаг вперёд, рычаг назад. Сложнее моей коробки передач.');
  if(target==='toyCar')return say(f.kioskKeyFound?'Машинка отработала своё. Ключ снят.':'За решёткой игрушечная машинка. С бампера свисает ключ. Щель внизу как раз по её размеру.');
  if(target==='kiosk')return say(f.kioskOpen?(f.bunniesTaken?'Киоск пуст. Всё лучшее уже отправилось на полигон.':'Решётка поднята. Осталось взять коробку с прилавка.'):'Решётка заперта. Коробку видно, достать нельзя. Ключ болтается на машинке внутри.');
  if(target==='bunnyBox'){
    if(verb!=='use')return say('Четыре белых зайца. На коробке обещают незабываемые впечатления. Не соврали.');
    f.bunniesTaken=true;give(s,'bunnies');note(s,'Взял коробку зайцев. Буду выпускать по одному с края расчищенной дорожки.');
    return say('Четыре добровольца. Батарейки входят в комплект, инстинкт самосохранения — нет. Выпускать буду по одному.', 'BEN',{toast:'Коробка зайцев — в инвентаре'});
  }
  if(target==='warning')return say('«Испытания убивают». Удивительно честная реклама. За знаком начинается старое минное поле.');
  if(target==='minefield')return say(f.minefieldCleared?'Воронки обозначают свободный путь. Можно идти к служебному проходу.':f.bunniesTaken?'Выпущу одного зайца. Дальше пойду только по его следу.':'Пешком не пойду. Охранник, кажется, знает другой способ.');
  if(target==='serviceGate')return say(f.minefieldCleared?'За проходом — заводской двор и терминал трансляции.':'Проход совсем близко. Между нами — минное поле. Сначала нужна дорожка.');
  return null;
}
export function bunnyHints(s){
  if(!s.flags.kioskKeyFound)return ['У служебного входа есть союзник. Поговори с охранником.','Ключ висит на машинке за решёткой. Пульт остался снаружи.','Используй пульт машинки и выбери «Потянуть рычаг назад».'];
  if(!s.flags.kioskOpen)return ['Ключ уже у тебя. Осталось найти его замок.','Ключ от машинки открывает решётку киоска.','Выбери ключ от киоска в инвентаре и примени к решётке.'];
  if(!s.flags.bunniesTaken)return ['За решёткой ждут маленькие помощники.','Забери коробку с прилавка открытого киоска.','Выбери «Действие» и нажми на коробку зайцев.'];
  return ['Большую проблему можно решить несколькими маленькими зайцами.','После каждого взрыва Бен подходит к новому краю дорожки.','Выбери коробку зайцев и применяй к минному полю по одному разу на участок. Затем используй служебный проход.'];
}
