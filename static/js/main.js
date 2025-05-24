const uploadBtn = document.getElementById('uploadBtn');
const imageInput = document.getElementById('imageInput');
const imageList = document.getElementById('imageList');
const addMoreBtn = document.getElementById('addMoreBtn');
const optionsPanel = document.getElementById('optionsPanel');
const optionsForm = document.getElementById('optionsForm');
const convertBtn = document.getElementById('convertBtn');
const loader = document.getElementById('loader');
const successPanel = document.getElementById('successPanel');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const uploadSection = document.getElementById('uploadSection');
const customSizeFields = document.getElementById('customSizeFields');
const pageSizeSelect = document.getElementById('pageSize');

let uploadedImages = [];
let uploadedFilenames = [];
let draggingIndex = null;

function showOptionsPanel() {
  optionsPanel.classList.remove('translate-x-full');
}
function hideOptionsPanel() {
  optionsPanel.classList.add('translate-x-full');
}
function showLoader() {
  loader.classList.remove('hidden');
}
function hideLoader() {
  loader.classList.add('hidden');
}
function showSuccessPanel(pdfUrl) {
  successPanel.classList.remove('hidden');
  downloadPdfBtn.href = pdfUrl;
  hideOptionsPanel();
}
function hideSuccessPanel() {
  successPanel.classList.add('hidden');
}
function renderThumbnails() {
  imageList.innerHTML = '';
  uploadedImages.forEach((img, idx) => {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-2 bg-white rounded shadow p-2 cursor-move group';
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
    thumb.className = 'w-12 h-12 object-cover rounded';
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '<svg class="w-4 h-4 text-red-500 group-hover:opacity-100 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    delBtn.className = 'ml-auto p-1 hover:bg-red-100 rounded';
    delBtn.onclick = () => {
      uploadedImages.splice(idx, 1);
      uploadedFilenames.splice(idx, 1);
      renderThumbnails();
      if (uploadedImages.length === 0) {
        hideOptionsPanel();
        uploadSection.classList.remove('hidden');
      }
    };
    li.appendChild(thumb);
    li.appendChild(delBtn);
    imageList.appendChild(li);
  });
}
function handleFiles(files) {
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
  showLoader();
  fetch('/upload-images', {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      hideLoader();
      if (data.error) {
        alert(data.error);
        return;
      }
      // Preview images
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = e => {
          uploadedImages.push(e.target.result);
          renderThumbnails();
        };
        reader.readAsDataURL(files[i]);
      }
      uploadedFilenames.push(...data.filenames);
      uploadSection.classList.add('hidden');
      showOptionsPanel();
    })
    .catch(() => {
      hideLoader();
      alert('Upload failed.');
    });
}
uploadBtn.onclick = () => imageInput.click();
addMoreBtn.onclick = () => imageInput.click();
imageInput.onchange = e => {
  if (e.target.files.length > 0) {
    handleFiles(e.target.files);
    imageInput.value = '';
  }
};
optionsForm.onsubmit = e => {
  e.preventDefault();
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
      hideLoader();
      if (data.error) {
        alert(data.error);
        return;
      }
      showSuccessPanel(data.pdf_url);
    })
    .catch(() => {
      hideLoader();
      alert('PDF generation failed.');
    });
};
// Show/hide custom size fields
pageSizeSelect.onchange = e => {
  if (e.target.value === 'Custom') {
    customSizeFields.classList.remove('hidden');
  } else {
    customSizeFields.classList.add('hidden');
  }
};
// Reset on new upload
window.addEventListener('DOMContentLoaded', () => {
  hideOptionsPanel();
  hideLoader();
  hideSuccessPanel();
  renderThumbnails();
}); 