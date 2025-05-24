const uploadBtn = document.getElementById('uploadBtn');
const imageInput = document.getElementById('imageInput');
const initialSection = document.getElementById('initialSection');
const appSection = document.getElementById('appSection');
const loaderSection = document.getElementById('loaderSection');
const successSection = document.getElementById('successSection');
const imageList = document.getElementById('imageList');
const addMoreBtn = document.getElementById('addMoreBtn');
const optionsForm = document.getElementById('optionsForm');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const customSizeFields = document.getElementById('customSizeFields');
const pageSizeSelect = document.getElementById('pageSize');
const convertBtn = document.getElementById('convertBtn');

// Basic element checks
if (!uploadBtn || !imageInput || !initialSection || !appSection || !loaderSection || !successSection || !imageList || !addMoreBtn || !optionsForm || !downloadPdfBtn || !customSizeFields || !pageSizeSelect || !convertBtn) {
  console.error('One or more required DOM elements not found!');
  // Optionally, display a user-friendly error message or disable functionality
}

let uploadedImages = [];
let uploadedFilenames = [];
let draggingIndex = null;
let uploadInProgress = false;

function showInitial() {
  if (initialSection) initialSection.classList.remove('hidden');
  if (appSection) appSection.classList.add('hidden');
  if (loaderSection) loaderSection.classList.add('hidden');
  if (successSection) successSection.classList.add('hidden');
}
function showApp() {
  if (initialSection) initialSection.classList.add('hidden');
  if (appSection) appSection.classList.remove('hidden');
  if (loaderSection) loaderSection.classList.add('hidden');
  if (successSection) successSection.classList.add('hidden');
}
function showLoader() {
  if (initialSection) initialSection.classList.add('hidden');
  if (appSection) appSection.classList.add('hidden');
  if (loaderSection) loaderSection.classList.remove('hidden');
  if (successSection) successSection.classList.add('hidden');
}
function showSuccess(pdfUrl) {
  if (initialSection) initialSection.classList.add('hidden');
  if (appSection) appSection.classList.add('hidden');
  if (loaderSection) loaderSection.classList.add('hidden');
  if (successSection) successSection.classList.remove('hidden');
  if (downloadPdfBtn) downloadPdfBtn.href = pdfUrl;
}
function setConvertEnabled(enabled) {
  if (!convertBtn) return;
  if (enabled) {
    convertBtn.disabled = false;
    convertBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  } else {
    convertBtn.disabled = true;
    convertBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }
}
function renderThumbnails() {
  if (!imageList) return;
  imageList.innerHTML = '';
  uploadedImages.forEach((img, idx) => {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-2 bg-white rounded-xl shadow p-2 cursor-move group';
    li.draggable = true;
    li.dataset.idx = idx;
    // Drag events
    li.addEventListener('dragstart', e => {
      draggingIndex = idx;
      li.classList.add('opacity-50');
    });
    li.addEventListener('dragend', e => {
      draggingIndex = null;
      li.classList.remove('opacity-50');
    });
    li.addEventListener('dragover', e => {
      e.preventDefault();
      li.classList.add('ring-2', 'ring-[#009b6c]');
    });
    li.addEventListener('dragleave', e => {
      li.classList.remove('ring-2', 'ring-[#009b6c]');
    });
    li.addEventListener('drop', e => {
      e.preventDefault();
      li.classList.remove('ring-2', 'ring-[#009b6c]');
      if (draggingIndex !== null && draggingIndex !== idx) {
        const moved = uploadedImages.splice(draggingIndex, 1)[0];
        uploadedImages.splice(idx, 0, moved);
        const movedFile = uploadedFilenames.splice(draggingIndex, 1)[0];
        uploadedFilenames.splice(idx, 0, movedFile);
        renderThumbnails();
      }
    });
    // Thumbnail
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.className = 'w-14 h-14 object-cover rounded-lg border border-gray-200';
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '<svg class="w-5 h-5 text-red-500 group-hover:opacity-100 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    delBtn.className = 'ml-auto p-1 hover:bg-red-100 rounded';
    delBtn.onclick = () => {
      uploadedImages.splice(idx, 1);
      uploadedFilenames.splice(idx, 1);
      renderThumbnails();
      if (uploadedImages.length === 0) {
        showInitial();
      }
    };
    li.appendChild(thumb);
    li.appendChild(delBtn);
    imageList.appendChild(li);
  });
}
function handleFiles(files) {
  if (!files || files.length === 0) {
    alert('No files selected.');
    return;
  }
  if (files.length + uploadedImages.length > 10) {
    alert('Max 10 images allowed.');
    return;
  }
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    if (!['image/jpeg', 'image/png'].includes(files[i].type)) {
      alert('Only JPG and PNG allowed.');
      return;
    }
    formData.append('images', files[i]);
  }
  // Show app section immediately with previews
  uploadedImages = [];
  let loaded = 0;
  showApp(); // Show app section right away
  setConvertEnabled(false); // Disable convert button until upload is done

  for (let i = 0; i < files.length; i++) {
    const reader = new FileReader();
    reader.onload = e => {
      uploadedImages.push(e.target.result);
      loaded++;
      if (loaded === files.length) {
        renderThumbnails();
      }
    };
    reader.readAsDataURL(files[i]);
  }
  // Start upload in background
  uploadInProgress = true;
  fetch('/upload-images', {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showInitial();
        alert(data.error);
        return;
      }
      uploadedFilenames = data.filenames;
      uploadInProgress = false;
      setConvertEnabled(true);
    })
    .catch(() => {
      showInitial();
      alert('Upload failed.');
    });
}

if (uploadBtn && imageInput) {
  uploadBtn.onclick = () => imageInput.click();
  imageInput.onchange = e => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
      imageInput.value = '';
    }
  };
}

if (addMoreBtn && imageInput) {
  addMoreBtn.onclick = () => imageInput.click();
}

if (optionsForm) {
  optionsForm.onsubmit = e => {
    e.preventDefault();
    if (uploadInProgress) {
      alert('Please wait for images to finish uploading.');
      return;
    }
    if (uploadedFilenames.length === 0) {
      alert('No images uploaded.');
      return;
    }
    // Gather options
    const form = new FormData(optionsForm);
    const options = {
      orientation: form.get('orientation'),
      page_size: form.get('page_size'),
      margin: form.get('margin'),
    };
    if (options.page_size === 'Custom') {
      options.custom_width = form.get('custom_width');
      options.custom_height = form.get('custom_height');
      if (!options.custom_width || !options.custom_height) {
        alert('Enter custom width and height.');
        return;
      }
    }
    showLoader();
    fetch('/generate-pdf', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({filenames: uploadedFilenames, options})
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          showApp();
          alert(data.error);
          return;
        }
        setTimeout(() => {
          showSuccess(data.pdf_url);
        }, 1200); // Simulate processing for better UX
      })
      .catch(() => {
        showApp();
        alert('PDF generation failed.');
      });
  };
}

// Show/hide custom size fields
if (pageSizeSelect) {
  pageSizeSelect.onchange = e => {
    if (e.target.value === 'Custom') {
      if (customSizeFields) customSizeFields.classList.remove('hidden');
    } else {
      if (customSizeFields) customSizeFields.classList.add('hidden');
    }
  };
}

// Download PDF and reset app after download
if (downloadPdfBtn) {
  downloadPdfBtn.onclick = function(e) {
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  showInitial();
  renderThumbnails();
  setConvertEnabled(false);
}); 