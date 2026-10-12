/* ============================================================
   COINKEEPER — ПЕРЕВОД И ПОПОЛНЕНИЕ СРЕДСТВ
   ============================================================ */

/* ============================================================
   1. ДАННЫЕ
   ============================================================ */

const iconsTop =
[
    { icon: 'image_svg/top_panel/banknote.svg',         name: 'banknote', type: 'cash',     values: '0₽', title: 'Наличные' },
    { icon: 'image_svg/top_panel/bitcoin.svg',          name: 'bitcoin',  type: 'crypto',   values: '0₽', title: 'Крипта'   },
    { icon: 'image_svg/top_panel/dollar-sign.svg',      name: 'dollar',   type: 'currency', values: '0$', title: 'Доллар'   },
    { icon: 'image_svg/top_panel/credit-card-plus.svg', name: 'card',     type: 'card',     values: '0₽', title: 'Карта'    },
    { icon: 'image_svg/top_panel/piggy-bank.svg',       name: 'piggy',    type: 'savings',  values: '0₽', title: 'Копилка'  },
    { icon: 'image_svg/top_panel/wallet.svg',           name: 'wallet',   type: 'wallet',   values: '0₽', title: 'Кошелёк'  },
];

const iconsMidle =
[
    { icon: 'image_svg/midle_panel/biceps-flexed.svg',  name: 'biceps-flexed', type: 'sport',     values: '0₽', title: 'Спорт'         },
    { icon: 'image_svg/midle_panel/bone.svg',           name: 'bone',          type: 'pets',      values: '0₽', title: 'Питомец'       },
    { icon: 'image_svg/midle_panel/car.svg',            name: 'car',           type: 'transport', values: '0₽', title: 'Машина'        },
    { icon: 'image_svg/midle_panel/graduation-cap.svg', name: 'graduation-cap',type: 'education', values: '0₽', title: 'Учеба'         },
    { icon: 'image_svg/midle_panel/house.svg',          name: 'house',         type: 'services',  values: '0₽', title: 'Услуги'        },
    { icon: 'image_svg/midle_panel/plane.svg',          name: 'plane',         type: 'travel',    values: '0₽', title: 'Путешествия'   },
    { icon: 'image_svg/midle_panel/smartphone.svg',     name: 'smartphone',    type: 'utilities', values: '0₽', title: 'Телефон'       },
    { icon: 'image_svg/midle_panel/wifi.svg',           name: 'wifi',          type: 'utilities', values: '0₽', title: 'Интернет'      },
];

const user =
{
    user1: { name: 'admin123', email: 'admin123@gmail.com' },
    user2: { name: 'admin',    email: 'admin@gmail.com'    },
};

/* ============================================================
   2. УТИЛИТЫ ДЛЯ ДЕНЕГ
   ============================================================ */

const CURRENCIES = ['₽', '$', '€', '₴', '₸', '£', '¥'];

/** '1 250,50₽'  ->  { amount: 1250.5, currency: '₽' } */
function parseValue(str)
{
    const s = String(str ?? '0').trim();

    const numMatch = s.match(/-?\d+(?:[.,]\d+)?/);
    const amount = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : 0;

    let currency = '₽';
    for (const c of CURRENCIES)
    {
        if (s.includes(c)) { currency = c; break; }
    }

    return { amount, currency };
}

/** 1250.5, '₽' -> '1250.5₽' */
function formatValue(amount, currency)
{
    const rounded = Math.round(amount * 100) / 100;
    return `${rounded}${currency}`;
}

/* ============================================================
   3. UI-ХЕЛПЕРЫ
   ============================================================ */

let toastTimer = null;

