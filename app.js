// ==========================================
//  УМНЫЙ ДНЕВНИК ПИТАНИЯ — логика
// ==========================================

var GLUCOSE_MIN = 3.3;
var GLUCOSE_MAX = 5.5;

let currentStep = 1;
let totalSteps = 6;
let editingId = null;
let selectedHunger = null;
let selectedSatiety = null;
let recognition = null;
let activeVoiceField = null;

// ==========================================
//  ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ==========================================

function getProfile() {
    return JSON.parse(localStorage.getItem('userProfile') || 'null');
}

function saveProfileData(profile) {
    localStorage.setItem('userProfile', JSON.stringify(profile));
}

function checkProfile() {
    const profile = getProfile();
    if (!profile) {
        document.getElementById('profile-title').textContent = 'Добро пожаловать!';
        document.getElementById('profile-subtitle').textContent =
            'Заполните данные о себе — это нужно один раз. Потом сможете изменить.';
        document.getElementById('btn-profile-cancel').classList.add('hidden');
        document.getElementById('profile-overlay').classList.remove('hidden');
    } else {
        document.getElementById('header-name').textContent = profile.name;
        document.getElementById('profile-overlay').classList.add('hidden');
    }
}

function saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    const age = document.getElementById('profile-age').value.trim();
    const height = document.getElementById('profile-height').value.trim();
    const weight = document.getElementById('profile-weight').value.trim();

    if (!name) {
        alert('Введите имя.');
        return;
    }
    if (!age || !height || !weight) {
        alert('Заполните все поля.');
        return;
    }

    var profile = {
        name: name,
        age: parseInt(age),
        height: parseInt(height),
        weight: parseFloat(weight)
    };

    saveProfileData(profile);
    document.getElementById('header-name').textContent = name;
    document.getElementById('profile-overlay').classList.add('hidden');
}

function openProfile() {
    var profile = getProfile();
    if (!profile) return;

    document.getElementById('profile-title').textContent = 'Ваш профиль';
    document.getElementById('profile-subtitle').textContent =
        'Измените данные и нажмите «Сохранить».';
    document.getElementById('btn-profile-cancel').classList.remove('hidden');

    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-age').value = profile.age || '';
    document.getElementById('profile-height').value = profile.height || '';
    document.getElementById('profile-weight').value = profile.weight || '';

    document.getElementById('profile-overlay').classList.remove('hidden');
}

function closeProfile() {
    document.getElementById('profile-overlay').classList.add('hidden');
}

// ==========================================
//  РАБОТА С localStorage (дневник)
// ==========================================

function getEntries() {
    return JSON.parse(localStorage.getItem('foodDiary') || '[]');
}

function saveEntries(entries) {
    localStorage.setItem('foodDiary', JSON.stringify(entries));
}

// --- При запуске приложения ---
window.addEventListener('DOMContentLoaded', function() {
    checkProfile();
    initDateTime();
    buildScales();
    goToStep(1);
    renderDiary();
});

// --- Установка текущих даты и времени ---
function initDateTime() {
    var now = new Date();
    var dateStr = now.toISOString().split('T')[0];
    document.getElementById('input-date').value = dateStr;

    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('input-time').value = hours + ':' + minutes;
}

// --- Создание кнопок шкалы 1-10 ---
function buildScales() {
    var hungerContainer = document.getElementById('scale-hunger');
    var satietyContainer = document.getElementById('scale-satiety');

    for (var i = 1; i <= 10; i++) {
        var hBtn = document.createElement('button');
        hBtn.className = 'scale-btn';
        hBtn.textContent = i;
        hBtn.onclick = function() {
            selectScale('hunger', parseInt(this.textContent), this);
        };
        hungerContainer.appendChild(hBtn);

        var sBtn = document.createElement('button');
        sBtn.className = 'scale-btn';
        sBtn.textContent = i;
        sBtn.onclick = function() {
            selectScale('satiety', parseInt(this.textContent), this);
        };
        satietyContainer.appendChild(sBtn);
    }
}

