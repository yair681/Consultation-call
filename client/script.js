class AppointmentBooking {
    constructor() {
        // שימוש ב-URL יחסי במקום localhost
        this.baseURL = window.location.origin;
        this.init();
    }

    // ... rest of the code remains the same until the fetch calls

    async loadAvailableSlots(date) {
        if (!date) return;

        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '<div class="loading">טוען שעות פנויות...</div>';

        try {
            const response = await fetch(`${this.baseURL}/api/availability?date=${date}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            this.displayTimeSlots(data.availableSlots);
        } catch (error) {
            console.error('Error loading slots:', error);
            timeSlotsContainer.innerHTML = '<div class="error-message">שגיאה בטעינת השעות הפנויות</div>';
        }
    }

    async submitAppointment() {
        // ... existing validation code ...

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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network error');
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccess('✅ התור נקבע בהצלחה! ניצור איתך קשר בהקדם.');
                this.resetForm();
            } else {
                this.showError(result.error || 'אירעה שגיאה בקביעת התור');
            }
        } catch (error) {
            console.error('Error submitting appointment:', error);
            this.showError(error.message || 'אירעה שגיאה בקביעת התור. אנא נסה שוב.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ קבע שיחה עכשיו';
        }
    }

    // ... rest of the code remains the same
}

document.addEventListener('DOMContentLoaded', () => {
    new AppointmentBooking();
});
