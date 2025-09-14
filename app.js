// app.js - 이미지를 PDF로 변환하는 웹앱

// 전역 변수
let selectedImages = [];
let pdfLibLoaded = false;

// DOM 요소들
const elements = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    optionsSection: document.getElementById('optionsSection'),
    previewSection: document.getElementById('previewSection'),
    convertSection: document.getElementById('convertSection'),
    imageGrid: document.getElementById('imageGrid'),
    imageCount: document.getElementById('imageCount'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    convertBtn: document.getElementById('convertBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    downloadContainer: document.getElementById('downloadContainer'),
    downloadLink: document.getElementById('downloadLink'),
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    errorModalClose: document.getElementById('errorModalClose'),
    pageSize: document.getElementById('pageSize'),
    customSizeGroup: document.getElementById('customSizeGroup'),
    customWidth: document.getElementById('customWidth'),
    customHeight: document.getElementById('customHeight'),
    orientation: document.getElementById('orientation'),
    imageFit: document.getElementById('imageFit'),
    imageQuality: document.getElementById('imageQuality'),
    qualityValue: document.getElementById('qualityValue'),
    fileName: document.getElementById('fileName')
};

// 페이지 크기 상수 (포인트 단위)
const PAGE_SIZES = {
    A4: { width: 595, height: 842 },
    Letter: { width: 612, height: 792 }
};

// 초기화
function init() {
    console.log('앱 초기화 중...');

    // PDF-lib 라이브러리 확인
    if (typeof PDFLib !== 'undefined') {
        pdfLibLoaded = true;
        console.log('PDF-lib 라이브러리 로드 완료');
    } else {
        console.error('PDF-lib 라이브러리를 찾을 수 없습니다');
        showError('라이브러리 오류', 'PDF 변환 라이브러리를 로드할 수 없습니다. 페이지를 새로고침해 주세요.');
    }

    setupEventListeners();
    updateQualityDisplay();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 파일 업로드
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);

    // 설정 변경
    elements.pageSize.addEventListener('change', handlePageSizeChange);
    elements.imageQuality.addEventListener('input', updateQualityDisplay);

    // 버튼 클릭
    elements.clearAllBtn.addEventListener('click', clearAllImages);
    elements.convertBtn.addEventListener('click', convertToPDF);
    elements.errorModalClose.addEventListener('click', hideError);

    // 모달 닫기
    elements.errorModal.addEventListener('click', (e) => {
        if (e.target === elements.errorModal) hideError();
    });
}

// 드래그 앤 드롭 이벤트
function handleDragOver(e) {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = '';
}

// 파일 처리
function processFiles(files) {
    const imageFiles = files.filter(file =>
        file.type.match(/^image\/(jpeg|jpg|png)$/i)
    );

    if (imageFiles.length === 0) {
        showError('파일 오류', 'JPG, JPEG, PNG 파일만 지원됩니다.');
        return;
    }

    // 파일 크기 체크 (20MB)
    const oversizedFiles = imageFiles.filter(file => file.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
        showError('파일 크기 오류', '파일 크기는 20MB 이하여야 합니다.');
        return;
    }

    // 최대 50개 체크
    if (selectedImages.length + imageFiles.length > 50) {
        showError('파일 수 오류', '최대 50개 파일까지 업로드할 수 있습니다.');
        return;
    }

    // 이미지 배열에 추가
    imageFiles.forEach(file => {
        const imageData = {
            file: file,
            id: Date.now() + Math.random(),
            name: file.name,
            size: formatFileSize(file.size),
            url: URL.createObjectURL(file)
        };
        selectedImages.push(imageData);
    });

    updateUI();
}

// UI 업데이트
function updateUI() {
    const hasImages = selectedImages.length > 0;

    elements.optionsSection.style.display = hasImages ? 'block' : 'none';
    elements.previewSection.style.display = hasImages ? 'block' : 'none';
    elements.convertSection.style.display = hasImages ? 'block' : 'none';

    elements.imageCount.textContent = selectedImages.length;

    renderImageGrid();

    elements.convertBtn.disabled = !hasImages || !pdfLibLoaded;
}

