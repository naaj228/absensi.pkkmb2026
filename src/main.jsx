import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Custom Alert Global Override to avoid browser native popup displaying "localhost"
window.alert = (message) => {
  const existing = document.querySelectorAll('.custom-toast');
  existing.forEach(el => el.remove());

  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span class="material-symbols-outlined" style="color: #b9c3ff; font-size: 22px; font-variation-settings: 'FILL' 1;">info</span>
      <span style="font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 500; color: #ffffff; white-space: nowrap;">${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3000);
};

// Custom Confirm Action System
window.confirmAction = (message, onConfirm) => {
  const existing = document.getElementById('custom-confirm-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'custom-confirm-modal';
  modal.className = 'fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-primary/25 backdrop-blur-md transition-opacity duration-300';
  modal.style.opacity = '0';
  
  modal.innerHTML = `
    <div class="relative w-full max-w-sm bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col p-6 items-center text-center transform scale-95 transition-all duration-300" style="border: 1px solid rgba(0, 0, 0, 0.05)">
      <div class="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">help</span>
      </div>
      <h3 class="text-headline-sm font-headline-md text-on-surface mb-2">Konfirmasi Aksi</h3>
      <p class="text-body-sm text-on-surface-variant mb-6 font-sans">${message}</p>
      <div class="flex gap-3 w-full">
        <button id="confirm-cancel-btn" class="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 rounded-xl text-label-md font-label-md transition-colors border border-outline-variant/30 cursor-pointer">
          Batal
        </button>
        <button id="confirm-ok-btn" class="flex-1 bg-primary text-on-primary py-2.5 rounded-xl text-label-md font-label-md transition-colors shadow-md hover:bg-primary-fixed cursor-pointer">
          Ya
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('.transform').style.transform = 'scale(1)';
  }, 10);

  const closeModal = () => {
    modal.style.opacity = '0';
    modal.querySelector('.transform').style.transform = 'scale(0.95)';
    setTimeout(() => modal.remove(), 300);
  };

  modal.querySelector('#confirm-cancel-btn').onclick = () => {
    closeModal();
  };

  modal.querySelector('#confirm-ok-btn').onclick = () => {
    onConfirm();
    closeModal();
  };
};

// Custom Prompt Action System
window.promptAction = (message, defaultValue, onConfirm) => {
  const existing = document.getElementById('custom-prompt-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'custom-prompt-modal';
  modal.className = 'fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-primary/25 backdrop-blur-md transition-opacity duration-300';
  modal.style.opacity = '0';
  
  modal.innerHTML = `
    <div class="relative w-full max-w-sm bg-surface-container-lowest shadow-2xl rounded-[24px] overflow-hidden flex flex-col p-6 items-center text-center transform scale-95 transition-all duration-300" style="border: 1px solid rgba(0, 0, 0, 0.05)">
      <div class="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">warning</span>
      </div>
      <h3 class="text-headline-sm font-headline-md text-on-surface mb-2">Tolak Pengajuan</h3>
      <p class="text-body-sm text-on-surface-variant mb-4 font-sans">${message}</p>
      
      <input id="prompt-input" type="text" value="${defaultValue}" 
        class="w-full bg-surface-container text-on-surface font-sans text-body-sm p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6 border border-outline-variant/30" />
        
      <div class="flex gap-3 w-full">
        <button id="prompt-cancel-btn" class="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 rounded-xl text-label-md font-label-md transition-colors border border-outline-variant/30 cursor-pointer">
          Batal
        </button>
        <button id="prompt-ok-btn" class="flex-1 bg-error text-on-error py-2.5 rounded-xl text-label-md font-label-md transition-colors shadow-md hover:bg-error/90 cursor-pointer">
          Tolak
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Focus and select input text
  const input = modal.querySelector('#prompt-input');
  input.focus();
  input.select();
  
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('.transform').style.transform = 'scale(1)';
  }, 10);

  const closeModal = () => {
    modal.style.opacity = '0';
    modal.querySelector('.transform').style.transform = 'scale(0.95)';
    setTimeout(() => modal.remove(), 300);
  };

  modal.querySelector('#prompt-cancel-btn').onclick = () => {
    closeModal();
  };

  modal.querySelector('#prompt-ok-btn').onclick = () => {
    const val = input.value;
    onConfirm(val);
    closeModal();
  };
  
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      const val = input.value;
      onConfirm(val);
      closeModal();
    }
  };
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
