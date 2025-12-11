/* ============================================
   BestBuddies Pet Grooming - Booking Flow
   ============================================ */

let bookingData = {
  petType: null,
  packageId: null,
  groomerId: null,
  groomerName: '',
  date: null,
  time: null,
  ownerName: '',
  contactNumber: '',
  ownerAddress: '',
  petName: '',
  petBreed: '',
  petAge: '',
  petWeight: '',
  medicalNotes: '',
  vaccinationNotes: '',
  addOns: [],
  bookingNotes: '',
  saveProfile: true,
  singleServices: []
};

let currentStep = 1;
const totalSteps = 4;
const SINGLE_SERVICE_PACKAGE_ID = 'single-service';
const SINGLE_SERVICE_OPTIONS = window.SINGLE_SERVICE_PRICING || {};

function normalizeWeightValue(value = '') {
  return value.replace(/-/g, 'â€“');
}

// Convert age string to months for validation
function getAgeInMonths(ageStr) {
  if (!ageStr) return 999; // Default to high number if not set
  const lower = ageStr.toLowerCase();
  if (lower.includes('month')) {
    const match = lower.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  }
  if (lower.includes('year')) {
    const match = lower.match(/\d+/);
    return match ? parseInt(match[0], 10) * 12 : 999;
  }
  if (lower.includes('less')) return 0; // "Less than 1 month"
  return 999;
}

// Filter age options based on package selection
function updateAgeDropdownOptions() {
  const petAgeSelect = document.getElementById('petAge');
  if (!petAgeSelect) return;

  const currentValue = petAgeSelect.value;
  const allOptions = [
    { value: '', text: 'Select age...' },
    { value: 'Less than 1 month', text: 'Less than 1 month' },
    { value: '1 month', text: '1 month' },
    { value: '2 months', text: '2 months' },
    { value: '3 months', text: '3 months' },
    { value: '4 months', text: '4 months' },
    { value: '5 months', text: '5 months' },
    { value: '6 months', text: '6 months' },
    { value: '7 months', text: '7 months' },
    { value: '8 months', text: '8 months' },
    { value: '9 months', text: '9 months' },
    { value: '10 months', text: '10 months' },
    { value: '11 months', text: '11 months' },
    { value: '1 year', text: '1 year' },
    { value: '2 years', text: '2 years' },
    { value: '3 years', text: '3 years' },
    { value: '4 years', text: '4 years' },
    { value: '5 years', text: '5 years' },
    { value: '6 years', text: '6 years' },
    { value: '7 years', text: '7 years' },
    { value: '8 years', text: '8 years' },
    { value: '9 years', text: '9 years' },
    { value: '10 years', text: '10 years' },
    { value: '11 years', text: '11 years' },
    { value: '12 years', text: '12 years' },
    { value: '13 years', text: '13 years' },
    { value: '14 years', text: '14 years' },
    { value: '15 years', text: '15 years' },
    { value: '16+ years', text: '16+ years' }
  ];

  // For single service: show all ages (including 5 months and below)
  // For other packages: show only 6 months and above
  let visibleOptions = allOptions;
  if (bookingData.packageId && bookingData.packageId !== SINGLE_SERVICE_PACKAGE_ID) {
    visibleOptions = allOptions.filter(opt => !opt.value || getAgeInMonths(opt.value) >= 6);
  }

  // Rebuild the select options
  petAgeSelect.innerHTML = '';
  visibleOptions.forEach(opt => {
    const optElement = document.createElement('option');
    optElement.value = opt.value;
    optElement.textContent = opt.text;
    petAgeSelect.appendChild(optElement);
  });

  // Restore previous selection if it's still valid
  if (currentValue && visibleOptions.some(opt => opt.value === currentValue)) {
    petAgeSelect.value = currentValue;
  } else {
    petAgeSelect.value = '';
  }
}

// Initialize booking page
async function initBooking() {
  try {
    // ensure packages resolved before any computeBookingCost / updateSummary calls
    if (typeof ensurePackagesLoaded === 'function') {
      await ensurePackagesLoaded();
    } else if (typeof getPackages === 'function') {
      // fallback: await getPackages if it returns a Promise
      const pk = getPackages();
      if (pk && typeof pk.then === 'function') await pk;
    }

    // Restore booking data and step from sessionStorage if returning from auth
    const savedBookingData = sessionStorage.getItem('bookingData');
    const savedStep = sessionStorage.getItem('bookingStep');

    // NEW: check for edit/cancel markers placed by customer dashboard
    const editingBookingId = sessionStorage.getItem('editingBookingId');
    const bookingCancelId = sessionStorage.getItem('bookingCancelId');

    let targetStep = 1; // Default to step 1

    if (savedBookingData) {
      try {
        const restored = JSON.parse(savedBookingData);
        // Merge restored data with current bookingData
        bookingData = { ...bookingData, ...restored };
        sessionStorage.removeItem('bookingData');
      } catch (e) {
        console.error('Failed to restore booking data:', e);
      }
    }

    // If an edit marker exists, prefer that and jump to review step
    if (editingBookingId) {
      bookingData.editingBookingId = editingBookingId;
      targetStep = 4;
      // preserve merged bookingData for restore and remove marker
      sessionStorage.removeItem('editingBookingId');
    }

    // If a cancel marker exists, set cancel id and jump to review step
    if (bookingCancelId) {
      bookingData.bookingCancelId = bookingCancelId;
      targetStep = 4;
      sessionStorage.removeItem('bookingCancelId');
    }

    // Restore form fields from bookingData so the UI is prefilled
    try {
      restoreBookingFormData(bookingData);
    } catch (e) {
      console.warn('restoreBookingFormData failed', e);
    }

    if (savedStep) {
      try {
        // savedStep overrides default unless edit/cancel already set targetStep
        if (!editingBookingId && !bookingCancelId) {
          targetStep = parseInt(savedStep, 10);
        }
        sessionStorage.removeItem('bookingStep');
      } catch (e) {
        console.error('Failed to restore booking step:', e);
      }
    }

    // Get current user (don't fail if this errors - allow browsing without login)
    let user = null;
    try {
      if (typeof getCurrentUser === 'function') {
        user = await getCurrentUser();
      }
    } catch (error) {
      console.warn('Could not get current user (user may not be logged in):', error);
      // Continue without user - allow browsing
    }

    // Pre-fill owner details with account info if logged in
    const ownerNameInput = document.getElementById('ownerName');
    const contactNumberInput = document.getElementById('contactNumber');
    const ownerAddressInput = document.getElementById('ownerAddress');

    if (user) {
      if (ownerNameInput) {
        ownerNameInput.value = user.name || '';
        bookingData.ownerName = user.name || '';
      }

      // Auto-fill phone number if available in profile
      if (contactNumberInput && user.phone) {
        contactNumberInput.value = user.phone;
        bookingData.contactNumber = user.phone;
      }

    }

    // Initialize to target step (restored or default step 1)
    showStep(targetStep);

    // Setup calendar time picker
    setupCalendarTimePicker();

    // Setup event listeners
    setupBookingListeners();

    // Attempt to load saved profile silently if logged in
    if (user) {
      try {
        const warningInfo = await getCustomerWarningInfo(user.id);
        if (warningInfo?.isBanned) {
          await customAlert.error('Account Banned', 'Your account is temporarily banned. Please check your customer dashboard for instructions on how to lift the ban.');
          redirect('customer-dashboard.html');
          return;
        }
        const savedProfile = await getCustomerProfile(user.id);
        if (savedProfile) {
          applyProfileToForm(savedProfile);
        }

        // Check if user clicked "Use Saved Details" from dashboard
        const autoLoad = sessionStorage.getItem('autoLoadProfile');
        if (autoLoad === 'true') {
          sessionStorage.removeItem('autoLoadProfile'); // Clear flag
          // Trigger profile load which will jump to step 3
          await handleProfileLoad();
        }
      } catch (error) {
        console.warn('Could not load user profile:', error);
        // Continue without profile
      }
    }

    // Load packages (after listeners are set up)
    loadPackages();
    renderSingleServiceConfigurator();
  } catch (error) {
    console.error('Error initializing booking:', error);
    // Don't show alert for permission errors - user might not be logged in yet
    if (error.message && error.message.includes('Permission denied')) {
      console.warn('Permission denied - user may need to update Firebase security rules. See FIX_BOOKING_PERMISSION_ERROR.md');
      // Continue anyway - might work with localStorage fallback
    } else {
      customAlert.error('Loading Error', 'Error loading booking page. Please refresh and try again.');
    }
  }
}