// 이미지 그리드 렌더링
function renderImageGrid() {
    elements.imageGrid.innerHTML = '';

    selectedImages.forEach((imageData, index) => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
            <img src="${imageData.url}" alt="${imageData.name}" class="image-preview">
            <div class="image-info">
                <div class="image-name" title="${imageData.name}">${imageData.name}</div>
                <div class="image-size">${imageData.size}</div>
            </div>
            <button class="remove-image" onclick="removeImage(${index})">×</button>
        `;
        elements.imageGrid.appendChild(card);
    });
}

// 이미지 제거
function removeImage(index) {
    URL.revokeObjectURL(selectedImages[index].url);
    selectedImages.splice(index, 1);
    updateUI();
}

// 모든 이미지 제거
function clearAllImages() {
    if (selectedImages.length === 0) return;

    if (confirm('모든 이미지를 제거하시겠습니까?')) {
        selectedImages.forEach(img => URL.revokeObjectURL(img.url));
        selectedImages = [];
        updateUI();
        elements.downloadContainer.style.display = 'none';
    }
}

// 페이지 크기 변경
function handlePageSizeChange() {
    const isCustom = elements.pageSize.value === 'Custom';
    elements.customSizeGroup.style.display = isCustom ? 'block' : 'none';
}

// 품질 표시 업데이트
function updateQualityDisplay() {
    elements.qualityValue.textContent = elements.imageQuality.value + '%';
}

// PDF 변환 메인 함수
async function convertToPDF() {
    if (!pdfLibLoaded) {
        showError('라이브러리 오류', 'PDF 라이브러리가 로드되지 않았습니다.');
        return;
    }

    if (selectedImages.length === 0) {
        showError('이미지 없음', '변환할 이미지를 선택해 주세요.');
        return;
    }

    try {
        // UI 상태 변경
        elements.convertBtn.disabled = true;
        elements.progressContainer.style.display = 'block';
        elements.downloadContainer.style.display = 'none';

        updateProgress(0, 'PDF 문서 생성 중...');

        // PDF 문서 생성
        const pdfDoc = await PDFLib.PDFDocument.create();

        // 설정 가져오기
        const settings = getPDFSettings();

        updateProgress(10, '이미지 처리 시작...');

        // 각 이미지를 페이지로 추가
        for (let i = 0; i < selectedImages.length; i++) {
            const imageData = selectedImages[i];
            const progress = 10 + ((i + 1) / selectedImages.length) * 70;

            updateProgress(progress, `이미지 ${i + 1}/${selectedImages.length} 처리 중...`);

            await addImageToPage(pdfDoc, imageData, settings);
        }

        updateProgress(85, 'PDF 파일 생성 중...');

        // PDF 저장
        const pdfBytes = await pdfDoc.save();

        updateProgress(95, '다운로드 준비 중...');

        // 다운로드 링크 생성
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const fileName = elements.fileName.value.trim() || 'converted-images';
        const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

        elements.downloadLink.href = url;
        elements.downloadLink.download = finalFileName;
        elements.downloadLink.textContent = `${finalFileName} 다운로드`;

        updateProgress(100, '변환 완료!');

        // UI 업데이트 및 자동 다운로드
        setTimeout(() => {
            elements.progressContainer.style.display = 'none';
            elements.downloadContainer.style.display = 'block';
            elements.convertBtn.disabled = false;
            elements.downloadLink.click();
        }, 500);

    } catch (error) {
        console.error('PDF 변환 오류:', error);
        showError('변환 실패', `PDF 변환 중 오류가 발생했습니다: ${error.message}`);

        elements.progressContainer.style.display = 'none';
        elements.convertBtn.disabled = false;
    }
}

// PDF 설정 가져오기
function getPDFSettings() {
    const pageSize = elements.pageSize.value;
    const orientation = elements.orientation.value;
    const imageFit = elements.imageFit.value;
    const quality = parseInt(elements.imageQuality.value) / 100;

    let pageDimensions;
    if (pageSize === 'Custom') {
        const width = parseFloat(elements.customWidth.value) || 210;
        const height = parseFloat(elements.customHeight.value) || 297;
        pageDimensions = {
            width: width * 2.834645669, // mm to points
            height: height * 2.834645669
        };
    } else {
        pageDimensions = { ...PAGE_SIZES[pageSize] };
    }

    if (orientation === 'landscape') {
        [pageDimensions.width, pageDimensions.height] = [pageDimensions.height, pageDimensions.width];
    }

    return { pageDimensions, imageFit, quality };
}

// 이미지를 PDF 페이지에 추가
async function addImageToPage(pdfDoc, imageData, settings) {
    try {
        // 이미지 파일을 ArrayBuffer로 변환
        const arrayBuffer = await imageData.file.arrayBuffer();

        // PDF 이미지 임베드
        let pdfImage;
        if (imageData.file.type.includes('png')) {
            pdfImage = await pdfDoc.embedPng(arrayBuffer);
        } else {
            // JPEG 품질 적용을 위해 캔버스 사용
            const compressedBuffer = await compressImage(imageData.file, settings.quality);
            pdfImage = await pdfDoc.embedJpg(compressedBuffer);
        }

        // 페이지 추가
        const page = pdfDoc.addPage([settings.pageDimensions.width, settings.pageDimensions.height]);

        // 이미지 크기 계산
        const imageDimensions = pdfImage.scale(1);
        const pageWidth = settings.pageDimensions.width;
        const pageHeight = settings.pageDimensions.height;

        let drawWidth, drawHeight, x, y;

        if (settings.imageFit === 'contain') {
            // 비율 유지하며 페이지에 맞춤
            const scaleX = pageWidth / imageDimensions.width;
            const scaleY = pageHeight / imageDimensions.height;
            const scale = Math.min(scaleX, scaleY);

            drawWidth = imageDimensions.width * scale;
            drawHeight = imageDimensions.height * scale;

            x = (pageWidth - drawWidth) / 2;
            y = (pageHeight - drawHeight) / 2;
        } else {
            // 페이지 채우기
            const scaleX = pageWidth / imageDimensions.width;
            const scaleY = pageHeight / imageDimensions.height;
            const scale = Math.max(scaleX, scaleY);

            drawWidth = imageDimensions.width * scale;
            drawHeight = imageDimensions.height * scale;

            x = (pageWidth - drawWidth) / 2;
            y = (pageHeight - drawHeight) / 2;
        }

        // 이미지 그리기
        page.drawImage(pdfImage, {
            x: x,
            y: y,
            width: drawWidth,
            height: drawHeight
        });

    } catch (error) {
        console.error('이미지 처리 오류:', error);
        throw new Error(`이미지 "${imageData.name}" 처리 중 오류: ${error.message}`);
    }
}

// 이미지 압축
async function compressImage(file, quality) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) {
                    blob.arrayBuffer().then(resolve);
                } else {
                    reject(new Error('이미지 압축 실패'));
                }
            }, 'image/jpeg', quality);
        };

        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = URL.createObjectURL(file);
    });
}

// 진행 상태 업데이트
function updateProgress(percentage, text) {
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = text;
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 오류 표시
function showError(title, message) {
    document.getElementById('errorTitle').textContent = title;
    elements.errorMessage.textContent = message;
    elements.errorModal.style.display = 'flex';
    elements.errorModalClose.focus();
}

// 오류 숨김
function hideError() {
    elements.errorModal.style.display = 'none';
}

// 전역 함수 노출
window.removeImage = removeImage;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);

// 메모리 정리
window.addEventListener('beforeunload', () => {
    selectedImages.forEach(img => {
        if (img.url) URL.revokeObjectURL(img.url);
    });

    if (elements.downloadLink.href.startsWith('blob:')) {
        URL.revokeObjectURL(elements.downloadLink.href);
    }
});