const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// חשוב: שימוש ב-path יחסי שמתאים ל-Render
const APPOINTMENTS_FILE = path.join(__dirname, 'appointments.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// הגשה סטטית של קבצים
app.use('/client', express.static(path.join(__dirname, '../client')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use(express.static(path.join(__dirname, '../client'))); // עבור הדף הראשי

// נתוני זמינות ראשוניים
const defaultAvailability = {
    "2024": {
        "1": {
            "15": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
            "16": ["10:00", "11:00", "14:00", "15:00"],
            "17": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
            "18": ["10:00", "11:00", "14:00", "15:00"],
            "19": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
        },
        "2": {
            "1": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
            "2": ["10:00", "11:00", "14:00", "15:00"],
            "3": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
            "4": ["10:00", "11:00", "14:00", "15:00"],
            "5": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
        }
    }
};

// פונקציות עזר לקריאה/כתיבה לקובץ
async function readAppointments() {
    try {
        const data = await fs.readFile(APPOINTMENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // אם הקובץ לא קיים, מחזירים מערך ריק
        console.log('Creating new appointments file...');
        const initialData = { appointments: [], availability: defaultAvailability };
        await writeAppointments(initialData);
        return initialData;
    }
}

async function writeAppointments(data) {
    try {
        await fs.writeFile(APPOINTMENTS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing to file:', error);
        throw error;
    }
}

// Routes

// דף הבית - מפנה לדף הנחיתה
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// דף אדמין
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Health check route for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString() 
    });
});

// קבלת שעות פנויות לתאריך מסוים
app.get('/api/availability', async (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ error: 'תאריך חסר' });
        }

        const [year, month, day] = date.split('-');
        const data = await readAppointments();

        // קבלת שעות פנויות מהזמינות המוגדרת
        const availableSlots = data.availability?.[year]?.[month]?.[day] || [];

        // הסרת שעות שכבר נתפסו
        const bookedAppointments = data.appointments.filter(apt => 
            apt.date === date && apt.status !== 'cancelled'
        );

        const bookedTimes = bookedAppointments.map(apt => apt.time);
        const finalAvailableSlots = availableSlots.filter(slot => !bookedTimes.includes(slot));

        res.json({
            date,
            availableSlots: finalAvailableSlots,
            totalSlots: availableSlots.length,
            bookedSlots: bookedTimes.length
        });

    } catch (error) {
        console.error('Error getting availability:', error);
        res.status(500).json({ error: 'שגיאה בקבלת הנתונים' });
    }
});

// קביעת תור חדש
app.post('/api/appointments', async (req, res) => {
    try {
        const { date, time, name, email, phone } = req.body;

        // ולידציה
        if (!date || !time || !name || !email) {
            return res.status(400).json({ error: 'כל השדות הדרושים חייבים להיות מלאים' });
        }

        const data = await readAppointments();

        // בדיקה אם התור כבר תפוס
        const existingAppointment = data.appointments.find(apt => 
            apt.date === date && apt.time === time && apt.status !== 'cancelled'
        );

        if (existingAppointment) {
            return res.status(400).json({ error: 'מצטערים, התור כבר תפוס' });
        }

        // יצירת תור חדש
        const newAppointment = {
            id: Date.now().toString(),
            date,
            time,
            name,
            email,
            phone: phone || '',
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        data.appointments.push(newAppointment);
        await writeAppointments(data);

        console.log(`📅 תור חדש: ${name} - ${date} ${time}`);

        res.status(201).json({
            success: true,
            appointment: newAppointment,
            message: 'התור נקבע בהצלחה!'
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'שגיאה בקביעת התור' });
    }
});

// קבלת כל התורים (ללוח הבקרה)
app.get('/api/admin/appointments', async (req, res) => {
    try {
        const data = await readAppointments();
        
        // מיון התורים מהחדש לישן
        const sortedAppointments = data.appointments.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json({
            appointments: sortedAppointments,
            total: sortedAppointments.length,
            confirmed: sortedAppointments.filter(apt => apt.status === 'confirmed').length,
            cancelled: sortedAppointments.filter(apt => apt.status === 'cancelled').length
        });

    } catch (error) {
        console.error('Error getting appointments:', error);
        res.status(500).json({ error: 'שגיאה בקבלת הנתונים' });
    }
});

// עדכון סטטוס תור
app.put('/api/admin/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'סטטוס לא תקין' });
        }

        const data = await readAppointments();
        const appointmentIndex = data.appointments.findIndex(apt => apt.id === id);

        if (appointmentIndex === -1) {
            return res.status(404).json({ error: 'תור לא נמצא' });
        }

        data.appointments[appointmentIndex].status = status;
        data.appointments[appointmentIndex].updatedAt = new Date().toISOString();

        await writeAppointments(data);

        res.json({
            success: true,
            appointment: data.appointments[appointmentIndex]
        });

    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'שגיאה בעדכון התור' });
    }
});

// הגדרת זמינות חדשה
app.post('/api/admin/availability', async (req, res) => {
    try {
        const { year, month, day, slots } = req.body;

        const data = await readAppointments();

        if (!data.availability[year]) data.availability[year] = {};
        if (!data.availability[year][month]) data.availability[year][month] = {};
        
        data.availability[year][month][day] = slots;

        await writeAppointments(data);

        res.json({
            success: true,
            message: 'זמינות עודכנה בהצלחה'
        });

    } catch (error) {
        console.error('Error setting availability:', error);
        res.status(500).json({ error: 'שגיאה בעדכון הזמינות' });
    }
});

// קבלת זמינות קיימת
app.get('/api/admin/availability/:year/:month/:day', async (req, res) => {
    try {
        const { year, month, day } = req.params;
        const data = await readAppointments();

        const slots = data.availability?.[year]?.[month]?.[day] || [];

        res.json({ slots });
    } catch (error) {
        console.error('Error getting availability:', error);
        res.status(500).json({ error: 'שגיאה בקבלת הזמינות' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🏠 Home page: http://localhost:${PORT}`);
    console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});