// Carousel prev/next wiring for cuts-carousel
(function setupCutsCarousel() {
  const wrapper = document.querySelector('.cuts-carousel-wrapper');
  if (!wrapper) return;
  const carousel = wrapper.querySelector('.cuts-carousel');
  const prev = wrapper.querySelector('.cuts-prev');
  const next = wrapper.querySelector('.cuts-next');
  if (!carousel) return;

  function scrollByCard(direction) {
    const card = carousel.querySelector('div');
    if (!card) return;
    const cardStyle = window.getComputedStyle(card);
    const cardWidth = card.getBoundingClientRect().width + parseInt(cardStyle.marginRight || 8);
    const amount = Math.round(cardWidth) * direction;
    carousel.scrollBy({ left: amount, behavior: 'smooth' });
  }

  prev && prev.addEventListener('click', function (e) {
    e.preventDefault();
    scrollByCard(-1);
  });
  next && next.addEventListener('click', function (e) {
    e.preventDefault();
    scrollByCard(1);
  });

  // Allow keyboard activation
  [prev, next].forEach(btn => {
    if (!btn) return;
    btn.setAttribute('tabindex', '0');
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();

// Setup event listeners
function setupBookingListeners() {
  // Pet type selection
  const petCards = document.querySelectorAll('.pet-type-card');
  petCards.forEach(card => {
    card.addEventListener('click', function () {
      const petType = this.dataset.petType;
      selectPetType(petType);
      saveBookingDataToSession(); // Auto-save
    });
  });

  // Package selection
  const packageCards = document.querySelectorAll('.package-card');
  packageCards.forEach(card => {
    card.addEventListener('click', function () {
      const packageId = this.dataset.packageId;
      selectPackage(packageId);
      saveBookingDataToSession(); // Auto-save
    });
  });

  // Calendar time picker handles date/time selection

  // Time slot selection is handled in setupTimeSlots()

  // Form inputs - bind and auto-save
  bindInputToData('ownerName', 'ownerName', true);
  // Contact number with validation
  const contactInput = document.getElementById('contactNumber');
  if (contactInput) {
    contactInput.addEventListener('input', function () {
      let value = this.value.replace(/\s/g, '');
      // Remove +63 and check if it's 11 digits
      if (value.startsWith('+63')) {
        value = '0' + value.substring(3);
      }
      // Validate 11 digits
      if (value.length === 11 && /^0\d{10}$/.test(value)) {
        bookingData.contactNumber = value;
        this.setCustomValidity('');
      } else if (value.length > 0) {
        this.setCustomValidity('Please enter a valid 11-digit phone number (e.g., 09662233605)');
      } else {
        this.setCustomValidity('');
      }
      updateSummary();
      enableNextButton();
      saveBookingDataToSession(); // Auto-save
    });
  }
  bindInputToData('ownerAddress', 'ownerAddress', true);
  bindInputToData('petName', 'petName', true);
  bindInputToData('petBreed', 'petBreed', true);
  // Pet age - handle as select dropdown
  const petAgeSelect = document.getElementById('petAge');
  if (petAgeSelect) {
    petAgeSelect.addEventListener('change', function () {
      bookingData.petAge = this.value;
      updateSummary();
      enableNextButton();
      saveBookingDataToSession(); // Auto-save
    });
  }
  // Weight selection (radio buttons)
  document.querySelectorAll('input[name="petWeight"]').forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.checked) {
        bookingData.petWeight = this.value;
        updateSummary();
        enableNextButton();
        updateSingleServicePriceLabels();
      }
    });
  });

  // Vaccination status - need to wait for DOM
  setTimeout(() => {
    document.querySelectorAll('input[name="vaccinationStatus"]').forEach(radio => {
      radio.addEventListener('change', function () {
        if (this.checked) {
          bookingData.vaccinationStatus = this.value;
          const detailsDiv = document.getElementById('vaccinationDetails');
          if (detailsDiv) {
            detailsDiv.style.display = this.value === 'vaccinated' ? 'block' : 'none';
          }
          updateSummary();
        }
      });
    });
  }, 100);
  bindTextAreaToData('medicalNotes', 'medicalNotes', true);
  bindTextAreaToData('vaccinationNotes', 'vaccinationNotes', true);
  bindTextAreaToData('bookingNotes', 'bookingNotes', true);

  const addonToothbrush = document.getElementById('addonToothbrush');
  if (addonToothbrush) {
    addonToothbrush.addEventListener('change', () => toggleAddon('toothbrush', addonToothbrush.checked));
  }
  const addonDematting = document.getElementById('addonDematting');
  if (addonDematting) {
    addonDematting.addEventListener('change', () => toggleAddon('dematting', addonDematting.checked));
  }

  const saveProfileToggle = document.getElementById('saveProfileToggle');
  if (saveProfileToggle) {
    bookingData.saveProfile = saveProfileToggle.checked;
    saveProfileToggle.addEventListener('change', () => {
      bookingData.saveProfile = saveProfileToggle.checked;
    });
  }

  const loadProfileBtn = document.getElementById('loadProfileBtn');
  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', handleProfileLoad);
  }
  const clearProfileBtn = document.getElementById('clearProfileBtn');
  if (clearProfileBtn) {
    clearProfileBtn.addEventListener('click', clearProfileForm);
  }

  // Navigation buttons
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', nextStep);
  }

  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', prevStep);
  }

  const submitBtn = document.getElementById('submitBooking');
  if (submitBtn) {
    console.log('Submit button found, attaching event listener');
    submitBtn.addEventListener('click', function (e) {
      console.log('Submit button clicked!');
      submitBooking(e);
    });
  } else {
    console.warn('Submit button not found!');
  }



}

function bindInputToData(elementId, field, autoSave = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.addEventListener('input', function () {
    bookingData[field] = this.value.trim();
    updateSummary();
    enableNextButton();
    // Auto-save to sessionStorage if enabled
    if (autoSave) {
      saveBookingDataToSession();
    }
  });
}

function bindTextAreaToData(elementId, field, autoSave = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.addEventListener('input', function () {
    bookingData[field] = this.value.trim();
    updateSummary();
    // Auto-save to sessionStorage if enabled
    if (autoSave) {
      saveBookingDataToSession();
    }
  });
}

function toggleAddon(addonKey, enabled) {
  if (enabled) {
    if (!bookingData.addOns.includes(addonKey)) {
      bookingData.addOns.push(addonKey);
    }
  } else {
    bookingData.addOns = bookingData.addOns.filter(key => key !== addonKey);
  }
  updateSummary();
}

