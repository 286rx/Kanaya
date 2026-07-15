/* ============================================
   KANAYA SHAFA AULIA — PHOTO ALBUM
   App Logic: Upload, Gallery, Lightbox, Storage
   ============================================ */

(function () {
    'use strict';

    // --- Constants ---
    const STORAGE_KEY = 'kanaya_album_photos';
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per image
    const HEARTS = ['💕', '💗', '💖', '💝', '🌸', '✨', '🩷', '♥'];

    // ============================================
    // 📸 HARDCODED PHOTOS CONFIG
    // Tambah foto lo di sini! Format:
    //   { file: 'nama_file.jpg', caption: 'Caption nya' }
    // Simpan file foto di folder photos/
    // ============================================
    const PRELOADED_PHOTOS = [
        { file: 'foto1.jpg', caption: 'KAKI SIAPA INI NYAKKK' },
        { file: 'foto2.jpg', caption: 'INI PULANG DARI BAKMIE YANG AKU JEMPUT KAMU PAS BUKBERRR' },
        { file: 'foto3.jpg', caption: 'INI DI TEMPAT BIASA KITA GYMNASSS, LOVE GYMNASS' },
        { file: 'foto4.jpg', caption: 'HAPPY VALENTINE!!!! DAN DI SINI AKU JD KETAGIHAN WINGS O WING WKWKWKWK' },
        { file: 'foto5.jpg', caption: 'LAHHHH YANG ABIS BERANTEM YAKK' },
        { file: 'foto6.jpg', caption: 'NAHHH INI DEH PAS AKU JUARAAA' },
        { file: 'foto7.jpg', caption: 'JUJURRR INI PAS APA YAAA, INI YANG PAS AKU JUARA ATAU BUKAN YAKKK' },
        { file: 'foto8.jpg', caption: 'AKU NYAMPERIN KAMUU LG NUGASSS SETALAH AKU SUPPORTERANN' },
        { file: 'foto9.jpg', caption: 'INI DI ISHOLA YANG DIUSIR SATPAM WKWKWKWK' },
        { file: 'foto10.jpg', caption: 'ini cafe di duta setelah kita berantem lama heheheh yang kamu ninggalin itu ke bandung sama tangerang' },
        { file: 'foto11.jpg', caption: 'JUJURRR DI SINI AKU DEG DEG AN BGT DISENDERIN KAMU AFOAEOAHDW' },
        { file: 'foto12.jpg', caption: 'FOTOBOOTH PERTAMA KITAAA' },
        { file: 'foto13.jpg', caption: 'iniii pas kemarinn kemarinnn lucu bgt yak kita' },
        { file: 'foto14.jpg', caption: 'hmm hari apa yak ini wkwkwk setelah ini ada something lah kita awlkaowak tp jujur ini kamu cantik bangett' },
        { file: 'foto15.jpg', caption: 'ini pertama kali kita mainn tauu walaupun aku kedoknya belajar wkwkwk' },
    ];

    // --- State ---
    let photos = [];
    let currentLightboxIndex = -1;
    let currentEditId = null;
    let currentDeleteId = null;
    let currentView = 'grid';

    // --- DOM Elements ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const heartsContainer = $('#heartsContainer');
    const btnScroll = $('#btnScroll');
    const uploadZone = $('#uploadZone');
    const fileInput = $('#fileInput');
    const galleryGrid = $('#galleryGrid');
    const emptyState = $('#emptyState');
    const photoCount = $('#photoCount');
    const lightbox = $('#lightbox');
    const lightboxImage = $('#lightboxImage');
    const lightboxCaption = $('#lightboxCaption');
    const lightboxClose = $('#lightboxClose');
    const lightboxOverlay = $('#lightboxOverlay');
    const lightboxPrev = $('#lightboxPrev');
    const lightboxNext = $('#lightboxNext');
    const captionModal = $('#captionModal');
    const captionInput = $('#captionInput');
    const captionSave = $('#captionSave');
    const captionCancel = $('#captionCancel');
    const deleteModal = $('#deleteModal');
    const deleteConfirm = $('#deleteConfirm');
    const deleteCancel = $('#deleteCancel');
    const btnGrid = $('#btnGrid');
    const btnMasonry = $('#btnMasonry');

    // ============================================
    // FLOATING HEARTS
    // ============================================
    function createFloatingHeart() {
        const heart = document.createElement('span');
        heart.className = 'floating-heart';
        heart.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
        heart.style.left = Math.random() * 100 + '%';
        heart.style.fontSize = (12 + Math.random() * 14) + 'px';
        heart.style.animationDuration = (8 + Math.random() * 12) + 's';
        heart.style.animationDelay = Math.random() * 5 + 's';
        heartsContainer.appendChild(heart);

        setTimeout(() => {
            heart.remove();
        }, 25000);
    }

    function startHearts() {
        for (let i = 0; i < 8; i++) {
            setTimeout(createFloatingHeart, i * 600);
        }
        setInterval(createFloatingHeart, 3000);
    }

    // ============================================
    // LOCAL STORAGE + PRELOADED PHOTOS
    // ============================================
    function getPreloadedPhotos() {
        return PRELOADED_PHOTOS.map((p, i) => ({
            id: 'preloaded_' + i,
            src: 'photos/' + p.file,
            caption: p.caption || '',
            date: p.date || '',
            timestamp: i,
            preloaded: true
        }));
    }

    function loadPhotos() {
        // Load user-uploaded photos from localStorage
        let userPhotos = [];
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            userPhotos = data ? JSON.parse(data) : [];
        } catch {
            userPhotos = [];
        }

        // Combine: preloaded first, then user-uploaded
        const preloaded = getPreloadedPhotos();
        photos = [...preloaded, ...userPhotos];
    }

    function savePhotos() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
        } catch (e) {
            showToast('⚠️ Storage penuh! Coba hapus beberapa foto.');
        }
    }

    // ============================================
    // TOAST NOTIFICATION
    // ============================================
    function showToast(message, duration = 3000) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // ============================================
    // FILE HANDLING
    // ============================================
    function handleFiles(files) {
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));

        if (fileArray.length === 0) {
            showToast('❌ File bukan gambar!');
            return;
        }

        let loaded = 0;
        const total = fileArray.length;
        showToast(`📸 Uploading ${total} foto...`);

        fileArray.forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                showToast(`⚠️ ${file.name} terlalu besar (max 10MB)`);
                loaded++;
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                // Compress image before storing
                compressImage(e.target.result, 1200, 0.8, (compressed) => {
                    const photo = {
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                        src: compressed,
                        caption: '',
                        date: new Date().toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        }),
                        timestamp: Date.now()
                    };

                    photos.unshift(photo);
                    loaded++;

                    if (loaded === total) {
                        savePhotos();
                        renderGallery();
                        showToast(`💕 ${total} foto berhasil diupload!`);
                    }
                });
            };
            reader.readAsDataURL(file);
        });
    }

    function compressImage(dataUrl, maxWidth, quality, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;

            if (w > maxWidth) {
                h = (h * maxWidth) / w;
                w = maxWidth;
            }

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            callback(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
    }

    // ============================================
    // GALLERY RENDERING
    // ============================================
    function renderGallery() {
        galleryGrid.innerHTML = '';

        if (photos.length === 0) {
            emptyState.classList.add('visible');
            photoCount.textContent = 'Belum ada foto — yuk upload kenangan pertama!';
            return;
        }

        emptyState.classList.remove('visible');
        photoCount.textContent = `${photos.length} kenangan indah tersimpan 💕`;

        photos.forEach((photo, index) => {
            const card = createPhotoCard(photo, index);
            galleryGrid.appendChild(card);
        });
    }

    function createPhotoCard(photo, index) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.style.animationDelay = `${index * 0.08}s`;

        const hasCaption = photo.caption && photo.caption.trim().length > 0;

        card.innerHTML = `
            <div class="photo-card-image-wrapper" data-index="${index}">
                <img class="photo-card-image" src="${photo.src}" alt="${photo.caption || 'Foto kenangan'}" loading="lazy">
                <div class="photo-card-overlay"></div>
                <div class="photo-card-actions">
                    <button class="card-action-btn edit-btn" data-id="${photo.id}" title="Edit caption">✏️</button>
                    <button class="card-action-btn delete-btn" data-id="${photo.id}" title="Hapus foto">🗑️</button>
                </div>
            </div>
            <div class="photo-card-body">
                <p class="photo-card-caption ${hasCaption ? '' : 'empty'}">${hasCaption ? photo.caption : 'Tap ✏️ untuk tambah caption...'}</p>
                <p class="photo-card-date">${photo.date}</p>
            </div>
        `;

        // Click image to open lightbox
        card.querySelector('.photo-card-image-wrapper').addEventListener('click', (e) => {
            if (e.target.closest('.card-action-btn')) return;
            openLightbox(index);
        });

        // Edit button
        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openCaptionModal(photo.id);
        });

        // Delete button
        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteModal(photo.id);
        });

        return card;
    }

    // ============================================
    // LIGHTBOX
    // ============================================
    function openLightbox(index) {
        currentLightboxIndex = index;
        updateLightbox();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        currentLightboxIndex = -1;
    }

    function updateLightbox() {
        if (currentLightboxIndex < 0 || currentLightboxIndex >= photos.length) return;
        const photo = photos[currentLightboxIndex];
        lightboxImage.src = photo.src;
        lightboxImage.alt = photo.caption || 'Foto kenangan';
        lightboxCaption.textContent = photo.caption || '';
    }

    function lightboxNavigate(direction) {
        currentLightboxIndex += direction;
        if (currentLightboxIndex < 0) currentLightboxIndex = photos.length - 1;
        if (currentLightboxIndex >= photos.length) currentLightboxIndex = 0;
        updateLightbox();
    }

    // ============================================
    // CAPTION MODAL
    // ============================================
    function openCaptionModal(photoId) {
        currentEditId = photoId;
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;
        captionInput.value = photo.caption || '';
        captionModal.classList.add('active');
        setTimeout(() => captionInput.focus(), 300);
    }

    function closeCaptionModal() {
        captionModal.classList.remove('active');
        currentEditId = null;
    }

    function saveCaptionModal() {
        if (!currentEditId) return;
        const photo = photos.find(p => p.id === currentEditId);
        if (!photo) return;
        photo.caption = captionInput.value.trim();
        savePhotos();
        renderGallery();
        closeCaptionModal();
        showToast('💕 Caption berhasil disimpan!');
    }

    // ============================================
    // DELETE MODAL
    // ============================================
    function openDeleteModal(photoId) {
        currentDeleteId = photoId;
        deleteModal.classList.add('active');
    }

    function closeDeleteModal() {
        deleteModal.classList.remove('active');
        currentDeleteId = null;
    }

    function confirmDelete() {
        if (!currentDeleteId) return;
        photos = photos.filter(p => p.id !== currentDeleteId);
        savePhotos();
        renderGallery();
        closeDeleteModal();

        if (lightbox.classList.contains('active')) {
            closeLightbox();
        }

        showToast('🗑️ Foto berhasil dihapus');
    }

    // ============================================
    // VIEW TOGGLE
    // ============================================
    function setView(view) {
        currentView = view;
        if (view === 'masonry') {
            galleryGrid.classList.add('masonry-view');
            btnMasonry.classList.add('active');
            btnGrid.classList.remove('active');
        } else {
            galleryGrid.classList.remove('masonry-view');
            btnGrid.classList.add('active');
            btnMasonry.classList.remove('active');
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    function initEvents() {
        // Scroll button
        btnScroll.addEventListener('click', () => {
            document.querySelector('.upload-section').scrollIntoView({ behavior: 'smooth' });
        });

        // Drag & Drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });

        // File input
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files);
                e.target.value = ''; // Reset
            }
        });

        // Lightbox controls
        lightboxClose.addEventListener('click', closeLightbox);
        lightboxOverlay.addEventListener('click', closeLightbox);
        lightboxPrev.addEventListener('click', () => lightboxNavigate(-1));
        lightboxNext.addEventListener('click', () => lightboxNavigate(1));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (lightbox.classList.contains('active')) {
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowLeft') lightboxNavigate(-1);
                if (e.key === 'ArrowRight') lightboxNavigate(1);
            }
            if (captionModal.classList.contains('active') && e.key === 'Escape') {
                closeCaptionModal();
            }
            if (deleteModal.classList.contains('active') && e.key === 'Escape') {
                closeDeleteModal();
            }
        });

        // Caption modal
        captionSave.addEventListener('click', saveCaptionModal);
        captionCancel.addEventListener('click', closeCaptionModal);

        // Delete modal
        deleteConfirm.addEventListener('click', confirmDelete);
        deleteCancel.addEventListener('click', closeDeleteModal);

        // View toggle
        btnGrid.addEventListener('click', () => setView('grid'));
        btnMasonry.addEventListener('click', () => setView('masonry'));

        // Intersection observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.section-header').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease-out';
            observer.observe(el);
        });
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        loadPhotos();
        renderGallery();
        initEvents();
        startHearts();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
