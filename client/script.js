class AppointmentBooking {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.init();
    }

    init() {
        this.setMinDate();
        this.setupEventListeners();
        this.loadInitialData();
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('datePicker').min = today;
    }

    setupEventListeners() {
        // שינוי תאריך
        document.getElementById('datePicker').addEventListener('change', (e) => {
            this.loadAvailableSlots(e.target.value);
        });

        // שליחת טופס
        document.getElementById('submitBtn').addEventListener('click', () => {
            this.submitAppointment();
        });
    }

    async loadInitialData() {
        // ניתן לטעון כאן נתונים נוספים אם needed
    }

    async loadAvailableSlots(date) {
        if (!date) return;

        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '<div class="loading">טוען שעות פנויות...</div>';

        try {
            const response = await fetch(`${this.baseURL}/api/availability?date=${date}`);
            const data = await response.json();

            this.displayTimeSlots(data.availableSlots);
        } catch (error) {
            console.error('Error loading slots:', error);
            timeSlotsContainer.innerHTML = '<div class="error-message">שגיאה בטעינת השעות הפנויות</div>';
        }
    }

    displayTimeSlots(slots) {
        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '';

        if (slots.length === 0) {
            timeSlotsContainer.innerHTML = '<div class="error-message">אין שעות פנויות בתאריך זה</div>';
            return;
        }

        slots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.className = 'time-slot';
            slotElement.textContent = slot;
            slotElement.addEventListener('click', () => this.selectTimeSlot(slot, slotElement));
            timeSlotsContainer.appendChild(slotElement);
        });
    }

    selectTimeSlot(selectedTime, clickedElement) {
        // הסרת בחירה קודמת
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });

        // בחירת המשבצת הנוכחית
        clickedElement.classList.add('selected');
        this.selectedTime = selectedTime;
    }

    async submitAppointment() {
        const date = document.getElementById('datePicker').value;
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;

        // ולידציה בסיסית
        if (!date || !this.selectedTime || !name || !email) {
            this.showError('אנא מלא את כל השדות הדרושים');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('אנא הכנס אימייל תקין');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'קובע תור...';

        try {
            const appointmentData = {
                date: date,
                time: this.selectedTime,
                name: name,
                email: email,
                phone: phone,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(`${this.baseURL}/api/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccess('✅ התור נקבע בהצלחה! ניצור איתך קשר בהקדם.');
                this.resetForm();
            } else {
                this.showError(result.error || 'אירעה שגיאה בקביעת התור');
            }
        } catch (error) {
            console.error('Error submitting appointment:', error);
            this.showError('אירעה שגיאה בקביעת התור. אנא נסה שוב.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ קבע שיחה עכשיו';
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showError(message) {
        const errorDiv = document.getElementById('dateError');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 10000);
    }

    resetForm() {
        document.getElementById('datePicker').value = '';
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('timeSlots').innerHTML = '';
        this.selectedTime = null;
    }
}

// אתחול האפליקציה כאשר הדף נטען
document.addEventListener('DOMContentLoaded', () => {
    new AppointmentBooking();
});