async function handleProfileLoad() {
  const user = await getCurrentUser();
  if (!user) {
    customAlert.warning('Not Logged In', 'Please log in first to load your profile.');
    return;
  }

  // Get profile from last booking
  const allBookings = await getBookings();
  const userBookings = Array.isArray(allBookings) ? allBookings.filter(b => b.userId === user.id) : [];

  if (userBookings.length === 0) {
    customAlert.show('No Profile Found', 'No saved profile yet. Complete the form once and tick "Save details" to reuse.', 'warning');
    return;
  }

  // Get the most recent booking
  const lastBooking = userBookings[userBookings.length - 1];

  // Create profile object from last booking
  const profile = {
    ownerName: lastBooking.ownerName,
    contactNumber: lastBooking.contactNumber,
    address: lastBooking.ownerAddress,
    petName: lastBooking.petName,
    breed: lastBooking.petBreed,
    age: lastBooking.petAge,
    weight: lastBooking.petWeight,
    medical: lastBooking.medicalNotes,
    vaccinations: lastBooking.vaccinationNotes,
    addOns: lastBooking.addOns || []
  };

  // Load profile details
  applyProfileToForm(profile);

  // Auto-fill pet type and package from last booking
  bookingData.petType = lastBooking.petType;
  bookingData.packageId = lastBooking.packageId;

  // Update UI to reflect selection
  document.querySelectorAll('.pet-type-card').forEach(card => {
    if (card.dataset.petType === lastBooking.petType) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  loadPackages();
  document.querySelectorAll('.package-card').forEach(card => {
    if (card.dataset.packageId === lastBooking.packageId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Jump directly to step 3 (Schedule)
  showStep(3);
  renderCalendarTimePicker().catch(err => console.error('Error rendering calendar:', err));

  updateSummary();

  customAlert.success('Profile Loaded!', 'Your saved details have been loaded successfully.');
}

function applyProfileToForm(profile = {}) {
  const fieldMap = [
    ['ownerName', 'ownerName', 'ownerName'],
    ['contactNumber', 'contactNumber', 'contactNumber'],
    ['ownerAddress', 'address', 'ownerAddress'],
    ['petName', 'petName', 'petName'],
    ['petBreed', 'breed', 'petBreed'],
    ['petAge', 'age', 'petAge'],
    ['medicalNotes', 'medical', 'medicalNotes'],
    ['vaccinationNotes', 'vaccinations', 'vaccinationNotes']
  ];

  fieldMap.forEach(([elementId, profileKey, dataField]) => {
    const el = document.getElementById(elementId);
    if (el && typeof profile[profileKey] !== 'undefined' && profile[profileKey]) {
      el.value = profile[profileKey];
      bookingData[dataField] = profile[profileKey];
    }
  });

  bookingData.ownerName = profile.ownerName || bookingData.ownerName;
  bookingData.contactNumber = profile.contactNumber || bookingData.contactNumber;
  bookingData.ownerAddress = profile.address || bookingData.ownerAddress;
  bookingData.petName = profile.petName || bookingData.petName;
  bookingData.petBreed = profile.breed || '';
  bookingData.petAge = profile.age || '';
  bookingData.petWeight = normalizeWeightValue(profile.weight || '');
  bookingData.medicalNotes = profile.medical || '';
  bookingData.vaccinationNotes = profile.vaccinations || '';
  bookingData.addOns = Array.isArray(profile.addOns) ? profile.addOns : [];

  // Select the weight radio button
  if (profile.weight) {
    const weightRadios = document.querySelectorAll('input[name="petWeight"]');
    weightRadios.forEach(radio => {
      if (radio.value === profile.weight) {
        radio.checked = true;
      }
    });
  }

  // Select add-ons checkboxes
  const toothbrush = document.getElementById('addonToothbrush');
  if (toothbrush) {
    toothbrush.checked = bookingData.addOns.includes('toothbrush');
  }
  const dematting = document.getElementById('addonDematting');
  if (dematting) {
    dematting.checked = bookingData.addOns.includes('dematting');
  }

  updateSummary();
  enableNextButton();
  updateSingleServicePriceLabels();
}

function clearProfileForm() {
  const inputs = ['contactNumber', 'ownerAddress', 'petName', 'petBreed', 'petAge', 'petWeight'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      bookingData[id] = '';
    }
  });
  ['medicalNotes', 'vaccinationNotes', 'bookingNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      bookingData[id] = '';
    }
  });
  const toothbrush = document.getElementById('addonToothbrush');
  if (toothbrush) toothbrush.checked = false;
  const dematting = document.getElementById('addonDematting');
  if (dematting) dematting.checked = false;
  bookingData.addOns = [];
  updateSummary();
}

// Show specific step
function showStep(step) {
  currentStep = step;

  // Update step indicators
  document.querySelectorAll('.step').forEach((stepEl, index) => {
    const stepNum = index + 1;
    stepEl.classList.remove('active', 'completed');

    if (stepNum < step) {
      stepEl.classList.add('completed');
    } else if (stepNum === step) {
      stepEl.classList.add('active');
    }
  });

  // Show/hide step content
  document.querySelectorAll('.step-content').forEach((content, index) => {
    if (index + 1 === step) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Show/hide navigation buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBooking');

  if (prevBtn) {
    if (step > 1) {
      prevBtn.style.display = 'inline-block';
      prevBtn.classList.remove('hidden');
      prevBtn.classList.add('visible');
      prevBtn.removeAttribute('data-hidden');
    } else {
      prevBtn.style.display = 'none';
      prevBtn.classList.add('hidden');
      prevBtn.classList.remove('visible');
      prevBtn.setAttribute('data-hidden', 'true');
    }
  }

  if (nextBtn) {
    if (step < totalSteps) {
      nextBtn.style.display = 'inline-block';
      nextBtn.classList.remove('hidden');
      nextBtn.classList.add('visible');
      nextBtn.removeAttribute('data-hidden');
    } else {
      nextBtn.style.display = 'none';
      nextBtn.classList.add('hidden');
      nextBtn.classList.remove('visible');
      nextBtn.setAttribute('data-hidden', 'true');
    }
  }

  if (submitBtn) {
    if (step === totalSteps) {
      submitBtn.style.display = 'inline-block';
      submitBtn.classList.remove('hidden');
      submitBtn.classList.add('visible');
      submitBtn.removeAttribute('data-hidden');
    } else {
      submitBtn.style.display = 'none';
      submitBtn.classList.add('hidden');
      submitBtn.classList.remove('visible');
      submitBtn.setAttribute('data-hidden', 'true');
    }
  }

  updateSummary();
}

// Next step
async function nextStep() {
  // Validate current step
  if (!validateStep(currentStep)) {
    return;
  }

  // Save current form data to sessionStorage before moving to next step
  saveBookingDataToSession();

  // Gate: Require login before entering step 3 (Date, Time & Groomer)
  if (currentStep === 2) {
    let user = null;
    try {
      if (typeof getCurrentUser === 'function') {
        user = await getCurrentUser();
      }
    } catch (error) {
      console.warn('Could not check user:', error);
    }

    if (!user) {
      await customAlert.show('Login Required', 'Please create an account or log in to continue booking. Your information has been saved.', 'warning');
      // Save booking data and intended step so we can restore after auth
      sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
      sessionStorage.setItem('bookingStep', '3');
      redirect('signup.html?return=booking.html');
      return;
    }
  }

  // Skip step 2 (Package) if packageId is already set after step 1
  if (currentStep === 1 && bookingData.packageId) {
    showStep(3);
    return;
  }

  if (currentStep < totalSteps) {
    showStep(currentStep + 1);
  }
}

// Save current booking form data to sessionStorage
function saveBookingDataToSession() {
  // Collect all form data
  const formData = {
    petType: bookingData.petType,
    packageId: bookingData.packageId,
    ownerName: document.getElementById('ownerName')?.value || bookingData.ownerName,
    contactNumber: document.getElementById('contactNumber')?.value || bookingData.contactNumber,
    ownerAddress: document.getElementById('ownerAddress')?.value || bookingData.ownerAddress,
    petName: document.getElementById('petName')?.value || bookingData.petName,
    petBreed: document.getElementById('petBreed')?.value || bookingData.petBreed,
    petAge: document.getElementById('petAge')?.value || bookingData.petAge,
    petWeight: document.getElementById('petWeight')?.value || bookingData.petWeight,
    medicalNotes: document.getElementById('medicalNotes')?.value || bookingData.medicalNotes,
    vaccinationNotes: document.getElementById('vaccinationNotes')?.value || bookingData.vaccinationNotes,
    bookingNotes: document.getElementById('bookingNotes')?.value || bookingData.bookingNotes,
    addOns: bookingData.addOns || [],
    singleServices: bookingData.singleServices || [],
    saveProfile: bookingData.saveProfile !== false
  };

  // Merge with existing bookingData
  bookingData = { ...bookingData, ...formData };

  // Save to sessionStorage
  sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
}

// Previous step
function prevStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

// Validate step
function validateStep(step) {
  switch (step) {
    case 1:
      if (!bookingData.petType) {
        customAlert.warning('Missing Information', 'Please select a pet type');
        return false;
      }
      break;
    case 2:
      if (!bookingData.packageId) {
        customAlert.warning('Missing Information', 'Please select a package');
        return false;
      }
      if (bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID && bookingData.singleServices.length === 0) {
        customAlert.warning('Missing Information', 'Select at least one single service option.');
        return false;
      }
      break;
    case 3:
      // Groomer selection removed - admin will assign
      // Only require date and time
      if (!bookingData.date) {
        customAlert.warning('Missing Information', 'Please select a date');
        return false;
      }
      if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(bookingData.date)) {
        customAlert.warning('Date Unavailable', 'Selected date is closed. Please pick another day.');
        return false;
      }
      if (!bookingData.time) {
        customAlert.warning('Missing Information', 'Please select a time slot');
        return false;
      }
      break;
    case 4:
      if (!bookingData.ownerName.trim()) {
        customAlert.warning('Missing Information', 'Please enter the owner name');
        return false;
      }
      if (!bookingData.contactNumber.trim()) {
        customAlert.warning('Missing Information', 'Please enter a contact number');
        return false;
      }
      // Validate phone number format
      const phone = bookingData.contactNumber.replace(/\s/g, '');
      if (!/^(\+63|0)[0-9]{10}$/.test(phone)) {
        customAlert.warning('Invalid Input', 'Please enter a valid 11-digit phone number (e.g., 09662233605 or +63 9662233605)');
        return false;
      }
      if (!bookingData.petName.trim()) {
        customAlert.warning('Missing Information', "Please enter your pet's name");
        return false;
      }
      // Validate vaccinations
      const antiRabies = document.getElementById('vaccAntiRabies');
      const antiParvo = document.getElementById('vaccAntiParvo');
      const notVaccinated = document.getElementById('vaccNotVaccinated');

      if (notVaccinated?.checked) {
        customAlert.warning('Vaccination Required', 'Your pet must be vaccinated to book an appointment. Please contact us once your pet has received the necessary vaccinations.');
        return false;
      }
      if (!antiRabies?.checked && !antiParvo?.checked) {
        customAlert.warning('Vaccination Status', "Please confirm your pet's vaccination status. Select at least one vaccine or mark as not vaccinated.");
        return false;
      }
      break;
  }
  return true;
}

// Select pet type
function selectPetType(petType) {
  bookingData.petType = petType;

  // Update UI
  document.querySelectorAll('.pet-type-card').forEach(card => {
    if (card.dataset.petType === petType) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Clear package selection if type changed
  bookingData.packageId = null;
  loadPackages();
  renderSingleServiceConfigurator();
  if (bookingData.petWeight) {
    const weightRadio = document.querySelector(`input[name="petWeight"][value="${bookingData.petWeight}"]`);
    if (weightRadio) {
      weightRadio.checked = true;
    }
  }

  updateSummary();
  enableNextButton();
  updateSingleServicePriceLabels();
}

// Load packages based on selected pet type
async function loadPackages() {
  if (!bookingData.petType) return;

  const packages = await getPackages();
  const filteredPackages = packages.filter(pkg => {
    if (pkg.type === 'addon') return false;
    if (pkg.type === 'any') return true;
    return pkg.type === bookingData.petType;
  });

  const packagesContainer = document.getElementById('packagesContainer');
  if (!packagesContainer) return;

  packagesContainer.innerHTML = filteredPackages.map(pkg => {
    const isSelected = bookingData.packageId === pkg.id;
    const tiers = (pkg.tiers || []).map(tier => `<div><strong>${formatCurrency(tier.price)}</strong> · ${escapeHtml(tier.label)}</div>`).join('');
    const inclusions = (pkg.includes || []).map(item => `<div>${escapeHtml(item)}</div>`).join('');
    return `
      <div class="card card-selectable package-card ${isSelected ? 'selected' : ''}" 
           data-package-id="${pkg.id}">
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(pkg.name)}</h3>
          <p style="color: var(--gray-600); font-size:0.9rem;">Duration Â· ${pkg.duration} mins</p>
          <div class="package-includes" style="list-style: none; padding: 0; margin: 0.5rem 0;">${inclusions}</div>
          <div class="package-tiers" style="margin-top: 0.5rem;">
            <div style="list-style: none; padding: 0;">${tiers}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-attach event listeners
  document.querySelectorAll('.package-card').forEach(card => {
    card.addEventListener('click', function () {
      const packageId = this.dataset.packageId;
      selectPackage(packageId);
    });
  });
}

function renderGroomerChoices() {
  // Groomer selection removed from customer booking flow
  // Admin will assign groomer after booking is confirmed
  // This function kept for backwards compatibility only
  return;
}

function isSingleServicePackage() {
  return bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID;
}

function renderSingleServiceConfigurator() {
  const wrapper = document.getElementById('singleServiceConfigurator');
  const optionsContainer = document.getElementById('singleServiceOptions');
  if (!wrapper || !optionsContainer) return;

  if (!isSingleServicePackage()) {
    wrapper.style.display = 'none';
    bookingData.singleServices = [];
    optionsContainer.innerHTML = '';
    return;
  }

  wrapper.style.display = 'block';
  const optionEntries = Object.values(SINGLE_SERVICE_OPTIONS);

  if (!optionEntries.length) {
    optionsContainer.innerHTML = '<p class="empty-state">Single services are not configured yet.</p>';
    return;
  }

  optionsContainer.innerHTML = optionEntries.map(option => {
    const checked = bookingData.singleServices.includes(option.id);
    return `
      <label class="addon-chip single-service-chip ${checked ? 'selected' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} data-single-service="${option.id}">
        <div>
          <div style="font-weight:600;">${escapeHtml(option.label)}</div>
          <div class="price-hint" data-price-label="${option.id}" style="font-size:0.85rem; color: var(--gray-600);">
            ${bookingData.petWeight ? 'Calculatingâ€¦' : 'Select weight to see pricing'}
          </div>
        </div>
      </label>
    `;
  }).join('');

  optionsContainer.querySelectorAll('[data-single-service]').forEach(input => {
    input.addEventListener('change', () => {
      toggleSingleServiceOption(input.dataset.singleService, input.checked);
    });
  });

  updateSingleServicePriceLabels();
}

function toggleSingleServiceOption(serviceId, enabled) {
  if (!serviceId) return;
  if (enabled) {
    if (!bookingData.singleServices.includes(serviceId)) {
      bookingData.singleServices.push(serviceId);
    }
  } else {
    bookingData.singleServices = bookingData.singleServices.filter(id => id !== serviceId);
  }
  updateSingleServicePriceLabels();
  updateSummary();
  enableNextButton();
}

function updateSingleServicePriceLabels() {
  if (!isSingleServicePackage()) return;
  const optionsContainer = document.getElementById('singleServiceOptions');
  if (!optionsContainer) return;

  optionsContainer.querySelectorAll('[data-price-label]').forEach(label => {
    const serviceId = label.dataset.priceLabel;
    if (typeof getSingleServicePrice !== 'function') {
      label.textContent = 'Pricing unavailable';
      return;
    }
    const info = getSingleServicePrice(serviceId, bookingData.petWeight || '');
    if (info.requiresWeight && !bookingData.petWeight) {
      label.textContent = 'Select weight to see pricing';
      return;
    }
    if (info.price) {
      label.textContent = `${formatCurrency(info.price)} Â· ${info.category === 'large' ? '15kg +' : 'Up to 15kg'}`;
    } else {
      label.textContent = 'Not available for this weight';
    }
  });
}

// Select package
function selectPackage(packageId) {
  bookingData.packageId = packageId;
  if (packageId !== SINGLE_SERVICE_PACKAGE_ID) {
    bookingData.singleServices = [];
  }

  // Update age dropdown options based on package selection
  updateAgeDropdownOptions();

  // Update UI
  document.querySelectorAll('.package-card').forEach(card => {
    if (card.dataset.packageId === packageId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  updateSummary();
  enableNextButton();
  renderSingleServiceConfigurator();
}

// Setup calendar time picker
async function setupCalendarTimePicker() {
  const container = document.getElementById('calendarTimePicker');
  if (!container) return;

  // Clear previous content and setup structure
  container.innerHTML = `
    <div id="calendarWrapper" style="margin-bottom: 2rem;"></div>
    <div id="timeSlotsWrapper"></div>
    <div id="groomerAssignmentDisplay" style="text-align:center; display:none; margin-top:1rem; font-size:0.9rem; color:var(--gray-600);"></div>
  `;

  // Clear any previous groomer selection - admin will assign
  if (!bookingData.groomerDataPreserved) {
    bookingData.groomerId = null;
    bookingData.groomerName = '';
  }

  // Render the calendar
  // Use options for interactive mode
  await renderPublicCalendar('calendarWrapper', {
    showBookedList: false, // Don't show names on booking page
    onDateSelect: handleDateSelect,
    selectedDate: bookingData.date
  });

  // If we already have a date selected (e.g. returning from auth), render time slots
  if (bookingData.date) {
    if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(bookingData.date)) {
      // Handle blackout case if pre-selected
      bookingData.date = null;
      bookingData.time = null;
    } else {
      renderBookingTimeSlots(bookingData.date);
    }
  } else {
    document.getElementById('timeSlotsWrapper').innerHTML = '<p style="color:var(--gray-600); text-align:center; padding:2rem;">Select a date above to see available time slots.</p>';
  }
}

// Alias for backward compatibility - renderCalendarTimePicker is the same as setupCalendarTimePicker
async function renderCalendarTimePicker() {
  return await setupCalendarTimePicker();
}


async function handleDateSelect(date) {
  bookingData.date = date;
  bookingData.time = null; // Reset time when date changes

  // Re-render calendar to update selection highlight
  await renderPublicCalendar('calendarWrapper', {
    showBookedList: false,
    onDateSelect: handleDateSelect,
    selectedDate: date
  });

  updateSummary();
  enableNextButton();
  renderBookingTimeSlots(date);

  // Smooth scroll to time slots
  const tsWrapper = document.getElementById('timeSlotsWrapper');
  if (tsWrapper) tsWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Calculate available slots for a time slot across all groomers
async function getAvailableSlotsForTime(date, time) {
  if (!date || !time) return 0;
  if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(date)) return 0;

  // Fetch groomers/active groomers once
  const groomersList = await getGroomers();
  const activeGroomers = typeof getActiveGroomers === 'function' ? await getActiveGroomers(date) : groomersList;

  // Use main.js helper if available
  if (typeof groomerSlotAvailable === 'function') {
    try {
      const checks = await Promise.all(activeGroomers.map(g => groomerSlotAvailable(g.id, date, time)));
      return checks.filter(Boolean).length;
    } catch (e) {
      console.warn('groomerSlotAvailable parallel checks failed', e);
    }
  }

  // Fallback: compute by counting bookings
  const bookings = await getBookings();
  const bookedIds = bookings.filter(b =>
    b.date === date && b.time === time && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status)
  ).map(b => b.groomerId).filter(Boolean);

  const available = activeGroomers.filter(g => !bookedIds.includes(g.id)).length;
  return Math.max(0, available);
}

async function renderBookingTimeSlots(date) {
  const container = document.getElementById('timeSlotsWrapper');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="spinner"></div> Checking availability...</div>';

  const timeSlots = window.STANDARD_TIME_SLOTS || ['9am-12pm', '12pm-3pm', '3pm-6pm'];
  const selectedTime = bookingData.time;

  // Check blackout
  const blackout = typeof getCalendarBlackout === 'function' ? getCalendarBlackout(date) : null;
  if (blackout) {
    container.innerHTML = `<p style="color: var(--gray-600); text-align: center; padding: 1.5rem;">${escapeHtml(blackout.reason || 'This date is closed')} · Please pick another day.</p>`;
    return;
  }

  // Time validation: Check if selected date is today
  const selectedDate = new Date(date);
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  // Helper function to check if a time slot has passed
  function isTimeSlotPast(timeSlot) {
    if (!isToday) return false; // Future dates are always available

    // Parse END time of the slot (e.g. "9am-12pm" -> "12pm")
    // Logic: Users can book up until 30 minutes before the slot ENDS.
    const parts = timeSlot.split('-');
    const endTimeStr = (parts[1] || parts[0]).trim(); // fallback if no dash

    let endHour = parseInt(endTimeStr);
    const isPM = endTimeStr.toLowerCase().includes('pm');

    // Convert to 24-hour format
    if (isPM && endHour !== 12) {
      endHour += 12;
    } else if (!isPM && endHour === 12) {
      endHour = 0;
    }

    // Cutoff time is 30 minutes BEFORE the slot ends
    // e.g. 12pm end -> cutoff 11:30am
    // e.g. 3pm end -> cutoff 2:30pm
    // e.g. 6pm end -> cutoff 5:30pm

    let cutoffHour = endHour;
    let cutoffMinute = 0;

    if (cutoffMinute === 0) {
      cutoffHour -= 1;
      cutoffMinute = 30;
    } else {
      cutoffMinute -= 30;
    }

    // Check if current time is past the cutoff
    return currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute);
  }

  const timeSlotPromises = timeSlots.map(async time => {
    const availableSlots = await getAvailableSlotsForTime(date, time);
    const isSelected = selectedTime === time;
    const isPast = isTimeSlotPast(time);
    const isAvailable = availableSlots > 0 && !isPast;

    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
        <button type="button" 
                data-time="${time}"
                class="time-slot ${isSelected ? 'selected' : ''} ${isPast ? 'past-slot' : ''}" 
                onclick="selectTime('${time}')"
                ${!isAvailable ? 'disabled' : ''}>
          ${time}
        </button>
        <div style="font-size: 0.85rem; color: ${isAvailable ? 'var(--gray-700)' : (isPast ? '#d32f2f' : 'var(--gray-500)')}; font-weight: ${isAvailable ? '600' : '400'};">
          ${isPast ? 'Time Passed' : (isAvailable ? `${availableSlots} Slot${availableSlots !== 1 ? 's' : ''}` : 'Fully booked')}
        </div>
      </div>
    `;
  });

  const timeSlotHTMLs = await Promise.all(timeSlotPromises);

  container.innerHTML = `
    <div class="time-slots-picker">
      <h4 style="margin-bottom: 1rem; text-align:center;">Select Time for ${formatDate(date)}</h4>
      <div class="time-slots">
        ${timeSlotHTMLs.join('')}
      </div>
    </div>
  `;
}
// Calendar time picker handles time slot updates

// Select time
function selectTime(time) {
  bookingData.time = time;

  // Update UI
  document.querySelectorAll('.time-slot').forEach(slot => {
    if (slot.dataset.time === time) {
      slot.classList.add('selected');
    } else {
      slot.classList.remove('selected');
    }
  });

  updateSummary();
  enableNextButton();
}

// Update summary
async function updateSummary() {
  const summaryContainer = document.getElementById('bookingSummary');
  if (!summaryContainer) return;

  const packages = await getPackages();
  const selectedPackage = packages.find(p => p.id === bookingData.packageId);

  const user = await getCurrentUser();
  const warningInfo = user ? await getCustomerWarningInfo(user.id) : { warnings: 0 };

  let summaryHTML = '<div class="summary-card"><h3 style="margin-bottom: 1rem;">Booking Summary</h3>';

  if (warningInfo?.warnings) {
    summaryHTML += `
      <div class="summary-alert">
        âš ï¸ ${warningInfo.warnings}/5 warnings${warningInfo.isBanned ? ' Â· account on hold' : ''}.
      </div>
    `;
  }

  if (bookingData.petType) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Pet Type:</span>
        <span class="summary-value">${escapeHtml(bookingData.petType.charAt(0).toUpperCase() + bookingData.petType.slice(1))}</span>
      </div>
    `;
  }

  if (selectedPackage) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Package:</span>
        <span class="summary-value">${escapeHtml(selectedPackage.name)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Duration:</span>
        <span class="summary-value">${selectedPackage.duration} min</span>
      </div>
    `;

    // Show includes
    if (selectedPackage.includes && selectedPackage.includes.length > 0) {
      summaryHTML += `
        <div class="summary-item">
          <span class="summary-label">Includes:</span>
          <div style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">
            ${selectedPackage.includes.map(item => `${escapeHtml(item)}`).join(', ')}
          </div>
        </div>
      `;
    }

    // Show price range
    if (selectedPackage.tiers && selectedPackage.tiers.length > 0) {
      const minPrice = Math.min(...selectedPackage.tiers.map(t => t.price));
      const maxPrice = Math.max(...selectedPackage.tiers.map(t => t.price));
      summaryHTML += `
        <div class="summary-item">
          <span class="summary-label">Price:</span>
          <span class="summary-value">${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}</span>
        </div>
      `;
    }
  }

  if (bookingData.date && bookingData.time) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Groomer:</span>
        <span class="summary-value">GROOMER</span>
      </div>
    `;
  }

  if (bookingData.date) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Date:</span>
        <span class="summary-value">${formatDate(bookingData.date)}</span>
      </div>
    `;
  }

  if (bookingData.time) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Time:</span>
        <span class="summary-value">${formatTime(bookingData.time)}</span>
      </div>
    `;
  }

  if (bookingData.ownerName) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Owner:</span>
        <span class="summary-value">${escapeHtml(bookingData.ownerName)}</span>
      </div>
    `;
  }

  if (bookingData.contactNumber) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Contact:</span>
        <span class="summary-value">${escapeHtml(bookingData.contactNumber)}</span>
      </div>
    `;
  }

  if (bookingData.petName) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Pet:</span>
        <span class="summary-value">${escapeHtml(bookingData.petName)}</span>
      </div>
    `;
  }

  if (bookingData.petWeight) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Weight:</span>
        <span class="summary-value">${escapeHtml(bookingData.petWeight)}</span>
      </div>
    `;
  }

  if (bookingData.addOns.length) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Add-ons:</span>
        <span class="summary-value">${bookingData.addOns.map(addon => addon === 'toothbrush' ? 'Toothbrush' : 'De-matting').join(', ')}</span>
      </div>
    `;
  }

  if (bookingData.bookingNotes && bookingData.bookingNotes.trim()) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Special Notes:</span>
        <span class="summary-value" style="font-size: 0.9rem; line-height: 1.4;">${escapeHtml(bookingData.bookingNotes)}</span>
      </div>
    `;
  }

  const shouldComputeCost = bookingData.packageId
    ? (bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID
      ? bookingData.singleServices.length > 0 && !!bookingData.petWeight
      : !!bookingData.petWeight)
    : false;

  // Compute cost if needed (async)
  let costEstimate = null;
  if (shouldComputeCost) {
    try {
      costEstimate = computeBookingCost(bookingData.packageId, bookingData.petWeight, bookingData.addOns, bookingData.singleServices);
    } catch (err) {
      console.error('Error computing cost:', err);
      costEstimate = null;
    }
  }

  if (isSingleServicePackage()) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Selected Services:</span>
        <span class="summary-value">
          ${bookingData.singleServices.length ? bookingData.singleServices.map(id => escapeHtml(SINGLE_SERVICE_OPTIONS[id]?.label || id)).join(', ') : 'Choose at least one service'}
        </span>
      </div>
    `;
    if (!bookingData.singleServices.length) {
      summaryHTML += `<p style="color: var(--warning-600); font-size: 0.85rem;">Please tick at least one single service option.</p>`;
    }
  }

  if (costEstimate) {
    const addOnSummary = costEstimate.addOns.length
      ? costEstimate.addOns.map(addon => `${escapeHtml(addon.label)} (${formatCurrency(addon.price)})`).join(', ')
      : 'None';
    summaryHTML += `
      <div class="summary-divider" style="margin: 1rem 0; border-top: 1px solid var(--gray-200);"></div>
      ${isSingleServicePackage() && costEstimate.services?.length ? `
        <div class="summary-item">
          <span class="summary-label">Single Services:</span>
          <span class="summary-value">
            ${costEstimate.services.map(service => `${escapeHtml(service.label)} (${service.price ? formatCurrency(service.price) : 'Select weight'})`).join('<br>')}
          </span>
        </div>
      ` : ''}
      <div class="summary-item">
        <span class="summary-label">Package (${escapeHtml(costEstimate.weightLabel)}):</span>
        <span class="summary-value">${formatCurrency(costEstimate.packagePrice)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Add-ons:</span>
        <span class="summary-value">${addOnSummary}</span>
      </div>
      <div class="summary-item" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--gray-200); font-weight: 600;">
        <span class="summary-label">Total Amount:</span>
        <span class="summary-value">${formatCurrency(costEstimate.totalAmount || (costEstimate.subtotal + costEstimate.bookingFee))}</span>
      </div>
      <div class="summary-item" style="font-size: 0.85rem; color: var(--gray-600);">
        <span class="summary-label">Booking Fee (Deductible):</span>
        <span class="summary-value">-${formatCurrency(costEstimate.bookingFee)}</span>
      </div>
      <div class="summary-item" style="margin-top: 0.5rem; padding-top: 0.5rem; font-weight: 600; color: var(--success-600);">
        <span class="summary-label">Amount to Pay:</span>
        <span class="summary-value">${formatCurrency((costEstimate.totalAmount || (costEstimate.subtotal + costEstimate.bookingFee)) - costEstimate.bookingFee)}</span>
      </div>
    `;
    if (isSingleServicePackage() && (!bookingData.petWeight || costEstimate.services?.some(service => service.requiresWeight))) {
      summaryHTML += `
        <p style="color: var(--warning-600); font-size: 0.85rem; margin-top: 0.5rem;">
          Select the pet's weight to finalize the single-service pricing.
        </p>
      `;
    }
  } else if (bookingData.packageId) {
    summaryHTML += `
      <p style="color: var(--gray-500); font-size: 0.85rem; margin-top: 0.5rem;">
        Select a weight bracket to preview your estimated total.
      </p>
    `;
  }

  summaryHTML += '</div>';
  summaryContainer.innerHTML = summaryHTML;

  // Add booking fee explanation note after summary (only once)
  let explanationDiv = summaryContainer.parentElement.querySelector('[data-booking-fee-explanation]');
  if (!explanationDiv) {
    explanationDiv = document.createElement('div');
    explanationDiv.setAttribute('data-booking-fee-explanation', 'true');
    explanationDiv.style.cssText = 'margin-top: 1rem; padding: 0.75rem; background: var(--info-light, #e3f2fd); border-left: 3px solid var(--info, #2196f3); font-size: 0.85rem; color: var(--gray-700); line-height: 1.5;';
    explanationDiv.innerHTML = `💡 <strong>Booking Fee Explanation:</strong> The ${formatCurrency(100)} booking fee is included in the "Amount to Pay" above and will be deducted from your final bill upon arrival. This helps secure your appointment slot.`;
    summaryContainer.parentElement.insertBefore(explanationDiv, summaryContainer.nextSibling);
  }
}