function toast(text, isError = false)
{
    let el = document.querySelector('.toast');

    if (!el)
    {
        el = document.createElement('div');
        el.classList.add('toast');
        document.body.append(el);
    }

    el.textContent = text;
    el.classList.toggle('error', isError);
    el.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

function pulse(item)
{
    if (!item) return;
    item.classList.remove('pulse');
    void item.offsetWidth;
    item.classList.add('pulse');
    setTimeout(() => item.classList.remove('pulse'), 500);
}

function renderValue(data)
{
    if (data.valueEl) data.valueEl.innerText = data.values;
}

/* ============================================================
   4. СОЗДАНИЕ ЯЧЕЙКИ
   ============================================================ */

function createItem(data)
{
    const item = document.createElement('div');
    item.classList.add('item');
    item.dataset.type = data.type;
    item.dataset.name = data.name;

    const name = document.createElement('span');
    name.classList.add('circle-name');
    name.innerText = data.title;

    const circle = document.createElement('div');
    circle.classList.add('circle');

    const img = document.createElement('img');
    img.src = data.icon;
    img.classList.add('circle-icon');
    img.draggable = false;
    img.alt = data.name;

    circle.append(img);

    const value = document.createElement('span');
    value.classList.add('circle-value');
    value.innerText = data.values;

    item.append(name, circle, value);

    item._data    = data;
    data.el       = item;
    data.valueEl  = value;
    data.circleEl = circle;

    /* --- drag: перетаскивание = перевод --- */
    circle.addEventListener('pointerdown', (e) =>
    {
        e.preventDefault();
        startDrag(e, item);
    });

    /* --- двойной клик = пополнение счёта --- */
    circle.addEventListener('dblclick', (e) =>
    {
        e.preventDefault();
        depositFunds(item);
    });

    return item;
}

/* ============================================================
   5. DRAG & DROP
   ============================================================ */

let drag = null;
const DRAG_THRESHOLD = 5;

function startDrag(e, item)
{
    if (e.button !== undefined && e.button !== 0) return;
    if (drag) return;
    if (document.querySelector('.transfer-backdrop')) return;

    const circle = item.querySelector('.circle');
    const rect   = circle.getBoundingClientRect();

    const ghost = circle.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width  = rect.width  + 'px';
    ghost.style.height = rect.height + 'px';
    document.body.append(ghost);

    drag = {
        source  : item,
        ghost,
        offsetX : e.clientX - rect.left,
        offsetY : e.clientY - rect.top,
        startX  : e.clientX,
        startY  : e.clientY,
        target  : null,
        moved   : false,
    };

    positionGhost(e.clientX, e.clientY);

    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
    document.addEventListener('pointercancel', onDragEnd);
}

function positionGhost(clientX, clientY)
{
    if (!drag) return;
    const x = clientX - drag.offsetX;
    const y = clientY - drag.offsetY;
    drag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function onDragMove(e)
{
    if (!drag) return;

    if (!drag.moved)
    {
        const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
        if (dist < DRAG_THRESHOLD) return;

        drag.moved = true;
        drag.ghost.classList.add('visible');
        drag.source.classList.add('dragging');
        document.body.classList.add('dragging');
    }

    positionGhost(e.clientX, e.clientY);

    const under  = document.elementFromPoint(e.clientX, e.clientY);
    const item   = under ? under.closest('.item') : null;
    const target = (item && item !== drag.source) ? item : null;

    if (target !== drag.target)
    {
        if (drag.target) drag.target.classList.remove('drop-target');
        drag.target = target;
        if (drag.target) drag.target.classList.add('drop-target');
    }
}

function onDragEnd()
{
    if (!drag) return;

    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    document.removeEventListener('pointercancel', onDragEnd);

    const { source, target, ghost, moved } = drag;

    ghost.remove();
    source.classList.remove('dragging');
    document.body.classList.remove('dragging');
    if (target) target.classList.remove('drop-target');

    drag = null;

    if (moved && target)
    {
        transferFunds(source, target);
    }
}

/* ============================================================
   6. УНИВЕРСАЛЬНЫЙ ДИАЛОГ ВВОДА СУММЫ
   ============================================================ */

/**
 * Показывает модалку ввода суммы.
 * Возвращает Promise<number | null> — null, если отменено.
 *
 * opts = {
 *   title,         // заголовок окна
 *   route,         // HTML строка с описанием (может содержать <b>)
 *   hint,          // мелкая подпись (доступно / текущий баланс)
 *   defaultValue,  // число по умолчанию
 *   maxAmount,     // максимум (для перевода)
 *   quick: [{ label, apply(current) -> value }],
 *   confirmText,   // текст кнопки подтверждения
 * }
 */
function showAmountDialog(opts)
{
    return new Promise((resolve) =>
    {
        const backdrop = document.createElement('div');
        backdrop.classList.add('transfer-backdrop');

        const modal = document.createElement('div');
        modal.classList.add('transfer-modal');

        const h3 = document.createElement('h3');
        h3.textContent = opts.title;

        const route = document.createElement('div');
        route.classList.add('route');
        route.innerHTML = opts.route ?? '';

        const hint = document.createElement('div');
        hint.classList.add('hint');
        hint.textContent = opts.hint ?? '';

        const input = document.createElement('input');
        input.type  = 'number';
        input.min   = '0';
        input.step  = 'any';
        input.value = opts.defaultValue ?? '';

        const quick = document.createElement('div');
        quick.classList.add('quick');

        (opts.quick ?? []).forEach(({ label, apply }) =>
        {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            btn.addEventListener('click', () =>
            {
                const current = parseFloat(String(input.value).replace(',', '.')) || 0;
                input.value = Math.round(apply(current) * 100) / 100;
                input.focus();
                input.select();
            });
            quick.append(btn);
        });

        const actions = document.createElement('div');
        actions.classList.add('actions');

        const cancelBtn = document.createElement('button');
        cancelBtn.classList.add('cancel');
        cancelBtn.textContent = 'Отмена';

        const confirmBtn = document.createElement('button');
        confirmBtn.classList.add('confirm');
        confirmBtn.textContent = opts.confirmText ?? 'OK';

        actions.append(cancelBtn, confirmBtn);
        modal.append(h3, route, hint, input, quick, actions);
        backdrop.append(modal);
        document.body.append(backdrop);

        void backdrop.offsetWidth;
        backdrop.classList.add('show');

        setTimeout(() => { input.focus(); input.select(); }, 60);

        function close(result)
        {
            backdrop.classList.remove('show');
            document.removeEventListener('keydown', onKey);
            setTimeout(() => backdrop.remove(), 200);
            resolve(result);
        }

        function confirm()
        {
            const val = parseFloat(String(input.value).replace(',', '.'));
            if (isNaN(val) || val <= 0) { input.focus(); return; }
            if (opts.maxAmount !== undefined && val > opts.maxAmount)
            {
                input.value = opts.maxAmount;
                input.focus();
                input.select();
                return;
            }
            close(Math.round(val * 100) / 100);
        }

        function onKey(e)
        {
            if (e.key === 'Escape') close(null);
            if (e.key === 'Enter')  confirm();
        }

        cancelBtn.addEventListener('click', () => close(null));
        confirmBtn.addEventListener('click', confirm);
        backdrop.addEventListener('click', (e) =>
        {
            if (e.target === backdrop) close(null);
        });
        document.addEventListener('keydown', onKey);
    });
}

/* ============================================================
   7. ПЕРЕВОД СРЕДСТВ (drag из одного счёта в другой)
   ============================================================ */

async function transferFunds(sourceItem, targetItem)
{
    const from = sourceItem._data;
    const to   = targetItem._data;

    const fromVal = parseValue(from.values);
    const toVal   = parseValue(to.values);

    if (fromVal.currency !== toVal.currency)
    {
        toast(`Разные валюты: ${fromVal.currency} → ${toVal.currency}`, true);
        return;
    }

    if (fromVal.amount <= 0)
    {
        toast(`На «${from.title}» пусто`, true);
        return;
    }

    const amount = await showAmountDialog({
        title        : 'Перевод средств',
        route        : `Из <b>${from.title}</b> → в <b>${to.title}</b>`,
        hint         : `Доступно: ${fromVal.amount}${fromVal.currency}`,
        defaultValue : fromVal.amount,
        maxAmount    : fromVal.amount,
        confirmText  : 'Перевести',
        quick: [
            { label: '25%', apply: () => fromVal.amount * 0.25 },
            { label: '50%', apply: () => fromVal.amount * 0.5  },
            { label: 'Все', apply: () => fromVal.amount        },
        ],
    });

    if (amount === null) return;
    if (amount <= 0 || amount > fromVal.amount) return;

    fromVal.amount -= amount;
    toVal.amount   += amount;

    from.values = formatValue(fromVal.amount, fromVal.currency);
    to.values   = formatValue(toVal.amount,   toVal.currency);

    renderValue(from);
    renderValue(to);

    pulse(sourceItem);
    pulse(targetItem);

    toast(`${amount}${fromVal.currency} · «${from.title}» → «${to.title}»`);
}

/* ============================================================
   8. ПОПОЛНЕНИЕ СЧЁТА (двойной клик по кружку)
   ============================================================ */

async function depositFunds(item)
{
    const data = item._data;
    const { amount: current, currency } = parseValue(data.values);

    const addAmount = await showAmountDialog({
        title        : 'Пополнение счета',
        route        : `Счет: <b>${data.title}</b>`,
        hint         : `Текущий баланс: ${current}${currency}`,
        defaultValue : 100,
        confirmText  : 'Пополнить',
        quick: [
            { label: '+100',  apply: (cur) => cur + 100  },
            { label: '+500',  apply: (cur) => cur + 500  },
            { label: '+1000', apply: (cur) => cur + 1000 },
        ],
    });

    if (addAmount === null) return;
    if (addAmount <= 0) return;

    const newAmount = current + addAmount;

    data.values = formatValue(newAmount, currency);
    renderValue(data);

    pulse(item);
    toast(`+${addAmount}${currency} · «${data.title}»`);
}

/* ============================================================
   9. СБОРКА ИНТЕРФЕЙСА
   ============================================================ */

const container = document.createElement('div');
container.classList.add('function-container');

const foot = document.createElement('div');
foot.classList.add('foot');
iconsTop.forEach(data => foot.append(createItem(data)));

const hr = document.createElement('hr');

const mid = document.createElement('div');
mid.classList.add('mid');
iconsMidle.forEach(data => mid.append(createItem(data)));

const footer = document.createElement('footer');
footer.classList.add('footer');

const PANELLogIn = document.createElement('div');
PANELLogIn.classList.add('PANELLogIn');

const ICONLogIn = document.createElement('img');
ICONLogIn.src = 'image_svg/user/user.svg';
ICONLogIn.classList.add('ICONLogIn');

const csrt = document.createElement('div');
csrt.classList.add('csrt');

const NAMELogIn = document.createElement('p');
NAMELogIn.innerText = user.user1.name;

const EMAILLogIn = document.createElement('p');
EMAILLogIn.innerText = user.user1.email;

csrt.append(NAMELogIn, EMAILLogIn);
PANELLogIn.append(ICONLogIn, csrt);
footer.append(PANELLogIn);

container.append(foot, hr, mid, footer);
document.body.append(container);