// --- Выбор значения на шкале ---
function selectScale(type, value, btn) {
    var containerId = type === 'hunger' ? 'scale-hunger' : 'scale-satiety';
    var buttons = document.querySelectorAll('#' + containerId + ' .scale-btn');
    buttons.forEach(function(b) { b.classList.remove('selected'); });

    btn.classList.add('selected');

    if (type === 'hunger') {
        selectedHunger = value;
    } else {
        selectedSatiety = value;
    }
}

// --- Навигация по шагам ---
function goToStep(step) {
    for (var i = 1; i <= totalSteps; i++) {
        document.getElementById('step-' + i).classList.add('hidden');
    }

    document.getElementById('step-' + step).classList.remove('hidden');

    var progress = (step / totalSteps) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('step-label').textContent = 'Шаг ' + step + ' из ' + totalSteps;

    document.getElementById('btn-prev').classList.toggle('hidden', step === 1);

    if (step === totalSteps) {
        document.getElementById('btn-next').classList.add('hidden');
        document.getElementById('btn-save').classList.remove('hidden');
        buildSummary();
    } else {
        document.getElementById('btn-next').classList.remove('hidden');
        document.getElementById('btn-save').classList.add('hidden');
    }

    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
    if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

// --- Сбор данных из формы ---
function collectEntry() {
    return {
        id: editingId || Date.now(),
        date: document.getElementById('input-date').value,
        time: document.getElementById('input-time').value,
        mealType: document.getElementById('input-meal-type').value,
        food: document.getElementById('input-food').value,
        water: document.getElementById('input-water').value,
        glucose: document.getElementById('input-glucose').value,
        emotion: document.getElementById('input-emotion').value,
        situation: document.getElementById('input-situation').value,
        symptoms: document.getElementById('input-symptoms').value,
        meds: document.getElementById('input-meds').value,
        hunger: selectedHunger,
        satiety: selectedSatiety
    };
}

// --- Построение сводки на шаге 6 ---
function buildSummary() {
    var e = collectEntry();
    var rows = [
        ['Дата', formatDate(e.date)],
        ['Время', e.time],
        ['Тип приёма пищи', e.mealType || '—'],
        ['Еда и количество', e.food || '—'],
        ['Вода', e.water || '—'],
        ['Глюкоза (ммоль/л)', e.glucose || '—'],
        ['Эмоция / активность', e.emotion || '—'],
        ['Ситуация', e.situation || '—'],
        ['Симптомы', e.symptoms || '—'],
        ['Препараты', e.meds || '—'],
        ['Голод (1-10)', e.hunger || '—'],
        ['Сытость (1-10)', e.satiety || '—']
    ];

    var html = '';
    rows.forEach(function(row) {
        html += '<div class="summary-row">';
        html += '<span class="summary-label">' + row[0] + '</span>';
        html += '<span class="summary-value">' + row[1] + '</span>';
        html += '</div>';
    });

    document.getElementById('summary').innerHTML = html;
}

// --- Сохранение записи ---
function saveEntry() {
    var entry = collectEntry();
    var entries = getEntries();

    if (editingId) {
        var index = entries.findIndex(function(e) { return e.id === editingId; });
        if (index !== -1) {
            entries[index] = entry;
        }
    } else {
        entries.unshift(entry);
    }

    saveEntries(entries);
    resetForm();
    renderDiary();
    switchTab('diary');
}

// --- Сброс формы ---
function resetForm() {
    editingId = null;
    selectedHunger = null;
    selectedSatiety = null;

    document.querySelectorAll('.field').forEach(function(f) { f.value = ''; });
    document.querySelectorAll('.scale-btn').forEach(function(b) {
        b.classList.remove('selected');
    });

    initDateTime();
    goToStep(1);
}

// --- Загрузка записи для редактирования ---
function editEntry(id) {
    var entries = getEntries();
    var entry = entries.find(function(e) { return e.id === id; });
    if (!entry) return;

    editingId = id;

    document.getElementById('input-date').value = entry.date || '';
    document.getElementById('input-time').value = entry.time || '';
    document.getElementById('input-meal-type').value = entry.mealType || '';
    document.getElementById('input-food').value = entry.food || '';
    document.getElementById('input-water').value = entry.water || '';
    document.getElementById('input-glucose').value = entry.glucose || '';
    document.getElementById('input-emotion').value = entry.emotion || '';
    document.getElementById('input-situation').value = entry.situation || '';
    document.getElementById('input-symptoms').value = entry.symptoms || '';
    document.getElementById('input-meds').value = entry.meds || '';

    selectedHunger = entry.hunger;
    selectedSatiety = entry.satiety;

    if (entry.hunger) {
        var btns = document.querySelectorAll('#scale-hunger .scale-btn');
        if (btns[entry.hunger - 1]) btns[entry.hunger - 1].classList.add('selected');
    }
    if (entry.satiety) {
        var btns2 = document.querySelectorAll('#scale-satiety .scale-btn');
        if (btns2[entry.satiety - 1]) btns2[entry.satiety - 1].classList.add('selected');
    }

    switchTab('new');
    goToStep(1);
}

// --- Удаление записи ---
function deleteEntry(id) {
    if (!confirm('Удалить эту запись?')) return;

    var entries = getEntries();
    entries = entries.filter(function(e) { return e.id !== id; });
    saveEntries(entries);
    renderDiary();
}

// --- Отрисовка дневника ---
function renderDiary() {
    var entries = getEntries();
    var container = document.getElementById('diary-list');
    var emptyMsg = document.getElementById('empty-msg');

    if (entries.length === 0) {
        container.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');

    var html = '';
    entries.forEach(function(e) {
        html += '<div class="diary-card">';
        html += '  <div class="diary-card-header">';
        html += '    <div class="diary-card-date">' + formatDate(e.date) + ' · ' + (e.mealType || '') + ' ' + (e.time || '') + '</div>';
        html += '    <div class="diary-card-actions">';
        html += '      <button class="btn-icon btn-edit" onclick="editEntry(' + e.id + ')" title="Редактировать">✎</button>';
        html += '      <button class="btn-icon btn-delete" onclick="deleteEntry(' + e.id + ')" title="Удалить">✕</button>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="diary-card-body">';

        var rows = [
            ['Еда', e.food],
            ['Вода', e.water],
            ['Глюкоза', e.glucose ? e.glucose + ' ммоль/л' : ''],
            ['Эмоция', e.emotion],
            ['Ситуация', e.situation],
            ['Симптомы', e.symptoms],
            ['Препараты', e.meds]
        ];

        rows.forEach(function(row) {
            if (row[1]) {
                html += '<div class="diary-card-row">';
                html += '<span class="diary-card-label">' + row[0] + ':</span>';
                html += '<span class="diary-card-value">' + row[1] + '</span>';
                html += '</div>';
            }
        });

        html += '  </div>';

        if (e.hunger || e.satiety) {
            html += '  <div class="diary-card-scales">';
            if (e.hunger) {
                html += '<span class="scale-badge badge-hunger">Голод: ' + e.hunger + '/10</span>';
            }
            if (e.satiety) {
                html += '<span class="scale-badge badge-satiety">Сытость: ' + e.satiety + '/10</span>';
            }
            html += '  </div>';
        }

        html += '</div>';
    });

    container.innerHTML = html;
}

// --- Переключение вкладок ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    document.getElementById('tab-' + tabName).classList.add('active');

    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    document.getElementById('screen-' + tabName).classList.add('active');

    if (tabName === 'diary') {
        renderDiary();
    }

    if (tabName === 'chart') {
        renderChart();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Форматирование даты ---
function formatDate(dateStr) {
    if (!dateStr) return '';
    var months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн',
                  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    var days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    var parts = dateStr.split('-');
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
}

// --- Экспорт в CSV ---
function exportCSV() {
    var entries = getEntries();
    if (entries.length === 0) {
        alert('Нет записей для экспорта.');
        return;
    }

    var headers = [
        'Дата', 'Время', 'Тип приёма пищи', 'Еда и количество',
        'Вода', 'Глюкоза (ммоль/л)',
        'Эмоция / активность', 'Ситуация', 'Симптомы', 'Препараты',
        'Голод (1-10)', 'Сытость (1-10)'
    ];

    var csv = headers.join(';') + '\n';

    entries.forEach(function(e) {
        var row = [
            e.date || '',
            e.time || '',
            e.mealType || '',
            (e.food || '').replace(/\n/g, ' | '),
            e.water || '',
            e.glucose || '',
            e.emotion || '',
            e.situation || '',
            e.symptoms || '',
            e.meds || '',
            e.hunger || '',
            e.satiety || ''
        ];
        csv += row.map(function(v) {
            return '"' + String(v).replace(/"/g, '""') + '"';
        }).join(';') + '\n';
    });

    var bom = '\uFEFF';
    var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'дневник_питания.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

// ==========================================
//  ГОЛОСОВОЙ ВВОД (Web Speech API)
// ==========================================

function startVoice(fieldId) {
    var field = document.getElementById(fieldId);

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert('Голосовой ввод не поддерживается вашим браузером. Используйте Chrome или Яндекс Браузер.');
        return;
    }

    if (recognition && activeVoiceField === fieldId) {
        recognition.stop();
        return;
    }

    if (recognition) {
        recognition.stop();
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    activeVoiceField = fieldId;

    var voiceBtn = field.parentElement.querySelector('.voice-btn');
    if (voiceBtn) voiceBtn.classList.add('recording');

    recognition.onresult = function(event) {
        var transcript = event.results[0][0].transcript;

        if (field.value && field.tagName === 'TEXTAREA') {
            field.value += '\n' + transcript;
        } else if (field.value) {
            field.value += ' ' + transcript;
        } else {
            field.value = transcript;
        }
    };

    recognition.onerror = function(event) {
        if (event.error !== 'no-speech') {
            alert('Ошибка распознавания: ' + event.error);
        }
    };

    recognition.onend = function() {
        if (voiceBtn) voiceBtn.classList.remove('recording');
        recognition = null;
        activeVoiceField = null;
    };

    recognition.start();
}

// ==========================================
//  ГРАФИК ГЛЮКОЗЫ (Canvas API)
// ==========================================

function renderChart() {
    var canvas = document.getElementById('glucose-chart');
    var emptyMsg = document.getElementById('chart-empty');
    var entries = getEntries();

    var glucoseData = entries.filter(function(e) {
        return e.glucose && e.glucose !== '';
    });

    if (glucoseData.length === 0) {
        canvas.classList.remove('visible');
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';
    canvas.classList.add('visible');

    glucoseData.sort(function(a, b) {
        var aKey = (a.date || '') + ' ' + (a.time || '');
        var bKey = (b.date || '') + ' ' + (b.time || '');
        return aKey < bKey ? -1 : (aKey > bKey ? 1 : 0);
    });

    var dpr = window.devicePixelRatio || 1;
    var cssWidth = canvas.parentElement.offsetWidth;
    var cssHeight = 360;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var padLeft = 48;
    var padRight = 16;
    var padTop = 24;
    var padBottom = 48;
    var chartW = cssWidth - padLeft - padRight;
    var chartH = cssHeight - padTop - padBottom;

    var values = glucoseData.map(function(e) { return parseFloat(e.glucose); });
    var minVal = Math.min.apply(null, values);
    var maxVal = Math.max.apply(null, values);

    minVal = Math.min(minVal, GLUCOSE_MIN);
    maxVal = Math.max(maxVal, GLUCOSE_MAX);

    minVal = Math.floor(minVal - 1);
    if (minVal < 0) minVal = 0;
    maxVal = Math.ceil(maxVal + 1);

    function valueToY(val) {
        return padTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    }

    // Фон
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Зона нормы: зелёная полоса
    var yNormTop = valueToY(GLUCOSE_MAX);
    var yNormBottom = valueToY(GLUCOSE_MIN);

    ctx.fillStyle = 'rgba(102, 187, 106, 0.15)';
    ctx.fillRect(padLeft, yNormTop, chartW, yNormBottom - yNormTop);

    ctx.strokeStyle = 'rgba(102, 187, 106, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(padLeft, yNormTop);
    ctx.lineTo(padLeft + chartW, yNormTop);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padLeft, yNormBottom);
    ctx.lineTo(padLeft + chartW, yNormBottom);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillStyle = '#2E7D32';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('норма ' + GLUCOSE_MAX, padLeft + 4, yNormTop - 8);
    ctx.fillText('норма ' + GLUCOSE_MIN, padLeft + 4, yNormBottom + 8);

    // Сетка и подписи по вертикали
    var gridSteps = 5;
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (var i = 0; i <= gridSteps; i++) {
        var y = padTop + (chartH / gridSteps) * i;
        var val = maxVal - ((maxVal - minVal) / gridSteps) * i;

        ctx.strokeStyle = '#E6E6FA';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + chartW, y);
        ctx.stroke();

        ctx.fillStyle = '#6B6B80';
        ctx.fillText(val.toFixed(1), padLeft - 8, y);
    }

    // Ось Y подпись
    ctx.save();
    ctx.translate(14, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9370DB';
    ctx.font = '13px Georgia, serif';
    ctx.fillText('Глюкоза, ммоль/л', 0, 0);
    ctx.restore();

    // Точки и линия
    var pointCount = glucoseData.length;
    var stepX = pointCount > 1 ? chartW / (pointCount - 1) : 0;

    // Линия графика по сегментам
    if (pointCount > 1) {
        for (var j = 0; j < pointCount - 1; j++) {
            var x1 = padLeft + stepX * j;
            var y1 = valueToY(values[j]);
            var x2 = padLeft + stepX * (j + 1);
            var y2 = valueToY(values[j + 1]);

            var v1InNorm = values[j] >= GLUCOSE_MIN && values[j] <= GLUCOSE_MAX;
            var v2InNorm = values[j + 1] >= GLUCOSE_MIN && values[j + 1] <= GLUCOSE_MAX;

            if (v1InNorm && v2InNorm) {
                ctx.strokeStyle = '#48D1CC';
            } else {
                ctx.strokeStyle = '#FF7043';
            }

            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    // Точки
    ctx.textAlign = 'center';

    for (var k = 0; k < pointCount; k++) {
        var px = padLeft + stepX * k;
        var py = valueToY(values[k]);
        var pVal = values[k];

        var pointColor;
        if (pVal < GLUCOSE_MIN) {
            pointColor = '#FF7043';
        } else if (pVal > GLUCOSE_MAX) {
            pointColor = '#EF5350';
        } else {
            pointColor = '#66BB6A';
        }

        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = pointColor;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Значение над точкой
        ctx.fillStyle = '#2D2D3F';
        ctx.font = 'bold 12px Georgia, serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(pVal.toFixed(1), px, py - 12);

        // Подпись по горизонтали
        ctx.fillStyle = '#6B6B80';
        ctx.font = '10px Georgia, serif';
        ctx.textBaseline = 'top';
        var timeLabel = glucoseData[k].time || '';
        var dateLabel = formatDate(glucoseData[k].date || '');
        ctx.fillText(timeLabel, px, padTop + chartH + 6);
        ctx.fillText(dateLabel, px, padTop + chartH + 20);
    }

    // Ось X подпись
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9370DB';
    ctx.font = '13px Georgia, serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Время', padLeft + chartW / 2, cssHeight - 4);
}