// Enable next button if step is valid
function enableNextButton() {
  const nextBtn = document.getElementById('nextBtn');
  if (!nextBtn) return;

  let isValid = false;
  switch (currentStep) {
    case 1:
      isValid = !!bookingData.petType;
      break;
    case 2:
      isValid = !!bookingData.packageId;
      if (isValid && bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID) {
        isValid = bookingData.singleServices.length > 0;
      }
      break;
    case 3:
      isValid = !!bookingData.date && !!bookingData.time;
      break;
    case 4:
      isValid = !!bookingData.ownerName.trim() && !!bookingData.contactNumber.trim() && !!bookingData.petName.trim();
      break;
  }

  nextBtn.disabled = !isValid;
}

// Submit booking
async function submitBooking(event) {
  try {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();

    // Validate final step fields
    if (!validateStep(4)) {
      return;
    }

    // Ensure user is authenticated before creating booking
    if (typeof getCurrentUser !== 'function') {
      console.error('getCurrentUser function not available');
      customAlert.error('System Error', 'Error: Authentication system not loaded. Please refresh the page and try again.');
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      await customAlert.show('Login Required', 'Please create an account or log in to submit your booking.', 'warning');
      sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
      sessionStorage.setItem('bookingStep', '4');
      if (typeof redirect === 'function') {
        redirect('signup.html?return=booking.html');
      } else {
        window.location.href = 'signup.html?return=booking.html';
      }
      return;
    }

    // Check ban/warnings
    const warningInfo = await getCustomerWarningInfo(user.id);
    if (warningInfo?.isBanned) {
      await customAlert.error('Account Banned', 'Your account is temporarily banned. Please check your customer dashboard for instructions on how to lift the ban.');
      redirect('customer-dashboard.html');
      return;
    }

    if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(bookingData.date)) {
      customAlert.warning('Date Unavailable', 'This date has been closed by the admin. Please choose another slot.');
      return;
    }

    const packages = await getPackages();
    const selectedPackage = packages.find(p => p.id === bookingData.packageId);

    const profile = {
      ownerName: bookingData.ownerName.trim(),
      contactNumber: bookingData.contactNumber.trim(),
      address: bookingData.ownerAddress.trim(),
      petName: bookingData.petName.trim(),
      breed: bookingData.petBreed.trim(),
      age: bookingData.petAge.trim(),
      weight: bookingData.petWeight || '',
      medical: bookingData.medicalNotes.trim(),
      vaccinations: bookingData.vaccinationNotes.trim(),
      vaccinationStatus: bookingData.vaccinationStatus || '',
      addOns: bookingData.addOns.slice()
    };

    if (bookingData.saveProfile) {
      await saveCustomerProfile(user.id, profile);
    }

    // Calculate cost details before creating booking
    let costDetails = {
      subtotal: 0,
      totalDueToday: 0,
      balanceOnVisit: 0,
      addOns: [],
      services: [],
      packagePrice: 0,
      weightLabel: bookingData.petWeight || ''
    };

    // Calculate package price based on pet weight
    if (selectedPackage && selectedPackage.tiers && bookingData.petWeight) {
      const tier = selectedPackage.tiers.find(t => t.label === bookingData.petWeight);
      if (tier) {
        costDetails.packagePrice = tier.price;
        costDetails.subtotal = tier.price;
      } else if (selectedPackage.tiers.length > 0) {
        // Default to first tier if weight not found
        costDetails.packagePrice = selectedPackage.tiers[0].price;
        costDetails.subtotal = selectedPackage.tiers[0].price;
      }
    }

    // Add single service costs if applicable
    if (bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID && bookingData.singleServices.length > 0) {
      costDetails.subtotal = 0;
      costDetails.packagePrice = 0;
      bookingData.singleServices.forEach(serviceId => {
        if (typeof getSingleServicePrice === 'function') {
          const priceInfo = getSingleServicePrice(serviceId, bookingData.petWeight || '');
          if (priceInfo.price) {
            costDetails.subtotal += priceInfo.price;
            costDetails.services.push({
              serviceId: serviceId,
              label: window.SINGLE_SERVICE_PRICING?.[serviceId]?.label || serviceId,
              price: priceInfo.price
            });
          }
        }
      });
    }

    // Add addon costs
    if (bookingData.addOns.includes('toothbrush')) {
      const price = 25;
      costDetails.subtotal += price;
      costDetails.addOns.push({ label: 'Toothbrush', price: price });
    }
    if (bookingData.addOns.includes('dematting')) {
      const price = 80; // Base price
      costDetails.subtotal += price;
      costDetails.addOns.push({ label: 'De-matting', price: price });
    }

    // Calculate booking fee and balance
    const bookingFee = 100; // Booking fee as per policy
    costDetails.bookingFee = bookingFee;
    costDetails.totalDueToday = bookingFee;
    costDetails.totalAmount = costDetails.subtotal; // Total amount before deduction
    costDetails.balanceOnVisit = Math.max(0, costDetails.subtotal - bookingFee);

    // Auto-assign groomer if none selected
    let assignedGroomerId = bookingData.groomerId || null;
    let assignedGroomerName = bookingData.groomerName || 'Assigned on site';
    if (!assignedGroomerId && typeof assignFairGroomer === 'function') {
      try {
        const g = await assignFairGroomer(bookingData.date, bookingData.time);
        if (g) { assignedGroomerId = g.id; assignedGroomerName = g.name || assignedGroomerName; }
      } catch (e) { console.warn('assignFairGroomer failed', e); }
    }

    // Create booking object (shared)
    const booking = {
      id: generateId(),
      shortId: generateBookingCode ? generateBookingCode() : undefined,
      userId: user.id,
      petName: profile.petName,
      petType: bookingData.petType,
      packageName: selectedPackage ? selectedPackage.name : '',
      packageId: bookingData.packageId,
      date: bookingData.date,
      time: bookingData.time,
      phone: profile.contactNumber,
      customerName: profile.ownerName,
      groomerId: assignedGroomerId,
      groomerName: assignedGroomerName,
      addOns: bookingData.addOns.slice(),
      bookingNotes: bookingData.bookingNotes,
      singleServices: bookingData.singleServices.slice(),
      petWeight: bookingData.petWeight || '',
      profile,
      beforeImage: '',
      afterImage: '',
      cancellationNote: '',
      status: 'pending',
      createdAt: Date.now(),
      cost: costDetails,
      totalPrice: costDetails?.subtotal || 0,
      bookingFeePaid: costDetails?.totalDueToday || 0,
      balanceOnVisit: costDetails?.balanceOnVisit || 0
    };

    // NEW: if editing, update existing booking instead of creating new
    const editingId = bookingData.editingBookingId || sessionStorage.getItem('editingBookingId');
    if (editingId) {
      booking.id = editingId;
      // prefer app-provided updateBooking
      if (typeof updateBooking === 'function') {
        await updateBooking(booking);
      } else {
        // fallback local update
        const bookings = await getBookings();
        const idx = bookings.findIndex(b => b.id === editingId);
        if (idx >= 0) {
          bookings[idx] = booking;
        } else {
          bookings.push(booking);
        }
        await saveBookings(bookings);
      }

      logBookingHistory({
        bookingId: booking.id,
        action: 'updated',
        message: `${user.name} updated booking ${booking.shortId || booking.id}`,
        actor: 'customer'
      });

      // Clear editing marker
      delete bookingData.editingBookingId;
      sessionStorage.removeItem('editingBookingId');

      sessionStorage.setItem('lastBooking', JSON.stringify(booking));
      redirect('booking-success.html');
      return;
    }

    // Existing create flow for new booking
    if (typeof createBooking === 'function') {
      await createBooking(booking);
    } else {
      const bookings = await getBookings();
      bookings.push(booking);
      await saveBookings(bookings);
    }

    // Log booking history
    logBookingHistory({
      bookingId: booking.id,
      action: 'created',
      message: `${user.name} booked ${selectedPackage ? selectedPackage.name : 'a service'} with ${booking.groomerName || 'GROOMER'} on ${formatDate(booking.date)} at ${formatTime(booking.time)}`,
      actor: 'customer'
    });

    // Store booking in session for success page
    sessionStorage.setItem('lastBooking', JSON.stringify(booking));

    // Redirect to success page
    redirect('booking-success.html');
  } catch (err) {
    console.error('submitBooking failed', err);
    alert('An error occurred while submitting the booking. See console for details.');
  }
}
window.submitBooking = submitBooking;
window.selectTime = selectTime;
window.setupCalendarTimePicker = setupCalendarTimePicker;
window.renderCalendarTimePicker = renderCalendarTimePicker;



