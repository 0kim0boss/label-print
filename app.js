/* ============================================
   BarcodePrint - Roll Label Application Logic
   ============================================ */
(function () {
    'use strict';

    // ==========================================
    // Constants
    // ==========================================
    var BARCODE_TYPE_CONFIG = {
        code128: { bcid: 'code128', hint: '숫자, 영문, 특수문자 모두 가능', validate: function(v) { return v.length > 0; } },
        ean13:   { bcid: 'ean13',   hint: '13자리 숫자 (체크디짓 자동)', validate: function(v) { return /^\d{12,13}$/.test(v); } },
        ean8:    { bcid: 'ean8',    hint: '8자리 숫자 (체크디짓 자동)', validate: function(v) { return /^\d{7,8}$/.test(v); } },
        upca:    { bcid: 'upca',    hint: '12자리 숫자 (체크디짓 자동)', validate: function(v) { return /^\d{11,12}$/.test(v); } },
        code39:  { bcid: 'code39',  hint: '숫자, 영문 대문자', validate: function(v) { return /^[A-Z0-9\-.$\/+% ]+$/i.test(v); } },
        itf14:   { bcid: 'itf14',   hint: '14자리 숫자', validate: function(v) { return /^\d{13,14}$/.test(v); } },
    };

    // ==========================================
    // DOM References
    // ==========================================
    function $(sel) { return document.querySelector(sel); }

    var els = {
        paperWidth: $('#paper-width'),
        paperHeight: $('#paper-height'),
        barcodeType: $('#barcode-type'),
        barcodeTypeGroup: $('#barcode-type-group'),
        modeBarcode: $('#mode-barcode'),
        modeText: $('#mode-text'),
        inputSingle: $('#input-single'),
        inputMulti: $('#input-multi'),
        singleFields: $('#single-fields'),
        multiFields: $('#multi-fields'),
        inputData: $('#input-data'),
        inputDesc: $('#input-desc'),
        inputDataLabel: $('#input-data-label'),
        quantity: $('#quantity'),
        qtyMinus: $('#qty-minus'),
        qtyPlus: $('#qty-plus'),
        multiData: $('#multi-data'),
        multiDesc: $('#multi-desc'),
        multiDataLabel: $('#multi-data-label'),
        multiQty: $('#multi-qty'),
        multiQtyMinus: $('#multi-qty-minus'),
        multiQtyPlus: $('#multi-qty-plus'),
        btnAdd: $('#btn-add'),
        addedList: $('#added-list'),
        addedEmpty: $('#added-empty'),
        btnPreview: $('#btn-preview'),
        btnPrint: $('#btn-print'),
        previewPlaceholder: $('#preview-placeholder'),
        rollPreview: $('#roll-preview'),
        layoutInfo: $('#layout-info'),
        dataHint: $('#data-hint'),
        toast: $('#toast'),
        toastIcon: $('#toast-icon'),
        toastMessage: $('#toast-message'),
    };

    // ==========================================
    // State
    // ==========================================
    var outputMode = 'barcode';    // 'barcode' | 'text'
    var inputMethod = 'single';    // 'single' | 'multi'
    var multiItems = [];           // [{data, desc, qty}]

    // ==========================================
    // Toast
    // ==========================================
    var toastTimer = null;
    function showToast(msg, type) {
        type = type || 'success';
        if (toastTimer) clearTimeout(toastTimer);
        var icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        els.toastIcon.textContent = icons[type] || '✅';
        els.toastMessage.textContent = msg;
        els.toast.classList.add('show');
        toastTimer = setTimeout(function() { els.toast.classList.remove('show'); }, 3000);
    }

    // ==========================================
    // Output Mode: Barcode / Text
    // ==========================================
    function setOutputMode(mode) {
        outputMode = mode;
        if (mode === 'barcode') {
            els.modeBarcode.classList.add('active');
            els.modeText.classList.remove('active');
            els.barcodeTypeGroup.style.display = '';
            // Update labels
            els.inputDataLabel.innerHTML = '<span class="label-icon">🔢</span> 바코드 데이터';
            els.inputData.placeholder = '예: 130296';
            els.inputDesc.parentElement.style.display = '';
            els.multiDataLabel.innerHTML = '<span class="label-icon">🔢</span> 바코드 데이터';
            els.multiData.placeholder = '예: 130296';
            els.multiDesc.parentElement.style.display = '';
            if (els.dataHint) els.dataHint.textContent = BARCODE_TYPE_CONFIG[els.barcodeType.value].hint;
        } else {
            els.modeText.classList.add('active');
            els.modeBarcode.classList.remove('active');
            els.barcodeTypeGroup.style.display = 'none';
            els.inputDataLabel.innerHTML = '<span class="label-icon">📝</span> 출력할 텍스트';
            els.inputData.placeholder = '예: 홍길동';
            els.inputDesc.parentElement.style.display = 'none';
            els.multiDataLabel.innerHTML = '<span class="label-icon">📝</span> 출력할 텍스트';
            els.multiData.placeholder = '예: 홍길동';
            els.multiDesc.parentElement.style.display = 'none';
            if (els.dataHint) els.dataHint.textContent = '라벨에 출력될 텍스트';
        }
    }

    // ==========================================
    // Input Method: Single / Multi(Add)
    // ==========================================
    function setInputMethod(method) {
        inputMethod = method;
        if (method === 'single') {
            els.inputSingle.classList.add('active');
            els.inputMulti.classList.remove('active');
            els.singleFields.style.display = '';
            els.multiFields.style.display = 'none';
        } else {
            els.inputMulti.classList.add('active');
            els.inputSingle.classList.remove('active');
            els.singleFields.style.display = 'none';
            els.multiFields.style.display = '';
        }
    }

    // ==========================================
    // Multi-Add: Manage Items
    // ==========================================
    function addItem() {
        var data = els.multiData.value.trim();
        if (!data) { showToast('데이터를 입력하세요', 'error'); return; }

        if (outputMode === 'barcode') {
            var config = BARCODE_TYPE_CONFIG[els.barcodeType.value];
            if (!config.validate(data)) {
                showToast('올바른 형식이 아닙니다: ' + config.hint, 'error');
                return;
            }
        }

        var desc = els.multiDesc.value.trim();
        var qty = Math.max(1, parseInt(els.multiQty.value) || 1);

        multiItems.push({ data: data, desc: desc, qty: qty });

        // Clear inputs
        els.multiData.value = '';
        els.multiDesc.value = '';
        els.multiQty.value = '1';
        els.multiData.focus();

        renderAddedList();
        renderPreview();
        showToast(data + ' 추가됨 (' + qty + '장)', 'success');
    }

    function removeItem(index) {
        multiItems.splice(index, 1);
        renderAddedList();
        renderPreview();
    }

    function renderAddedList() {
        // Remove all except the empty message
        var items = els.addedList.querySelectorAll('.added-item');
        items.forEach(function(el) { el.remove(); });

        if (multiItems.length === 0) {
            els.addedEmpty.style.display = '';
            return;
        }
        els.addedEmpty.style.display = 'none';

        multiItems.forEach(function(item, i) {
            var div = document.createElement('div');
            div.className = 'added-item';

            var info = document.createElement('div');
            info.className = 'added-item-info';

            var dataSpan = document.createElement('div');
            dataSpan.className = 'added-item-data';
            dataSpan.textContent = item.data;
            info.appendChild(dataSpan);

            if (item.desc) {
                var descSpan = document.createElement('div');
                descSpan.className = 'added-item-desc';
                descSpan.textContent = item.desc;
                info.appendChild(descSpan);
            }
            div.appendChild(info);

            if (item.qty > 1) {
                var qtySpan = document.createElement('span');
                qtySpan.className = 'added-item-qty';
                qtySpan.textContent = '×' + item.qty;
                div.appendChild(qtySpan);
            }

            var delBtn = document.createElement('button');
            delBtn.className = 'added-item-del';
            delBtn.textContent = '✕';
            delBtn.setAttribute('data-index', i);
            delBtn.addEventListener('click', function() { removeItem(i); });
            div.appendChild(delBtn);

            els.addedList.appendChild(div);
        });
    }

    // ==========================================
    // Build Labels Array
    // ==========================================
    function getLabels() {
        if (inputMethod === 'single') {
            var data = els.inputData.value.trim();
            if (!data) { showToast('데이터를 입력하세요', 'error'); return null; }

            if (outputMode === 'barcode') {
                var config = BARCODE_TYPE_CONFIG[els.barcodeType.value];
                if (!config.validate(data)) {
                    showToast('올바른 형식이 아닙니다: ' + config.hint, 'error');
                    return null;
                }
            }

            var desc = els.inputDesc.value.trim();
            var qty = Math.max(1, parseInt(els.quantity.value) || 1);
            var labels = [];
            for (var i = 0; i < qty; i++) {
                labels.push({ data: data, desc: desc });
            }
            return labels;
        } else {
            // Multi mode - expand items by qty
            if (multiItems.length === 0) { showToast('항목을 추가하세요', 'error'); return null; }
            var labels = [];
            multiItems.forEach(function(item) {
                for (var i = 0; i < item.qty; i++) {
                    labels.push({ data: item.data, desc: item.desc });
                }
            });
            return labels;
        }
    }

    // ==========================================
    // Barcode Rendering
    // ==========================================
    function renderBarcode(canvas, barcodeData, paperW, paperH) {
        var config = BARCODE_TYPE_CONFIG[els.barcodeType.value];
        try {
            bwipjs.toCanvas(canvas, {
                bcid: config.bcid,
                text: barcodeData,
                includetext: false,
                scale: 3,
                width: paperW * 0.95,
                height: paperH * 0.40,
            });
            return true;
        } catch (e) {
            console.error('Barcode error:', e);
            return false;
        }
    }

    function renderBarcodeHighRes(barcodeData, paperW, paperH) {
        var config = BARCODE_TYPE_CONFIG[els.barcodeType.value];
        var canvas = document.createElement('canvas');
        bwipjs.toCanvas(canvas, {
            bcid: config.bcid,
            text: barcodeData,
            includetext: false,
            scale: 4,
            width: paperW * 0.95,
            height: paperH * 0.40,
        });
        return canvas;
    }

    // ==========================================
    // Preview Rendering
    // ==========================================
    function renderPreview() {
        var labels;

        if (inputMethod === 'multi') {
            // In multi mode, build from multiItems directly
            if (multiItems.length === 0) {
                els.previewPlaceholder.style.display = '';
                els.rollPreview.style.display = 'none';
                els.layoutInfo.textContent = '';
                return;
            }
            labels = [];
            multiItems.forEach(function(item) {
                for (var i = 0; i < item.qty; i++) {
                    labels.push({ data: item.data, desc: item.desc });
                }
            });
        } else {
            labels = getLabels();
            if (!labels) return;
        }

        showPreviewLabels(labels);
    }

    function showPreviewLabels(labels) {
        var paperW = parseFloat(els.paperWidth.value);
        var paperH = parseFloat(els.paperHeight.value);

        var previewLabels = labels.slice(0, 30);
        var hasMore = labels.length > 30;

        els.previewPlaceholder.style.display = 'none';
        els.rollPreview.style.display = 'flex';
        els.rollPreview.innerHTML = '';

        // Calculate display size
        var containerWidth = els.rollPreview.parentElement.clientWidth - 40;
        var displayWidth = Math.min(containerWidth * 0.85, 400);
        var displayHeight = displayWidth * (paperH / paperW);

        previewLabels.forEach(function(label, idx) {
            if (idx > 0) {
                var connector = document.createElement('div');
                connector.className = 'roll-connector';
                els.rollPreview.appendChild(connector);
            }

            var card = document.createElement('div');
            card.className = 'label-card';
            card.style.width = displayWidth + 'px';
            card.style.height = displayHeight + 'px';
            card.style.padding = '3px 4px';

            if (outputMode === 'barcode') {
                // Barcode mode: barcode + barcode number + description
                var barcodeArea = document.createElement('div');
                barcodeArea.className = 'label-barcode-area';
                var barcodeCanvas = document.createElement('canvas');
                var ok = renderBarcode(barcodeCanvas, label.data, paperW, paperH);
                if (!ok) {
                    var errSpan = document.createElement('span');
                    errSpan.textContent = '바코드 생성 실패';
                    errSpan.style.cssText = 'color:red;font-size:12px;';
                    barcodeArea.appendChild(errSpan);
                } else {
                    barcodeArea.appendChild(barcodeCanvas);
                }
                card.appendChild(barcodeArea);

                // Barcode number (always shown)
                var numDiv = document.createElement('div');
                numDiv.className = 'label-barcode-number';
                numDiv.textContent = label.data;
                card.appendChild(numDiv);

                if (label.desc) {
                    var descDiv = document.createElement('div');
                    descDiv.className = 'label-description';
                    descDiv.textContent = label.desc;
                    card.appendChild(descDiv);
                }
            } else {
                // Text mode: centered text
                var textArea = document.createElement('div');
                textArea.className = 'label-text-content';
                var txtSpan = document.createElement('span');
                // Auto-size font based on label
                var fontSize = Math.min(displayWidth / (label.data.length * 0.7 + 1), displayHeight * 0.35);
                txtSpan.style.fontSize = Math.max(fontSize, 12) + 'px';
                txtSpan.textContent = label.data;
                textArea.appendChild(txtSpan);
                card.appendChild(textArea);

                if (label.desc) {
                    var descDiv = document.createElement('div');
                    descDiv.className = 'label-description';
                    descDiv.textContent = label.desc;
                    card.appendChild(descDiv);
                }
            }

            els.rollPreview.appendChild(card);
        });

        if (hasMore) {
            var moreDiv = document.createElement('div');
            moreDiv.style.cssText = 'color:#64748b;font-size:.8rem;padding:12px;text-align:center;';
            moreDiv.textContent = '... 외 ' + (labels.length - 30) + '장 더 (총 ' + labels.length + '장)';
            els.rollPreview.appendChild(moreDiv);
        }

        els.layoutInfo.textContent = '총 ' + labels.length + '장 | ' + paperW + '×' + paperH + 'mm';
    }

    // ==========================================
    // PDF Generation
    // ==========================================
    function generatePDF() {
        var labels = getLabels();
        if (!labels) return;

        els.btnPrint.classList.add('loading');

        setTimeout(function() {
            try {
                buildPDF(labels);
            } catch (e) {
                console.error('PDF error:', e);
                showToast('PDF 생성 실패: ' + e.message, 'error');
                els.btnPrint.classList.remove('loading');
            }
        }, 100);
    }

    function buildPDF(labels) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            showToast('PDF 라이브러리 로드 실패. 페이지를 새로고침(Ctrl+Shift+R)하세요.', 'error');
            return;
        }
        var jsPDF = window.jspdf.jsPDF;
        var paperW = parseFloat(els.paperWidth.value);
        var paperH = parseFloat(els.paperHeight.value);

        var pdf = new jsPDF({
            orientation: paperW > paperH ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [paperW, paperH],
        });

        labels.forEach(function(label, idx) {
            if (idx > 0) pdf.addPage([paperW, paperH]);

            if (outputMode === 'barcode') {
                // --- Barcode mode: minimal margin, fill the label ---
                var padX = paperW * 0.03;
                var padY = paperH * 0.04;

                var barcodeCanvas = renderBarcodeHighRes(label.data, paperW, paperH);
                var barcodeDataUrl = barcodeCanvas.toDataURL('image/png');
                var barcodeAspect = barcodeCanvas.width / barcodeCanvas.height;

                // Reserve space for barcode number + optional description
                var numFontSize = Math.min(paperH * 0.13, 8);
                var descFontSize = Math.min(paperH * 0.11, 7);
                var textGap = paperH * 0.05;
                var bottomReserve = textGap + numFontSize * 0.5 + (label.desc ? descFontSize * 0.6 : 0) + paperH * 0.04;

                var maxW = paperW - 2 * padX;
                var maxH = paperH - 2 * padY - bottomReserve;
                var drawW, drawH;
                if (maxW / maxH > barcodeAspect) {
                    drawH = maxH;
                    drawW = drawH * barcodeAspect;
                } else {
                    drawW = maxW;
                    drawH = drawW / barcodeAspect;
                }

                var barcodeX = (paperW - drawW) / 2;
                var barcodeY = padY;

                pdf.addImage(barcodeDataUrl, 'PNG', barcodeX, barcodeY, drawW, drawH);

                // Barcode number (always shown below barcode)
                var numY = barcodeY + drawH + textGap + numFontSize * 0.35;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(numFontSize);
                pdf.setTextColor(68, 68, 68);
                var numWidth = pdf.getTextWidth(label.data);
                pdf.text(label.data, (paperW - numWidth) / 2, numY);

                // Description (below barcode number)
                if (label.desc) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(descFontSize);
                    pdf.setTextColor(51, 51, 51);
                    var descWidth = pdf.getTextWidth(label.desc);
                    var descY = numY + descFontSize * 0.55;
                    pdf.text(label.desc, (paperW - descWidth) / 2, descY);
                }

            } else {
                // --- Text mode ---
                var text = label.data;
                // Auto font size: fill the label
                var fontSize = Math.min(paperW / (text.length * 0.6 + 0.5), paperH * 0.5, 40);
                fontSize = Math.max(fontSize, 6);

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(fontSize);
                pdf.setTextColor(17, 17, 17);
                var tw = pdf.getTextWidth(text);
                var tx = (paperW - tw) / 2;
                var ty = paperH / 2 + fontSize * 0.12;
                pdf.text(text, tx, ty);
            }
        });

        var timestamp = new Date().toISOString().slice(0, 10);
        var firstData = labels[0].data;
        var filename = (outputMode === 'barcode' ? 'barcode_' : 'label_') + firstData + '_' + paperW + 'x' + paperH + 'mm_' + labels.length + 'pcs_' + timestamp + '.pdf';

        var pdfBlob = pdf.output('blob');

        // Use File System Access API for reliable filename (Edge/Chrome)
        savePdfFile(pdfBlob, filename, labels.length);
    }

    function savePdfFile(blob, filename, labelCount) {
        // Method 1: File System Access API — native save dialog with correct filename
        if (window.showSaveFilePicker) {
            window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'PDF 문서',
                    accept: { 'application/pdf': ['.pdf'] }
                }]
            }).then(function(handle) {
                return handle.createWritable().then(function(writable) {
                    return writable.write(blob).then(function() {
                        return writable.close();
                    });
                });
            }).then(function() {
                showToast('PDF 저장 완료! (' + labelCount + '장)', 'success');
            }).catch(function(e) {
                if (e.name === 'AbortError') {
                    showToast('저장이 취소되었습니다', 'info');
                } else {
                    console.warn('showSaveFilePicker failed, using fallback:', e);
                    fallbackDownload(blob, filename, labelCount);
                }
            }).finally(function() {
                els.btnPrint.classList.remove('loading');
            });
            return;
        }

        // Method 2: Fallback for browsers without File System Access API
        fallbackDownload(blob, filename, labelCount);
        els.btnPrint.classList.remove('loading');
    }

    function fallbackDownload(blob, filename, labelCount) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
        showToast('PDF 저장 완료! (' + labelCount + '장)', 'success');
    }

    // ==========================================
    // Event Listeners
    // ==========================================
    function init() {
        // Output mode toggle
        els.modeBarcode.addEventListener('click', function() { setOutputMode('barcode'); });
        els.modeText.addEventListener('click', function() { setOutputMode('text'); });

        // Input method toggle
        els.inputSingle.addEventListener('click', function() { setInputMethod('single'); });
        els.inputMulti.addEventListener('click', function() { setInputMethod('multi'); });

        // Barcode type change
        els.barcodeType.addEventListener('change', function() {
            var config = BARCODE_TYPE_CONFIG[els.barcodeType.value];
            if (els.dataHint) els.dataHint.textContent = config.hint;
        });

        // Presets
        document.querySelectorAll('.chip').forEach(function(chip) {
            chip.addEventListener('click', function() {
                els.paperWidth.value = chip.dataset.w;
                els.paperHeight.value = chip.dataset.h;
                document.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('active'); });
                chip.classList.add('active');
            });
        });

        // Quantity (single)
        els.qtyMinus.addEventListener('click', function() {
            var v = parseInt(els.quantity.value);
            if (v > 1) els.quantity.value = v - 1;
        });
        els.qtyPlus.addEventListener('click', function() {
            var v = parseInt(els.quantity.value);
            if (v < 500) els.quantity.value = v + 1;
        });

        // Quantity (multi)
        els.multiQtyMinus.addEventListener('click', function() {
            var v = parseInt(els.multiQty.value);
            if (v > 1) els.multiQty.value = v - 1;
        });
        els.multiQtyPlus.addEventListener('click', function() {
            var v = parseInt(els.multiQty.value);
            if (v < 100) els.multiQty.value = v + 1;
        });

        // Add button (multi mode)
        els.btnAdd.addEventListener('click', addItem);
        els.multiData.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); addItem(); }
        });

        // Preview / Print
        els.btnPreview.addEventListener('click', renderPreview);
        els.btnPrint.addEventListener('click', generatePDF);

        // Enter → Preview (single mode)
        els.inputData.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); renderPreview(); }
        });

        // Init hint
        if (els.dataHint) els.dataHint.textContent = BARCODE_TYPE_CONFIG[els.barcodeType.value].hint;

        console.log('BarcodePrint v3 initialized 🚀');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();
})();