// Ensure packages are available before doing summary/validation
async function ensurePackagesLoaded() {
  try {
    let pk = [];
    if (typeof getPackages === 'function') {
      pk = await getPackages();
    } else if (typeof loadPackages === 'function') {
      // some apps use loadPackages() that returns or sets a global
      const res = await loadPackages();
      pk = Array.isArray(res) ? res : (window.packagesList || []);
    } else {
      pk = window.packagesList || [];
    }
    window.packagesList = Array.isArray(pk) ? pk : [];
    return window.packagesList;
  } catch (e) {
    console.warn('ensurePackagesLoaded failed', e);
    window.packagesList = window.packagesList || [];
    return window.packagesList;
  }
}

// Fair groomer assignment: choose groomer with fewest bookings for the requested slot
async function assignFairGroomer(date, time) {
  try {
    const groomers = (typeof getGroomers === 'function') ? await getGroomers() : (window.groomersList || []);
    if (!Array.isArray(groomers) || groomers.length === 0) return null;

    // Use daily totals for fairness: prefer groomers with fewest bookings on the date
    const all = (typeof getBookings === 'function') ? await getBookings() : (JSON.parse(localStorage.getItem('bookings') || '[]'));

    // Compute total bookings per groomer for the date (exclude cancelled)
    const groomerCounts = groomers.map(g => {
      const count = all.filter(b =>
        b.groomerId === g.id &&
        b.date === date &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes((b.status || '').toString())
      ).length;
      return { groomer: g, count };
    });

    // Filter to groomers who have capacity and the slot is free, then sort by least-count
    const candidates = [];
    for (const item of groomerCounts) {
      const g = item.groomer;
      const hasCapacity = (typeof groomerHasCapacity === 'function') ? await groomerHasCapacity(g.id, date) : true;
      const slotFree = (typeof groomerSlotAvailable === 'function') ? await groomerSlotAvailable(g.id, date, time) : true;
      if (hasCapacity && slotFree) candidates.push(item);
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.count - b.count);
    return candidates[0]?.groomer || null;
  } catch (e) {
    console.warn('assignFairGroomer error', e);
    return null;
  }
}

// Adjust slot availability for a date/time by delta (delta can be negative)
async function adjustSlotCount(date, time, delta) {
  if (!date || !time) return;
  try {
    if (typeof updateSlotAvailability === 'function') {
      // app-specific API to alter slot availability
      await updateSlotAvailability(date, time, delta);
      return;
    }

    // LocalStorage fallback: store map keyed by "date@@time"
    const key = 'slotAvailability';
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    const id = `${date}@@${time}`;
    const defaultSlots = 4; // change to your default slot-per-slot
    map[id] = (typeof map[id] === 'number' ? map[id] : defaultSlots) + delta;
    if (map[id] < 0) map[id] = 0;
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.warn('adjustSlotCount failed', e);
  }
}
// Initialize booking when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBooking);
} else {
  initBooking();
}

// Grooming cut selection function
function selectGroomingCut(cutName, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  const notesField = document.getElementById('bookingNotes');
  if (notesField) {
    const currentNotes = notesField.value.trim();
    const cutPrefix = '';
    // Remove existing cut preference if any
    const lines = currentNotes.split('\\n').filter(line => !line.startsWith(cutPrefix));
    // Add new cut preference
    lines.unshift(cutPrefix + cutName);
    notesField.value = lines.join('\\n').trim();
    bookingData.bookingNotes = notesField.value;
  }
  // Visual feedback
  document.querySelectorAll('.cut-selector-btn').forEach(btn => {
    btn.style.background = '#e8e8e8';
    btn.style.borderColor = '#ccc';
  });
  if (ev && ev.target) {
    ev.target.style.background = '#4CAF50';
    ev.target.style.borderColor = '#4CAF50';
    ev.target.style.color = '#fff';
  }
}
window.selectGroomingCut = selectGroomingCut;

// Restore form data from bookingData object
function restoreBookingFormData(data) {
  if (!data) return;

  const fields = [
    'ownerName', 'contactNumber', 'ownerAddress',
    'petName', 'petBreed', 'petAge', 'medicalNotes',
    'vaccinationNotes', 'bookingNotes'
  ];

  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el && data[field]) {
      el.value = data[field];
    }
  });

  if (data.petWeight) {
    const radio = document.querySelector(`input[name="petWeight"][value="${data.petWeight}"]`);
    if (radio) radio.checked = true;
  }

  if (data.addOns && Array.isArray(data.addOns)) {
    if (data.addOns.includes('toothbrush')) {
      const el = document.getElementById('addonToothbrush');
      if (el) el.checked = true;
    }
    if (data.addOns.includes('dematting')) {
      const el = document.getElementById('addonDematting');
      if (el) el.checked = true;
    }
  }
}

// ============================================
// Touch / Mouse Swipe Navigation (DISABLED)
// ============================================

/*
(function initSwipeNavigation() {
  let startX = 0;
  let startY = 0;
  const swipeThreshold = 100; // Increased threshold to prevent accidental swipes

  function handleStart(e) {
    // Don't start swipe if touching the calendar container (to allow calendar scrolling)
    if (e.target.closest('#calendarTimePicker') || e.target.closest('.mega-calendar')) {
      return;
    }

    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
  }

  function handleEnd(e) {
    // If startX was never set (e.g. ignored target), do nothing
    if (startX === 0 && startY === 0) return;

    const point = e.changedTouches ? e.changedTouches[0] : e;
    const diffX = point.clientX - startX;
    const diffY = point.clientY - startY;

    // Reset start coords
    startX = 0;
    startY = 0;

    // Horizontal swipe detection (ignore if vertical scroll is dominant)
    // Also require a significant horizontal movement (threshold)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
      if (diffX > 0) {
        // Swipe Right -> Previous Step
        const prevBtn = document.getElementById('prevBtn');
        // Check if button exists and is not logically hidden (by our showStep logic)
        // We check data-hidden because we forced display:none !important in CSS
        if (prevBtn && !prevBtn.hasAttribute('data-hidden') && !prevBtn.disabled) {
          prevBtn.click();
        }
      } else {
        // Swipe Left -> Next Step
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn && !nextBtn.hasAttribute('data-hidden') && !nextBtn.disabled) {
          nextBtn.click();
        }
      }
    }
  }

  // Attach listeners to the touch container
  setTimeout(() => {
    const container = document.querySelector('.touch-container');
    if (container) {
      // Touch events
      container.addEventListener('touchstart', handleStart, { passive: true });
      container.addEventListener('touchend', handleEnd);

      // Mouse events for desktop drag support
      container.addEventListener('mousedown', handleStart);
      container.addEventListener('mouseup', handleEnd);
    } else {
      console.warn('Touch container not found for swipe navigation');
    }
  }, 500);
})();
*/

